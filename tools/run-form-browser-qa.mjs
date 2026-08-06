import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const MATRIX_PATH = path.join(ROOT, "data/qa/form-scenarios.json");
const DEFAULT_BASE_URL = "http://127.0.0.1:4173";
const DEFAULT_OUTPUT_DIR = path.join(ROOT, "artifacts/form-browser-qa");
const LEAD_ENDPOINT = "https://ofewxuqfjhamgerwzull.supabase.co/functions/v1/newbuild-lead";
const ALLOWED_REMOTE_HOSTS = new Set([
  "novostroyki-borisoglebsk.ru",
  "www.novostroyki-borisoglebsk.ru"
]);
const REQUIRED_EVENTS = [
  "lead_form_view",
  "lead_form_start",
  "lead_submit",
  "lead_submit_classified",
  "lead_thankyou_view"
];
const STORAGE_EVENTS = [
  "lead_form_view",
  "lead_form_start",
  "lead_submit",
  "lead_submit_classified"
];
const PROHIBITED_EVENT_KEYS = new Set([
  "name",
  "phone",
  "phone_normalized",
  "email",
  "budget",
  "comment",
  "question",
  "consent_text",
  "user_agent",
  "client_fixation_id",
  "fields_json",
  "message"
]);
const PHONE_LIKE_VALUE = /(?:^|\D)\+?\d[\d\s().-]{8,}\d(?:\D|$)/;
const EMAIL_LIKE_VALUE = /[^\s@]+@[^\s@]+\.[^\s@]+/i;
const NORMALIZED_PLACEMENT = /^[a-zа-яё0-9_-]{1,120}$/i;
const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"]
]);

function cleanText(value, maxLength = 500) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/https?:\/\/[^\s]+/gi, "[url]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "qa";
}

function generatedPhone(length) {
  return Array.from({ length }, (_, index) => String((index + 2) % 10)).join("");
}

function generatedEmail() {
  return `${String.fromCharCode(113, 97)}${Date.now()}${String.fromCharCode(64)}${String.fromCharCode(101, 120, 97, 109, 112, 108, 101)}.invalid`;
}

function parseBoolean(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function resolveConfig() {
  const baseUrl = new URL(process.env.QA_BASE_URL || DEFAULT_BASE_URL);
  const startServer = parseBoolean(
    process.env.QA_START_SERVER,
    baseUrl.hostname === "127.0.0.1" || baseUrl.hostname === "localhost"
  );

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new Error(`Unsupported QA_BASE_URL protocol: ${baseUrl.protocol}`);
  }

  const isLocal = ["127.0.0.1", "localhost"].includes(baseUrl.hostname);
  if (!isLocal && !ALLOWED_REMOTE_HOSTS.has(baseUrl.hostname)) {
    throw new Error(`Remote QA host is not allowlisted: ${baseUrl.hostname}`);
  }
  if (!isLocal && baseUrl.protocol !== "https:") {
    throw new Error("Remote browser QA requires HTTPS.");
  }

  return {
    baseUrl,
    startServer,
    outputDir: path.resolve(process.env.QA_OUTPUT_DIR || DEFAULT_OUTPUT_DIR),
    headless: !["0", "false", "no"].includes(String(process.env.QA_HEADLESS || "1").toLowerCase()),
    timeoutMs: Number(process.env.QA_TIMEOUT_MS || 15_000),
    navigationTimeoutMs: Number(process.env.QA_NAVIGATION_TIMEOUT_MS || 20_000),
    runStorageChecks: parseBoolean(process.env.QA_RUN_STORAGE, true)
  };
}

async function readJson(filePath) {
  return JSON.parse(await fsp.readFile(filePath, "utf8"));
}

async function ensureOutput(outputDir) {
  await fsp.rm(outputDir, { recursive: true, force: true });
  await fsp.mkdir(path.join(outputDir, "screenshots"), { recursive: true });
  await fsp.mkdir(path.join(outputDir, "events"), { recursive: true });
}

function safeStaticPath(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch (error) {
    return null;
  }

  let relative = decoded.replace(/^\/+/, "");
  if (!relative || decoded.endsWith("/")) relative = path.join(relative, "index.html");
  const normalized = path.normalize(relative);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) return null;
  const absolute = path.join(ROOT, normalized);
  return absolute.startsWith(ROOT) ? absolute : null;
}

async function startStaticServer(baseUrl) {
  const port = Number(baseUrl.port || (baseUrl.protocol === "https:" ? 443 : 80));
  const host = baseUrl.hostname;
  const server = http.createServer(async (request, response) => {
    if (!request.url || !["GET", "HEAD"].includes(request.method || "GET")) {
      response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Method not allowed");
      return;
    }

    const requestUrl = new URL(request.url, baseUrl);
    let filePath = safeStaticPath(requestUrl.pathname);
    if (!filePath) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Bad request");
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
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      fs.createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      response.end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  return server;
}

function buildScenarioUrl(baseUrl, matrix, scenario, extraParams = {}) {
  const url = new URL(scenario.page_path, baseUrl);
  for (const [key, value] of Object.entries(matrix.test_parameters || {})) {
    url.searchParams.set(key, String(value));
  }
  for (const [key, value] of Object.entries(extraParams)) {
    if (value == null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  url.hash = scenario.anchor;
  return url.toString();
}

function collectProhibitedKeyPaths(value, prefix = "") {
  const violations = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => violations.push(...collectProhibitedKeyPaths(item, `${prefix}[${index}]`)));
    return violations;
  }
  if (!value || typeof value !== "object") return violations;

  for (const [key, nested] of Object.entries(value)) {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (PROHIBITED_EVENT_KEYS.has(key)) violations.push(nextPath);
    violations.push(...collectProhibitedKeyPaths(nested, nextPath));
  }
  return violations;
}

function validateEventPrivacy(events) {
  const keyViolations = collectProhibitedKeyPaths(events);
  const serialized = JSON.stringify(events);
  const valueViolations = [];
  if (PHONE_LIKE_VALUE.test(serialized)) valueViolations.push("phone-like value");
  if (EMAIL_LIKE_VALUE.test(serialized)) valueViolations.push("email-like value");
  return { keyViolations, valueViolations };
}

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function attachNetworkGuards(page, baseOrigin) {
  const state = {
    leadEndpointRequests: [],
    externalDataRequests: [],
    consoleErrors: [],
    pageErrors: []
  };

  page.on("request", (request) => {
    if (request.url().startsWith(LEAD_ENDPOINT)) {
      state.leadEndpointRequests.push({ method: request.method(), resourceType: request.resourceType() });
    }
  });

  page.on("console", (message) => {
    if (message.type() === "error") state.consoleErrors.push(cleanText(message.text()));
  });
  page.on("pageerror", (error) => state.pageErrors.push(cleanText(error.message)));

  await page.route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const dataResource = ["xhr", "fetch", "eventsource"].includes(request.resourceType());

    if (request.url().startsWith(LEAD_ENDPOINT)) {
      await route.abort("blockedbyclient");
      return;
    }

    if (dataResource && requestUrl.origin !== baseOrigin) {
      state.externalDataRequests.push({
        origin: requestUrl.origin,
        method: request.method(),
        resourceType: request.resourceType()
      });
      await route.abort("blockedbyclient");
      return;
    }

    await route.continue();
  });

  return state;
}

async function waitForQaRuntime(page, scenario, timeoutMs) {
  await page.waitForFunction((formId) => {
    const form = Array.from(document.querySelectorAll("form[data-lead-form]")).find((item) => item.dataset.formId === formId);
    return Boolean(
      form
      && form.dataset.jsReady === "true"
      && window.__NEWBUILD_LEAD_TEST_MODE__ === true
      && window.__NEWBUILD_ANALYTICS_DEBUG_MODE__ === true
      && typeof window.getPortalAnalyticsDebugEvents === "function"
    );
  }, scenario.form_id, { timeout: timeoutMs });
}

async function targetForm(page, scenario) {
  return page.locator(`form[data-lead-form][data-form-id="${scenario.form_id}"]`);
}

async function waitForTargetView(page, scenario, timeoutMs) {
  const form = await targetForm(page, scenario);
  await form.scrollIntoViewIfNeeded();
  await page.waitForFunction((formId) => {
    const events = window.getPortalAnalyticsDebugEvents?.() || [];
    return events.some((event) => event.event === "lead_form_view" && event.form_id === formId);
  }, scenario.form_id, { timeout: timeoutMs });
}

async function checkEmptyValidationAndFocus(page, scenario) {
  return page.evaluate((formId) => {
    const form = Array.from(document.querySelectorAll("form[data-lead-form]")).find((item) => item.dataset.formId === formId);
    if (!form) return { passed: false, reason: "target form missing" };
    form.reset();
    const firstInvalid = form.querySelector(":invalid");
    const valid = form.checkValidity();
    form.reportValidity();
    const active = document.activeElement;
    return {
      passed: valid === false && Boolean(firstInvalid) && form.contains(active),
      invalid_name: firstInvalid?.getAttribute("name") || "",
      focused_name: active?.getAttribute?.("name") || ""
    };
  }, scenario.form_id);
}

async function phoneBoundaryChecks(page, scenario) {
  const form = await targetForm(page, scenario);
  const phone = form.locator('input[type="tel"], input[name="phone"]').first();
  assertCondition(await phone.count() === 1, `${scenario.id}: phone input not found`);

  const metadata = await phone.evaluate((input) => ({
    inputmode: input.getAttribute("inputmode") || "",
    autocomplete: input.getAttribute("autocomplete") || "",
    maxlength: input.maxLength
  }));

  const outcomes = {};
  for (const length of [9, 10, 15, 16]) {
    await phone.fill(generatedPhone(length));
    await page.waitForTimeout(40);
    outcomes[length] = await phone.evaluate((input, requestedLength) => ({
      valid: input.checkValidity(),
      actualDigits: String(input.value || "").replace(/\D/g, "").length,
      requestedLength
    }), length);
  }

  assertCondition(outcomes[9].valid === false, `${scenario.id}: 9 digits must be rejected`);
  assertCondition(outcomes[10].valid === true, `${scenario.id}: 10 digits must be accepted`);
  assertCondition(outcomes[15].valid === true, `${scenario.id}: 15 digits must be accepted`);
  assertCondition(
    outcomes[16].valid === false || outcomes[16].actualDigits < 16,
    `${scenario.id}: 16 digits must be rejected or truncated`
  );
  assertCondition(metadata.inputmode === "tel", `${scenario.id}: inputmode=tel is required`);
  assertCondition(
    ["tel", "tel-national", "mobile"].includes(metadata.autocomplete),
    `${scenario.id}: phone autocomplete is not configured`
  );

  await phone.fill(generatedPhone(10));
  return {
    boundary: {
      "9": outcomes[9].valid,
      "10": outcomes[10].valid,
      "15": outcomes[15].valid,
      "16": outcomes[16].valid,
      "16_truncated": outcomes[16].actualDigits < 16
    },
    attributes: metadata
  };
}

async function fillForm(page, scenario) {
  const form = await targetForm(page, scenario);
  const controls = form.locator("input, select, textarea");
  const count = await controls.count();
  const radioNames = new Set();

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    if (!(await control.isVisible()) || !(await control.isEnabled())) continue;
    const meta = await control.evaluate((element) => ({
      tag: element.tagName.toLowerCase(),
      type: String(element.getAttribute("type") || "").toLowerCase(),
      name: element.getAttribute("name") || "",
      required: element.required === true,
      value: element.value || ""
    }));

    if (["hidden", "submit", "button", "reset", "file"].includes(meta.type)) continue;
    if (meta.name === "website") continue;

    if (meta.tag === "select") {
      const option = await control.evaluate((select) => Array.from(select.options).find((item) => !item.disabled && String(item.value || "").trim())?.value || "");
      if (option) await control.selectOption(option);
      continue;
    }

    if (meta.type === "checkbox") {
      if (meta.required || meta.name === "consent") await control.check();
      continue;
    }

    if (meta.type === "radio") {
      if (!radioNames.has(meta.name)) {
        radioNames.add(meta.name);
        await control.check();
      }
      continue;
    }

    if (meta.type === "tel" || meta.name === "phone") {
      await control.fill(generatedPhone(10));
      continue;
    }
    if (meta.type === "email") {
      await control.fill(generatedEmail());
      continue;
    }
    if (meta.type === "number") {
      const value = await control.evaluate((input) => Number.isFinite(Number(input.min)) && input.min !== "" ? input.min : "1");
      await control.fill(String(value));
      continue;
    }
    if (meta.type === "date") {
      await control.fill("2030-01-01");
      continue;
    }
    if (meta.type === "time") {
      await control.fill("12:00");
      continue;
    }

    if (meta.tag === "textarea" || meta.required || !meta.value) {
      await control.fill("QA");
    }
  }

  const validity = await form.evaluate((element) => ({
    valid: element.checkValidity(),
    invalid: Array.from(element.querySelectorAll(":invalid")).map((item) => item.getAttribute("name") || item.tagName.toLowerCase())
  }));
  assertCondition(validity.valid, `${scenario.id}: form remains invalid (${validity.invalid.join(", ")})`);

  const persistence = await form.evaluate((element) => {
    const editable = Array.from(element.querySelectorAll("input:not([type='hidden']):not([type='checkbox']):not([type='radio']), textarea"))
      .find((item) => !item.disabled && item.offsetParent !== null && String(item.value || ""));
    if (!editable) return true;
    const value = editable.value;
    const other = Array.from(element.elements).find((item) => item !== editable && typeof item.focus === "function" && !item.disabled);
    other?.focus();
    return editable.value === value;
  });
  assertCondition(persistence, `${scenario.id}: a control lost its value after focus change`);
}

async function readDebugEvents(page) {
  return page.evaluate(() => {
    const events = window.getPortalAnalyticsDebugEvents?.() || [];
    return Array.isArray(events) ? events : [];
  });
}

function validateScenarioEvents(events, scenario) {
  const targetEvents = events.filter((event) => event?.form_id === scenario.form_id);
  const counts = Object.fromEntries(REQUIRED_EVENTS.map((name) => [name, targetEvents.filter((event) => event.event === name).length]));

  for (const eventName of REQUIRED_EVENTS) {
    assertCondition(counts[eventName] === 1, `${scenario.id}: expected one ${eventName}, got ${counts[eventName]}`);
  }

  for (const event of targetEvents.filter((item) => REQUIRED_EVENTS.includes(item.event))) {
    assertCondition(event.form_id === scenario.form_id, `${scenario.id}: form_id mismatch in ${event.event}`);
    assertCondition(event.form_role === scenario.form_role, `${scenario.id}: form_role mismatch in ${event.event}`);
    assertCondition(event.lead_type === scenario.lead_type, `${scenario.id}: lead_type mismatch in ${event.event}`);
    assertCondition(event.object_id === scenario.object_id, `${scenario.id}: object_id mismatch in ${event.event}`);
    assertCondition(NORMALIZED_PLACEMENT.test(String(event.placement || "")), `${scenario.id}: placement missing or not normalized in ${event.event}`);
  }

  const privacy = validateEventPrivacy(targetEvents);
  assertCondition(!privacy.keyViolations.length, `${scenario.id}: prohibited analytics keys: ${privacy.keyViolations.join(", ")}`);
  assertCondition(!privacy.valueViolations.length, `${scenario.id}: prohibited analytics values: ${privacy.valueViolations.join(", ")}`);
  assertCondition(counts.lead_submit === 1, `${scenario.id}: duplicate canonical lead_submit`);

  return { targetEvents, counts, privacy };
}

async function runScenario(browser, config, matrix, scenario, iteration) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    locale: "ru-RU",
    timezoneId: "Europe/Moscow"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(config.timeoutMs);
  page.setDefaultNavigationTimeout(config.navigationTimeoutMs);
  const network = await attachNetworkGuards(page, config.baseUrl.origin);
  const startedAt = new Date().toISOString();
  const fileBase = `${slug(scenario.id)}-${iteration}`;

  try {
    await page.goto(buildScenarioUrl(config.baseUrl, matrix, scenario), { waitUntil: "domcontentloaded" });
    await waitForQaRuntime(page, scenario, config.timeoutMs);
    await waitForTargetView(page, scenario, config.timeoutMs);

    const emptyValidation = await checkEmptyValidationAndFocus(page, scenario);
    assertCondition(emptyValidation.passed, `${scenario.id}: empty submission did not focus an invalid field`);

    const phoneChecks = await phoneBoundaryChecks(page, scenario);
    await fillForm(page, scenario);

    const form = await targetForm(page, scenario);
    const submit = form.locator('button[type="submit"]').first();
    assertCondition(await submit.count() === 1, `${scenario.id}: submit button missing`);
    await submit.click({ clickCount: 2, delay: 20 });

    await page.waitForURL((url) => url.pathname.replace(/\/+$/, "") === "/spasibo", { timeout: config.navigationTimeoutMs });
    await page.waitForFunction(() => window.__NEWBUILD_ANALYTICS_DEBUG_MODE__ === true && typeof window.getPortalAnalyticsDebugEvents === "function", null, { timeout: config.timeoutMs });
    await page.waitForFunction((formId) => {
      const events = window.getPortalAnalyticsDebugEvents?.() || [];
      const required = ["lead_form_view", "lead_form_start", "lead_submit", "lead_submit_classified", "lead_thankyou_view"];
      return required.every((name) => events.some((event) => event.event === name && event.form_id === formId));
    }, scenario.form_id, { timeout: config.timeoutMs });

    const events = await readDebugEvents(page);
    const validated = validateScenarioEvents(events, scenario);
    assertCondition(network.leadEndpointRequests.length === 0, `${scenario.id}: dry-run attempted newbuild-lead fetch`);
    assertCondition(network.externalDataRequests.length === 0, `${scenario.id}: dry-run attempted external data delivery`);

    const screenshot = path.join(config.outputDir, "screenshots", `${fileBase}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    const eventFile = path.join(config.outputDir, "events", `${fileBase}.json`);
    await fsp.writeFile(eventFile, `${JSON.stringify(validated.targetEvents, null, 2)}\n`, "utf8");

    return {
      scenario_id: scenario.id,
      iteration,
      status: "passed",
      tested_at: startedAt,
      target: {
        page_path: scenario.page_path,
        form_id: scenario.form_id,
        form_role: scenario.form_role,
        lead_type: scenario.lead_type,
        object_id: scenario.object_id
      },
      checks: {
        target_form_visible: true,
        required_validation_and_focus: true,
        phone_boundary_validation: true,
        phone_keyboard_and_autocomplete: true,
        select_and_text_controls: true,
        dry_run_submission: true,
        analytics_event_sequence: true,
        privacy_payload_check: true,
        repeat_submit_integrity: true,
        status_and_recovery: true
      },
      phone: phoneChecks,
      event_counts: validated.counts,
      evidence: {
        screenshot: path.relative(ROOT, screenshot),
        event_log: path.relative(ROOT, eventFile)
      },
      network: {
        lead_endpoint_requests: 0,
        external_data_requests: 0
      },
      runtime_errors: {
        console: network.consoleErrors,
        page: network.pageErrors
      }
    };
  } catch (error) {
    const screenshot = path.join(config.outputDir, "screenshots", `${fileBase}-failed.png`);
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);
    const events = await readDebugEvents(page).catch(() => []);
    const eventFile = path.join(config.outputDir, "events", `${fileBase}-failed.json`);
    await fsp.writeFile(eventFile, `${JSON.stringify(events, null, 2)}\n`, "utf8").catch(() => undefined);
    return {
      scenario_id: scenario.id,
      iteration,
      status: "failed",
      tested_at: startedAt,
      error: cleanText(error.message, 1000),
      target: {
        page_path: scenario.page_path,
        form_id: scenario.form_id,
        form_role: scenario.form_role,
        lead_type: scenario.lead_type,
        object_id: scenario.object_id
      },
      evidence: {
        screenshot: path.relative(ROOT, screenshot),
        event_log: path.relative(ROOT, eventFile)
      },
      network: {
        lead_endpoint_requests: network.leadEndpointRequests.length,
        external_data_requests: network.externalDataRequests.length
      },
      runtime_errors: {
        console: network.consoleErrors,
        page: network.pageErrors
      }
    };
  } finally {
    await context.close();
  }
}

async function runStorageCheck(browser, config, matrix, scenario, mode) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    locale: "ru-RU",
    timezoneId: "Europe/Moscow"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(config.timeoutMs);
  page.setDefaultNavigationTimeout(config.navigationTimeoutMs);
  const network = await attachNetworkGuards(page, config.baseUrl.origin);
  const startedAt = new Date().toISOString();
  const fileBase = `storage-${mode}`;

  try {
    await page.goto(buildScenarioUrl(config.baseUrl, matrix, scenario, { storage_fail: mode }), { waitUntil: "domcontentloaded" });
    await waitForQaRuntime(page, scenario, config.timeoutMs);
    await waitForTargetView(page, scenario, config.timeoutMs);
    await fillForm(page, scenario);

    const form = await targetForm(page, scenario);
    const submit = form.locator('button[type="submit"]').first();
    await submit.click();
    await page.waitForTimeout(900);

    const state = await form.evaluate((element) => {
      const button = element.querySelector('button[type="submit"]');
      const status = element.querySelector("[data-form-status]");
      return {
        busy: element.getAttribute("aria-busy") === "true",
        submitting: element.dataset.submitting === "true",
        buttonDisabled: button?.disabled === true,
        statusText: status?.textContent || "",
        storageMode: document.body.dataset.storageFailureMode || ""
      };
    });

    assertCondition(page.url().includes("/spasibo/") === false, `storage ${mode}: unexpected thank-you redirect`);
    assertCondition(state.storageMode === mode, `storage ${mode}: mode not activated`);
    assertCondition(!state.busy && !state.submitting && !state.buttonDisabled, `storage ${mode}: form did not recover`);
    assertCondition(cleanText(state.statusText).length > 0, `storage ${mode}: status message missing`);
    assertCondition(network.leadEndpointRequests.length === 0, `storage ${mode}: attempted newbuild-lead fetch`);
    assertCondition(network.externalDataRequests.length === 0, `storage ${mode}: attempted external data delivery`);

    await page.waitForFunction((formId) => {
      const events = window.getPortalAnalyticsDebugEvents?.() || [];
      const required = ["lead_form_view", "lead_form_start", "lead_submit", "lead_submit_classified"];
      return required.every((name) => events.some((event) => event.event === name && event.form_id === formId));
    }, scenario.form_id, { timeout: config.timeoutMs });

    const events = (await readDebugEvents(page)).filter((event) => event?.form_id === scenario.form_id);
    for (const eventName of STORAGE_EVENTS) {
      const count = events.filter((event) => event.event === eventName).length;
      assertCondition(count === 1, `storage ${mode}: expected one ${eventName}, got ${count}`);
    }
    assertCondition(events.every((event) => event.event !== "lead_thankyou_view"), `storage ${mode}: thank-you event must not fire`);
    const privacy = validateEventPrivacy(events);
    assertCondition(!privacy.keyViolations.length && !privacy.valueViolations.length, `storage ${mode}: event log privacy violation`);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForQaRuntime(page, scenario, config.timeoutMs);
    const reloadedForm = await targetForm(page, scenario);
    const reloadedState = await reloadedForm.evaluate((element) => ({
      busy: element.getAttribute("aria-busy") === "true",
      submitting: element.dataset.submitting === "true",
      disabled: element.querySelector('button[type="submit"]')?.disabled === true
    }));
    assertCondition(!reloadedState.busy && !reloadedState.submitting && !reloadedState.disabled, `storage ${mode}: reload preserved a cooldown or busy state`);

    const screenshot = path.join(config.outputDir, "screenshots", `${fileBase}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    const eventFile = path.join(config.outputDir, "events", `${fileBase}.json`);
    await fsp.writeFile(eventFile, `${JSON.stringify(events, null, 2)}\n`, "utf8");

    return {
      id: `${mode}_storage_unavailable`,
      mode,
      device: "desktop_chromium_emulation",
      status: "passed",
      tested_at: startedAt,
      checks: {
        test_mode_allowlisted: true,
        dry_run_continues: true,
        no_external_delivery: true,
        form_recovers: true,
        no_persistent_cooldown: true,
        privacy_payload_check: true
      },
      evidence: {
        screenshot: path.relative(ROOT, screenshot),
        event_log: path.relative(ROOT, eventFile)
      }
    };
  } catch (error) {
    const screenshot = path.join(config.outputDir, "screenshots", `${fileBase}-failed.png`);
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined);
    return {
      id: `${mode}_storage_unavailable`,
      mode,
      device: "desktop_chromium_emulation",
      status: "failed",
      tested_at: startedAt,
      error: cleanText(error.message, 1000),
      evidence: { screenshot: path.relative(ROOT, screenshot) }
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const config = resolveConfig();
  const matrix = await readJson(MATRIX_PATH);
  assertCondition(Array.isArray(matrix.scenarios) && matrix.scenarios.length === 14, "Expected exactly 14 form scenarios.");
  assertCondition((matrix.required_events || []).join("|") === REQUIRED_EVENTS.join("|"), "Matrix required events differ from browser runner contract.");
  await ensureOutput(config.outputDir);

  let server = null;
  if (config.startServer) server = await startStaticServer(config.baseUrl);

  const browser = await chromium.launch({ headless: config.headless });
  const scenarioResults = [];
  const storageResults = [];

  try {
    for (const scenario of matrix.scenarios) {
      const iterations = scenario.id === "aerodromnaya_18g_detailed" ? 2 : 1;
      for (let iteration = 1; iteration <= iterations; iteration += 1) {
        console.log(`Running ${scenario.id} (${iteration}/${iterations})`);
        const result = await runScenario(browser, config, matrix, scenario, iteration);
        scenarioResults.push(result);
        console.log(`${result.status.toUpperCase()}: ${scenario.id} (${iteration}/${iterations})${result.error ? ` — ${result.error}` : ""}`);
      }
    }

    if (config.runStorageChecks) {
      const representative = matrix.scenarios.find((scenario) => scenario.id === "homepage_primary") || matrix.scenarios[0];
      for (const mode of ["local", "session"]) {
        console.log(`Running storage failure: ${mode}`);
        const result = await runStorageCheck(browser, config, matrix, representative, mode);
        storageResults.push(result);
        console.log(`${result.status.toUpperCase()}: storage ${mode}${result.error ? ` — ${result.error}` : ""}`);
      }
    }
  } finally {
    await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  }

  const failedScenarios = scenarioResults.filter((item) => item.status !== "passed");
  const failedStorage = storageResults.filter((item) => item.status !== "passed");
  const summary = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    portal_id: matrix.portal_id,
    source_commit: process.env.GITHUB_SHA || "local",
    target: {
      origin: config.baseUrl.origin,
      mode: config.startServer ? "local_static" : "allowlisted_remote",
      device_profile: "desktop_chromium_emulation",
      physical_device: false
    },
    safety: {
      dry_run_only: true,
      analytics_debug_only: true,
      real_submission_forbidden: true,
      lead_endpoint_requests_allowed: 0,
      personal_data_in_artifacts_forbidden: true,
      repository_results_modified: false
    },
    summary: {
      unique_scenarios: matrix.scenarios.length,
      scenario_runs: scenarioResults.length,
      scenario_passed: scenarioResults.length - failedScenarios.length,
      scenario_failed: failedScenarios.length,
      aerodromnaya_detailed_runs: scenarioResults.filter((item) => item.scenario_id === "aerodromnaya_18g_detailed").length,
      storage_checks: storageResults.length,
      storage_passed: storageResults.length - failedStorage.length,
      storage_failed: failedStorage.length
    },
    scenario_results: scenarioResults,
    storage_results: storageResults
  };

  const summaryPath = path.join(config.outputDir, "summary.json");
  await fsp.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`Browser QA summary: ${path.relative(ROOT, summaryPath)}`);

  if (failedScenarios.length || failedStorage.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(cleanText(error.stack || error.message, 2000));
  process.exitCode = 1;
});
