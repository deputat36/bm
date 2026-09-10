import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const FORM_SCENARIOS_PATH = path.join(ROOT, "data/qa/form-scenarios.json");
const VISUAL_CONTRACT_PATH = path.join(ROOT, "data/qa/page-visual-qa.json");
const OUTPUT_DIR = path.resolve(process.env.KEYBOARD_QA_OUTPUT_DIR || path.join(ROOT, "artifacts/lead-page-keyboard-qa"));
const BASE_URL = new URL(process.env.KEYBOARD_QA_BASE_URL || "http://127.0.0.1:4176");
const MAX_TABS = 40;
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
    if (!filePath) return response.writeHead(400).end("Bad request");
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

function canonicalLeadPaths(formMatrix, visualContract) {
  const scenarioPaths = [...new Set((formMatrix.scenarios || []).map((scenario) => String(scenario.page_path || "").trim()).filter(Boolean))].sort();
  const visualPaths = [...new Set((visualContract.pages || []).map((page) => String(page.path || "").trim()).filter(Boolean))].sort();
  if (scenarioPaths.length !== 7) throw new Error(`Expected 7 canonical lead pages, got ${scenarioPaths.length}`);
  if (JSON.stringify(scenarioPaths) !== JSON.stringify(visualPaths)) {
    throw new Error("Keyboard QA coverage must exactly match form-scenarios and page-visual-qa paths.");
  }
  return scenarioPaths;
}

async function readFocusState(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body || element === document.documentElement) {
      return { focusable: false, reason: "no_interactive_focus" };
    }
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const outlineVisible = style.outlineStyle !== "none" && parseFloat(style.outlineWidth || "0") > 0;
    const shadowVisible = style.boxShadow && style.boxShadow !== "none";
    const isHidden = style.display === "none" || style.visibility === "hidden" || element.closest("[hidden],[aria-hidden='true'],[inert]") !== null;
    const isDisabled = Boolean(element.disabled || element.getAttribute("aria-disabled") === "true");
    const horizontallyVisible = rect.left >= -1 && rect.right <= window.innerWidth + 1;
    const verticallyVisible = rect.top >= -1 && rect.bottom <= window.innerHeight + 1;
    const inPrimaryLead = Boolean(element.closest("[data-primary-lead]"));
    return {
      focusable: true,
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute("type") || null,
      id: element.id || null,
      name: element.getAttribute("name") || null,
      text: String(element.textContent || element.getAttribute("aria-label") || element.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 120),
      is_hidden: isHidden,
      is_disabled: isDisabled,
      horizontally_visible: horizontallyVisible,
      vertically_visible: verticallyVisible,
      focus_indicator_visible: Boolean(outlineVisible || shadowVisible),
      in_primary_lead: inPrimaryLead,
      rect: { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom) }
    };
  });
}

async function main() {
  const formMatrix = JSON.parse(await fsp.readFile(FORM_SCENARIOS_PATH, "utf8"));
  const visualContract = JSON.parse(await fsp.readFile(VISUAL_CONTRACT_PATH, "utf8"));
  const leadPaths = canonicalLeadPaths(formMatrix, visualContract);
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
        await page.waitForTimeout(900);
        if (pageErrors.length) throw new Error(`${pagePath}/${profile.id}: browser page errors: ${pageErrors.join(" | ")}`);

        const primaryReady = await page.evaluate(() => {
          const primary = document.querySelector("[data-primary-lead]");
          const form = primary?.querySelector("form[data-lead-form]");
          const fieldset = form?.querySelector("[data-lead-fieldset]");
          return Boolean(primary && form && fieldset && fieldset.disabled === false && form.dataset.jsReady === "true");
        });
        if (!primaryReady) throw new Error(`${pagePath}/${profile.id}: primary lead form is not keyboard-ready after JS initialization`);

        await page.evaluate(() => {
          const active = document.activeElement;
          if (active && typeof active.blur === "function") active.blur();
          window.scrollTo(0, 0);
        });

        const sequence = [];
        let reachedPrimaryLead = false;
        for (let step = 1; step <= MAX_TABS; step += 1) {
          await page.keyboard.press("Tab");
          await page.waitForTimeout(35);
          const state = await readFocusState(page);
          sequence.push({ step, ...state });
          if (!state.focusable) throw new Error(`${pagePath}/${profile.id}: Tab ${step} did not land on an interactive element`);
          if (state.is_hidden || state.is_disabled) throw new Error(`${pagePath}/${profile.id}: Tab ${step} focused hidden/disabled element`);
          if (!state.horizontally_visible || !state.vertically_visible) throw new Error(`${pagePath}/${profile.id}: Tab ${step} focused off-screen element ${state.tag} ${state.text}`);
          if (!state.focus_indicator_visible) throw new Error(`${pagePath}/${profile.id}: Tab ${step} has no detectable focus indicator on ${state.tag} ${state.text}`);
          if (state.in_primary_lead) {
            reachedPrimaryLead = true;
            break;
          }
        }
        if (!reachedPrimaryLead) throw new Error(`${pagePath}/${profile.id}: primary lead form was not reachable within ${MAX_TABS} Tab presses`);

        audits.push({
          page_path: pagePath,
          profile_id: profile.id,
          viewport: { width: profile.width, height: profile.height },
          reached_primary_lead: reachedPrimaryLead,
          tab_steps_to_primary_lead: sequence.length,
          sequence
        });
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const summary = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    target: { mode: "local_static", origin: BASE_URL.origin, physical_device: false },
    lead_page_paths: leadPaths,
    profiles: PROFILES,
    max_tabs: MAX_TABS,
    expected_audit_count: leadPaths.length * PROFILES.length,
    audit_count: audits.length,
    all_primary_lead_forms_keyboard_reachable: audits.every((audit) => audit.reached_primary_lead),
    max_tab_steps_to_primary_lead: Math.max(...audits.map((audit) => audit.tab_steps_to_primary_lead)),
    audits
  };
  await fsp.writeFile(path.join(OUTPUT_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`Keyboard QA passed: ${summary.audit_count}/${summary.expected_audit_count} audits; max ${summary.max_tab_steps_to_primary_lead} Tab steps to primary lead.`);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
