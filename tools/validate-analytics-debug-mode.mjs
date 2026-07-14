import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const content = read(relativePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

const debugScript = read("assets/js/analytics-debug.js");
const schemaScript = read("assets/js/schema.js");
const conversionScript = read("assets/js/conversion-tracking.js");
const thankYouPage = read("spasibo/index.html");
const registry = readJson("data/analytics/events.json");

[
  'params.get("analytics_test") === "debug"',
  'params.get("lead_test") === "dry-run"',
  'params.get("test_ack") === "1"',
  'window.__NEWBUILD_ANALYTICS_DEBUG_MODE__ = true',
  'window.recordPortalAnalyticsDebugEvent',
  'newbuildsBorisoglebskAnalyticsDebugEvents',
  'sessionStorage.setItem',
  'events.slice(-MAX_EVENTS)',
  'data-analytics-debug-panel',
  'Копировать JSON',
  'client_fixation_id',
  'PROHIBITED_FIELDS'
].forEach((fragment) => {
  if (!debugScript.includes(fragment)) {
    errors.push(`assets/js/analytics-debug.js: missing fragment ${fragment}`);
  }
});

["window.dataLayer", "window.gtag", "window.ym"].forEach((fragment) => {
  if (debugScript.includes(fragment)) {
    errors.push(`assets/js/analytics-debug.js: local recorder must not call external analytics: ${fragment}`);
  }
});

[
  "function isAnalyticsDebugRequested()",
  'loadPortalScript(schemaScriptUrl, "analytics-debug.js", { ordered: true })',
  'thankYouUrl.searchParams.set("analytics_test", "debug")',
  'thankYouUrl.searchParams.set("lead_test", "dry-run")',
  'thankYouUrl.searchParams.set("test_ack", "1")',
  'url.searchParams.delete("analytics_test")'
].forEach((fragment) => {
  if (!schemaScript.includes(fragment)) {
    errors.push(`assets/js/schema.js: missing debug integration fragment ${fragment}`);
  }
});

const debugLoadPosition = schemaScript.indexOf('loadPortalScript(schemaScriptUrl, "analytics-debug.js"');
const conversionLoadPosition = schemaScript.indexOf('loadPortalScript(schemaScriptUrl, "conversion-tracking.js"');
if (debugLoadPosition < 0 || conversionLoadPosition < 0 || debugLoadPosition > conversionLoadPosition) {
  errors.push("assets/js/schema.js: analytics-debug.js must load before conversion-tracking.js");
}

[
  "function isAnalyticsDebugMode()",
  'window.recordPortalAnalyticsDebugEvent?.(payload)',
  'if (isAnalyticsDebugMode())',
  'sendConversionEvent("lead_submit"',
  'sendConversionEvent("lead_submit_classified"',
  "simulated: true"
].forEach((fragment) => {
  if (!conversionScript.includes(fragment)) {
    errors.push(`assets/js/conversion-tracking.js: missing debug suppression fragment ${fragment}`);
  }
});

const sendEventStart = conversionScript.indexOf("function sendConversionEvent");
const sendEventEnd = conversionScript.indexOf("function getFormDetails", sendEventStart);
const sendEventBlock = sendEventStart >= 0 && sendEventEnd > sendEventStart
  ? conversionScript.slice(sendEventStart, sendEventEnd)
  : "";
const debugReturnPosition = sendEventBlock.indexOf("return;");
const dataLayerPosition = sendEventBlock.indexOf("window.dataLayer");
if (!sendEventBlock || debugReturnPosition < 0 || dataLayerPosition < 0 || debugReturnPosition > dataLayerPosition) {
  errors.push("assets/js/conversion-tracking.js: debug branch must return before dataLayer");
}

[
  '<script src="../assets/js/analytics-debug.js"></script>',
  "const isAnalyticsDebug = window.__NEWBUILD_ANALYTICS_DEBUG_MODE__ === true",
  "function emitAnalyticsEvent(payload",
  "if (isAnalyticsDebug)",
  'window.recordPortalAnalyticsDebugEvent?.({ ...payload, simulated: isDryRun })',
  "if (isDryRun && !isAnalyticsDebug) return;",
  'analytics_test=debug',
  'event: "lead_thankyou_view"',
  'event: "lead_postsubmit_action"'
].forEach((fragment) => {
  if (!thankYouPage.includes(fragment)) {
    errors.push(`spasibo/index.html: missing debug fragment ${fragment}`);
  }
});

const inlineScripts = Array.from(thankYouPage.matchAll(/<script>([\s\S]*?)<\/script>/gi));
inlineScripts.forEach((match, index) => {
  try {
    new Function(match[1]);
  } catch (error) {
    errors.push(`spasibo/index.html: inline script ${index + 1} has invalid syntax: ${error.message}`);
  }
});

const debugRules = registry?.rules?.local_debug_mode || {};
const expectedDebugRules = {
  analytics_test: "debug",
  lead_test: "dry-run",
  test_ack: "1",
  requires_all_parameters: true,
  storage_key: "newbuildsBorisoglebskAnalyticsDebugEvents",
  maximum_events: 100,
  external_analytics_suppressed: true,
  personal_and_restricted_fields_removed: true
};
Object.entries(expectedDebugRules).forEach(([field, expected]) => {
  if (debugRules[field] !== expected) {
    errors.push(`data/analytics/events.json: local_debug_mode.${field} must be ${JSON.stringify(expected)}`);
  }
});

console.log("Checked local analytics debug mode and external-delivery suppression.");

if (errors.length) {
  console.error("\nAnalytics debug validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Analytics debug validation passed.");
