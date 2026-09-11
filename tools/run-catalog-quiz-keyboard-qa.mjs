import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUTPUT_DIR = path.resolve(process.env.CATALOG_QUIZ_KEYBOARD_QA_OUTPUT_DIR || path.join(ROOT, "artifacts/catalog-quiz-keyboard-qa"));
const BASE_URL = new URL(process.env.CATALOG_QUIZ_KEYBOARD_QA_BASE_URL || "http://127.0.0.1:4177");
const CATALOG_PATH = "/catalog/";
const PROFILES = [
  { id: "desktop", width: 1440, height: 1100 },
  { id: "mobile", width: 390, height: 844 }
];
const STEP_IDS = ["priority", "rooms", "budget", "purchase_method", "timeline"];
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

async function focusState(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body || element === document.documentElement) {
      return { focused: false, reason: "no_interactive_focus" };
    }
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      focused: true,
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute("type") || null,
      name: element.getAttribute("name") || null,
      quiz_step: element.closest("[data-quiz-step]")?.getAttribute("data-quiz-step") || null,
      quiz_next: element.hasAttribute("data-quiz-next"),
      quiz_back: element.hasAttribute("data-quiz-back"),
      quiz_show_result: element.hasAttribute("data-quiz-show-result"),
      quiz_result_title: element.hasAttribute("data-quiz-result-title"),
      quiz_to_form: element.hasAttribute("data-quiz-to-form"),
      quick_form_name: Boolean(element.matches('form[data-form-id="catalog_quick_selection"] input[name="name"]')),
      checked: "checked" in element ? Boolean(element.checked) : null,
      hidden: style.display === "none" || style.visibility === "hidden" || element.closest("[hidden],[aria-hidden='true'],[inert]") !== null,
      disabled: Boolean(element.disabled || element.getAttribute("aria-disabled") === "true"),
      in_viewport: rect.left >= -1 && rect.right <= window.innerWidth + 1 && rect.top >= -1 && rect.bottom <= window.innerHeight + 1,
      rect: { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom) }
    };
  });
}

function assertUsableFocus(state, label) {
  if (!state.focused) throw new Error(`${label}: no interactive focus`);
  if (state.hidden) throw new Error(`${label}: focus landed inside hidden content`);
  if (state.disabled) throw new Error(`${label}: focus landed on disabled control`);
  if (!state.in_viewport) throw new Error(`${label}: focused control is outside viewport`);
}

async function expectStepFocus(page, profileId, stepId, phases) {
  await page.waitForTimeout(40);
  const state = await focusState(page);
  assertUsableFocus(state, `${profileId}/${stepId}`);
  if (state.tag !== "input" || state.type !== "radio" || state.quiz_step !== stepId) {
    throw new Error(`${profileId}/${stepId}: expected focused radio in step ${stepId}, got ${JSON.stringify(state)}`);
  }
  phases.push({ phase: `focus_${stepId}`, state });
  return state;
}

async function expectActionFocus(page, profileId, marker, phases) {
  const state = await focusState(page);
  assertUsableFocus(state, `${profileId}/${marker}`);
  if (!state[marker]) throw new Error(`${profileId}: expected focused ${marker}, got ${JSON.stringify(state)}`);
  phases.push({ phase: marker, state });
  return state;
}

async function ensureSelected(page) {
  const state = await focusState(page);
  if (state.checked !== true) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(20);
  }
}

async function advance(page, profileId, stepIndex, phases) {
  await ensureSelected(page);
  await page.keyboard.press("Tab");
  if (stepIndex > 0) {
    await expectActionFocus(page, profileId, "quiz_back", phases);
    await page.keyboard.press("Tab");
  }
  if (stepIndex < STEP_IDS.length - 1) {
    await expectActionFocus(page, profileId, "quiz_next", phases);
    await page.keyboard.press("Enter");
    await expectStepFocus(page, profileId, STEP_IDS[stepIndex + 1], phases);
  } else {
    await expectActionFocus(page, profileId, "quiz_show_result", phases);
    await page.keyboard.press("Enter");
  }
}

async function auditProfile(context, profile) {
  const page = await context.newPage();
  const pageErrors = [];
  const blockedLeadRequests = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
  await page.route("**/functions/v1/newbuild-lead**", async (route) => {
    blockedLeadRequests.push(route.request().url());
    await route.abort("blockedbyclient");
  });

  const response = await page.goto(new URL(CATALOG_PATH, BASE_URL).toString(), { waitUntil: "domcontentloaded", timeout: 20_000 });
  if (!response || response.status() >= 400) throw new Error(`${profile.id}: catalog HTTP ${response?.status() || "no-response"}`);
  await page.waitForTimeout(900);
  if (pageErrors.length) throw new Error(`${profile.id}: browser page errors: ${pageErrors.join(" | ")}`);

  const ready = await page.evaluate(() => {
    const root = document.querySelector("[data-catalog-rule-quiz]");
    const start = root?.querySelector("[data-quiz-start]");
    const form = document.querySelector('form[data-form-id="catalog_quick_selection"]');
    const fieldset = form?.querySelector("[data-lead-fieldset]");
    return Boolean(root && start && form && fieldset && fieldset.disabled === false && form.dataset.jsReady === "true");
  });
  if (!ready) throw new Error(`${profile.id}: quiz or quick form is not JS-ready`);

  const phases = [];
  const start = page.locator("[data-catalog-rule-quiz] [data-quiz-start]");
  await start.scrollIntoViewIfNeeded();
  await start.focus();
  await page.keyboard.press("Enter");
  await expectStepFocus(page, profile.id, STEP_IDS[0], phases);

  await advance(page, profile.id, 0, phases);

  await ensureSelected(page);
  await page.keyboard.press("Tab");
  await expectActionFocus(page, profile.id, "quiz_back", phases);
  await page.keyboard.press("Enter");
  await expectStepFocus(page, profile.id, STEP_IDS[0], phases);

  await page.keyboard.press("Tab");
  await expectActionFocus(page, profile.id, "quiz_next", phases);
  await page.keyboard.press("Enter");
  await expectStepFocus(page, profile.id, STEP_IDS[1], phases);

  for (let index = 1; index < STEP_IDS.length; index += 1) {
    await advance(page, profile.id, index, phases);
  }

  await page.waitForTimeout(40);
  let state = await focusState(page);
  assertUsableFocus(state, `${profile.id}/result_title`);
  if (!state.quiz_result_title) throw new Error(`${profile.id}: result title did not receive focus`);
  phases.push({ phase: "result_title", state });

  await page.keyboard.press("Tab");
  state = await expectActionFocus(page, profile.id, "quiz_to_form", phases);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(350);
  state = await focusState(page);
  assertUsableFocus(state, `${profile.id}/quick_form_name`);
  if (!state.quick_form_name) throw new Error(`${profile.id}: handoff did not focus the quick-form name field`);
  phases.push({ phase: "quick_form_name", state });

  if (blockedLeadRequests.length) {
    throw new Error(`${profile.id}: quiz keyboard flow attempted live lead delivery`);
  }

  await page.close();
  return {
    profile_id: profile.id,
    viewport: { width: profile.width, height: profile.height },
    passed: true,
    blocked_live_lead_requests: blockedLeadRequests.length,
    phases
  };
}

async function main() {
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
      audits.push(await auditProfile(context, profile));
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const summary = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    target: { mode: "local_static", path: CATALOG_PATH, physical_device: false },
    profiles: PROFILES,
    expected_audit_count: PROFILES.length,
    audit_count: audits.length,
    all_keyboard_handoffs_passed: audits.length === PROFILES.length && audits.every((audit) => audit.passed),
    live_lead_requests: audits.reduce((sum, audit) => sum + audit.blocked_live_lead_requests, 0),
    audits
  };
  await fsp.writeFile(path.join(OUTPUT_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`Catalog quiz keyboard QA passed: ${summary.audit_count}/${summary.expected_audit_count} profiles, live lead requests ${summary.live_lead_requests}.`);
}

main().catch(async (error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
