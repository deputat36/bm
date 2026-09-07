import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(ROOT, "data/qa/page-visual-qa.json");
const OUTPUT_DIR = path.resolve(process.env.VISUAL_QA_OUTPUT_DIR || path.join(ROOT, "artifacts/page-visual-qa"));
const BASE_URL = new URL(process.env.VISUAL_QA_BASE_URL || "http://127.0.0.1:4174");
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

function validateContract(contract) {
  const errors = [];
  if (contract.schema_version !== "1.0") errors.push("schema_version must be 1.0");
  if (contract.portal_id !== "newbuilds-borisoglebsk") errors.push("invalid portal_id");
  for (const key of [
    "screenshots_are_ci_artifacts_only",
    "browser_emulation_is_not_physical_device_qa",
    "visual_qa_has_no_publication_effect",
    "visual_qa_must_not_submit_forms",
    "visual_qa_must_not_call_live_lead_endpoint",
    "horizontal_overflow_is_failure",
    "page_error_is_failure"
  ]) if (contract.rules?.[key] !== true) errors.push(`rules.${key} must be true`);

  const viewports = Array.isArray(contract.viewports) ? contract.viewports : [];
  const pages = Array.isArray(contract.pages) ? contract.pages : [];
  if (viewports.length !== 2) errors.push("exactly two viewports are required");
  if (pages.length !== 5) errors.push("exactly five pages are required");
  const expected = viewports.length * pages.length;
  if (Number(contract.expected_capture_count) !== expected) errors.push(`expected_capture_count must equal ${expected}`);
  for (const viewport of viewports) {
    if (!String(viewport.id || "").trim()) errors.push("viewport id is required");
    if (viewport.browser_engine !== "chromium") errors.push(`${viewport.id}: only chromium is supported by this runner`);
    if (Number(viewport.width) < 320 || Number(viewport.height) < 600) errors.push(`${viewport.id}: invalid dimensions`);
  }
  for (const page of pages) {
    if (!String(page.id || "").trim() || !String(page.path || "").startsWith("/")) errors.push("page id/path is invalid");
    if (!Array.isArray(page.required_markers) || page.required_markers.length < 1) errors.push(`${page.id}: required_markers are required`);
  }
  if (errors.length) throw new Error(`Visual QA contract errors:\n- ${errors.join("\n- ")}`);
}

async function main() {
  const contract = JSON.parse(await fsp.readFile(CONTRACT_PATH, "utf8"));
  validateContract(contract);
  await fsp.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fsp.mkdir(path.join(OUTPUT_DIR, "screenshots"), { recursive: true });

  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  let blockedLiveLeadRequests = 0;
  try {
    for (const viewport of contract.viewports) {
      const context = await browser.newContext({
        viewport: { width: Number(viewport.width), height: Number(viewport.height) },
        deviceScaleFactor: Number(viewport.device_scale_factor || 1),
        locale: "ru-RU",
        timezoneId: "Europe/Moscow",
        reducedMotion: "reduce"
      });
      for (const target of contract.pages) {
        const page = await context.newPage();
        const pageErrors = [];
        const consoleErrors = [];
        page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text().slice(0, 500));
        });
        await page.route("**/*", async (route) => {
          const requestUrl = route.request().url();
          if (/\/functions\/v1\/newbuild-lead(?:\?|$)/.test(requestUrl)) {
            blockedLiveLeadRequests += 1;
            await route.abort("blockedbyclient");
            return;
          }
          await route.continue();
        });

        const url = new URL(target.path, BASE_URL).toString();
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
        if (!response || response.status() >= 400) throw new Error(`${target.id}/${viewport.id}: HTTP ${response?.status() || "no-response"}`);
        await page.waitForTimeout(700);
        const bodyText = await page.locator("body").innerText();
        for (const marker of target.required_markers) {
          if (!bodyText.includes(marker)) throw new Error(`${target.id}/${viewport.id}: required marker not found: ${marker}`);
        }
        await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;}" });
        const geometry = await page.evaluate(() => ({
          innerWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body?.scrollWidth || 0,
          documentHeight: document.documentElement.scrollHeight
        }));
        const overflowPx = Math.max(geometry.documentWidth, geometry.bodyWidth) - geometry.innerWidth;
        const filename = `${target.id}--${viewport.id}.png`;
        await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshots", filename), fullPage: true, animations: "disabled" });
        const result = {
          page_id: target.id,
          path: target.path,
          viewport_id: viewport.id,
          width: viewport.width,
          height: viewport.height,
          screenshot: `screenshots/${filename}`,
          horizontal_overflow_px: overflowPx,
          document_height: geometry.documentHeight,
          page_errors: pageErrors,
          console_errors: consoleErrors
        };
        results.push(result);
        await page.close();
        if (overflowPx > 1) throw new Error(`${target.id}/${viewport.id}: horizontal overflow ${overflowPx}px`);
        if (pageErrors.length) throw new Error(`${target.id}/${viewport.id}: page errors: ${pageErrors.join(" | ")}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  if (blockedLiveLeadRequests !== 0) throw new Error(`Visual QA attempted ${blockedLiveLeadRequests} live lead request(s)`);
  if (results.length !== Number(contract.expected_capture_count)) throw new Error(`Expected ${contract.expected_capture_count} captures, got ${results.length}`);

  const summary = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    target: { mode: "local_static", origin: BASE_URL.origin, physical_device: false },
    capture_count: results.length,
    blocked_live_lead_requests: blockedLiveLeadRequests,
    page_error_count: results.reduce((sum, item) => sum + item.page_errors.length, 0),
    console_error_count: results.reduce((sum, item) => sum + item.console_errors.length, 0),
    max_horizontal_overflow_px: Math.max(...results.map((item) => item.horizontal_overflow_px)),
    results
  };
  await fsp.writeFile(path.join(OUTPUT_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`Visual QA passed: ${summary.capture_count} screenshots, max overflow ${summary.max_horizontal_overflow_px}px, page errors ${summary.page_error_count}.`);
  if (summary.console_error_count) console.log(`Console errors recorded for review: ${summary.console_error_count}.`);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
