import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const ROOT = process.cwd();
const FORM_SCENARIOS_PATH = path.join(ROOT, "data/qa/form-scenarios.json");
const VISUAL_CONTRACT_PATH = path.join(ROOT, "data/qa/page-visual-qa.json");
const OUTPUT_DIR = path.resolve(process.env.ACCESSIBILITY_QA_OUTPUT_DIR || path.join(ROOT, "artifacts/lead-page-accessibility-qa"));
const BASE_URL = new URL(process.env.ACCESSIBILITY_QA_BASE_URL || "http://127.0.0.1:4175");
const FAIL_IMPACTS = new Set(["critical", "serious"]);
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const PROFILES = [
  { id: "desktop", width: 1440, height: 1100 },
  { id: "mobile", width: 390, height: 844 }
];
const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".svg", "image/svg+xml"],
  [".png", "image/png"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
  [".webp", "image/webp"], [".ico", "image/x-icon"], [".txt", "text/plain; charset=utf-8"]
]);

function safeStaticPath(requestPath) {
  let decoded;
  try { decoded = decodeURIComponent(requestPath); } catch { return null; }
  let relative = decoded.replace(/^\/+/, "");
  if (!relative || decoded.endsWith("/")) relative = path.join(relative, "index.html");
  const normalized = path.normalize(relative);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) return null;
  const absolute = path.join(ROOT, normalized);
  return absolute.startsWith(ROOT) ? absolute : null;
}

async function startStaticServer() {
  const server = http.createServer(async (request, response) => {
    if (!request.url || !["GET", "HEAD"].includes(request.method || "GET")) {
      response.writeHead(405).end("Method not allowed");
      return;
    }
    const url = new URL(request.url, BASE_URL);
    let filePath = safeStaticPath(url.pathname);
    if (!filePath) {
      response.writeHead(400).end("Bad request");
      return;
    }
    try {
      let stat = await fsp.stat(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, "index.html");
        stat = await fsp.stat(filePath);
      }
      if (!stat.isFile()) throw new Error("Not a file");
      response.writeHead(200, {
        "Content-Type": MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
        "Content-Length": stat.size,
        "Cache-Control": "no-store"
      });
      if (request.method === "HEAD") return response.end();
      fs.createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(BASE_URL.port), BASE_URL.hostname, resolve);
  });
  return server;
}

function uniqueLeadPaths(formMatrix) {
  return [...new Set((formMatrix?.scenarios || [])
    .map((scenario) => String(scenario.page_path || "").trim())
    .filter(Boolean))].sort();
}

function validateCoverage(formMatrix, visualContract) {
  const leadPaths = uniqueLeadPaths(formMatrix);
  const visualPaths = [...new Set((visualContract?.pages || []).map((page) => String(page.path || "").trim()).filter(Boolean))].sort();
  const errors = [];
  if (leadPaths.length !== 7) errors.push(`expected 7 canonical lead pages, got ${leadPaths.length}`);
  for (const pagePath of leadPaths) if (!visualPaths.includes(pagePath)) errors.push(`visual contract missing canonical lead page: ${pagePath}`);
  for (const pagePath of visualPaths) if (!leadPaths.includes(pagePath)) errors.push(`visual contract contains non-canonical lead page: ${pagePath}`);
  if (errors.length) throw new Error(`Accessibility QA coverage errors:\n- ${errors.join("\n- ")}`);
  return leadPaths;
}

function compactViolation(violation) {
  return {
    id: violation.id,
    impact: violation.impact || "unknown",
    help: violation.help,
    help_url: violation.helpUrl,
    tags: violation.tags,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      html: String(node.html || "").slice(0, 500),
      failure_summary: String(node.failureSummary || "").slice(0, 1000)
    }))
  };
}

async function main() {
  const formMatrix = JSON.parse(await fsp.readFile(FORM_SCENARIOS_PATH, "utf8"));
  const visualContract = JSON.parse(await fsp.readFile(VISUAL_CONTRACT_PATH, "utf8"));
  const leadPaths = validateCoverage(formMatrix, visualContract);
  const pageMarkers = new Map((visualContract.pages || []).map((page) => [page.path, page.required_markers || []]));

  await fsp.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fsp.mkdir(OUTPUT_DIR, { recursive: true });

  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const audits = [];
  try {
    for (const profile of PROFILES) {
      const context = await browser.newContext({
        viewport: { width: profile.width, height: profile.height },
        locale: "ru-RU",
        timezoneId: "Europe/Moscow",
        reducedMotion: "reduce"
      });

      for (const pagePath of leadPaths) {
        const page = await context.newPage();
        const pageErrors = [];
        page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
        await page.route("**/functions/v1/newbuild-lead**", (route) => route.abort("blockedbyclient"));

        const response = await page.goto(new URL(pagePath, BASE_URL).toString(), { waitUntil: "domcontentloaded", timeout: 20_000 });
        if (!response || response.status() >= 400) throw new Error(`${pagePath}/${profile.id}: HTTP ${response?.status() || "no-response"}`);
        await page.waitForTimeout(700);

        const bodyText = await page.locator("body").innerText();
        for (const marker of pageMarkers.get(pagePath) || []) {
          if (!bodyText.includes(marker)) throw new Error(`${pagePath}/${profile.id}: required marker not found: ${marker}`);
        }
        if (pageErrors.length) throw new Error(`${pagePath}/${profile.id}: browser page errors: ${pageErrors.join(" | ")}`);

        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        const violations = results.violations.map(compactViolation);
        const failing = violations.filter((violation) => FAIL_IMPACTS.has(violation.impact));
        audits.push({
          page_path: pagePath,
          profile_id: profile.id,
          viewport: { width: profile.width, height: profile.height },
          violation_count: violations.length,
          failing_violation_count: failing.length,
          violations
        });
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const failingAudits = audits.filter((audit) => audit.failing_violation_count > 0);
  const summary = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    target: { mode: "local_static", origin: BASE_URL.origin, physical_device: false },
    standard_tags: WCAG_TAGS,
    failure_impacts: [...FAIL_IMPACTS],
    lead_page_paths: leadPaths,
    profiles: PROFILES,
    expected_audit_count: leadPaths.length * PROFILES.length,
    audit_count: audits.length,
    total_violation_count: audits.reduce((sum, audit) => sum + audit.violation_count, 0),
    failing_audit_count: failingAudits.length,
    failing_violation_count: audits.reduce((sum, audit) => sum + audit.failing_violation_count, 0),
    audits
  };
  await fsp.writeFile(path.join(OUTPUT_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(`Accessibility QA: ${summary.audit_count}/${summary.expected_audit_count} audits, ${summary.failing_violation_count} serious/critical violations.`);
  if (failingAudits.length) {
    for (const audit of failingAudits) {
      const ids = audit.violations.filter((violation) => FAIL_IMPACTS.has(violation.impact)).map((violation) => `${violation.id}:${violation.impact}`);
      console.error(`${audit.page_path}/${audit.profile_id}: ${ids.join(", ")}`);
    }
    throw new Error(`Accessibility QA failed: ${summary.failing_violation_count} serious/critical violation(s) across ${summary.failing_audit_count} audit(s).`);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
