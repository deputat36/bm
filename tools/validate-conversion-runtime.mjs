import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCENARIOS_PATH = "data/qa/form-scenarios.json";
const SCHEMA_SCRIPT_PATH = "assets/js/schema.js";
const TRACKING_SCRIPT_PATH = "assets/js/conversion-tracking.js";
const DEBUG_SCRIPT_PATH = "assets/js/analytics-debug.js";
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`${escapeRegExp(name)}=["']([^"']*)["']`, "i");
  return tag.match(pattern)?.[1]?.trim() || "";
}

function getScriptTags(html) {
  return html.match(/<script\b[^>]*src=["'][^"']+["'][^>]*><\/script>/gi) || [];
}

function getAnchorTags(html) {
  return html.match(/<a\b[^>]*href=["'][^"']+["'][^>]*>/gi) || [];
}

function countOccurrences(text, fragment) {
  return text.split(fragment).length - 1;
}

const matrix = readJson(SCENARIOS_PATH);
const schemaSource = read(SCHEMA_SCRIPT_PATH);
const trackingSource = read(TRACKING_SCRIPT_PATH);
const debugSource = read(DEBUG_SCRIPT_PATH);

if (!matrix || !schemaSource || !trackingSource || !debugSource) {
  process.exit(1);
}

const scenarios = Array.isArray(matrix.scenarios) ? matrix.scenarios : [];
if (scenarios.length !== 14) {
  errors.push(`${SCENARIOS_PATH}: expected 14 active form scenarios, got ${scenarios.length}`);
}

const pages = new Map();
for (const scenario of scenarios) {
  const pageFile = String(scenario.page_file || "").trim();
  const formId = String(scenario.form_id || "").trim();
  const objectId = String(scenario.object_id || "").trim();
  if (!pageFile || !formId) {
    errors.push(`${SCENARIOS_PATH}: scenario ${scenario.id || "unknown"} lacks page_file or form_id`);
    continue;
  }
  if (!pages.has(pageFile)) pages.set(pageFile, { formIds: [], objectIds: new Set() });
  pages.get(pageFile).formIds.push(formId);
  if (objectId) pages.get(pageFile).objectIds.add(objectId);
}

if (pages.size !== 7) {
  errors.push(`${SCENARIOS_PATH}: expected 7 active form pages, got ${pages.size}`);
}

const requiredSchemaFragments = [
  'document.querySelector("form[data-lead-form]")',
  'loadPortalScript(schemaScriptUrl, "analytics-debug.js", { ordered: true })',
  'loadPortalScript(schemaScriptUrl, "priority-leads.js")',
  'loadPortalScript(schemaScriptUrl, "mobile-lead-bar.js")',
  'loadPortalScript(schemaScriptUrl, "form-accessibility.js")',
  'loadPortalScript(schemaScriptUrl, "conversion-tracking.js")',
  "isAnalyticsDebugRequested()"
];
requiredSchemaFragments.forEach((fragment) => {
  if (!schemaSource.includes(fragment)) errors.push(`${SCHEMA_SCRIPT_PATH}: missing runtime fragment ${fragment}`);
});

const debugLoadIndex = schemaSource.indexOf('loadPortalScript(schemaScriptUrl, "analytics-debug.js", { ordered: true })');
const trackingLoadIndex = schemaSource.indexOf('loadPortalScript(schemaScriptUrl, "conversion-tracking.js")');
if (debugLoadIndex < 0 || trackingLoadIndex < 0 || debugLoadIndex > trackingLoadIndex) {
  errors.push(`${SCHEMA_SCRIPT_PATH}: analytics debug must be prepared before conversion tracking`);
}

[
  'sendConversionEvent("lead_cta_click"',
  'sendConversionEvent("lead_form_view"',
  'sendConversionEvent("lead_form_start"',
  'sendConversionEvent("lead_submit_classified"'
].forEach((fragment) => {
  if (!trackingSource.includes(fragment)) errors.push(`${TRACKING_SCRIPT_PATH}: missing event fragment ${fragment}`);
});

[
  "window.__NEWBUILD_ANALYTICS_DEBUG_MODE__",
  "window.recordPortalAnalyticsDebugEvent",
  "external analytics"
].forEach((fragment) => {
  if (!debugSource.includes(fragment)) errors.push(`${DEBUG_SCRIPT_PATH}: missing debug fragment ${fragment}`);
});

let checkedForms = 0;
let checkedPhoneLinks = 0;
let checkedTrackedLinks = 0;

for (const [pageFile, page] of pages) {
  const html = read(pageFile);
  if (!html) continue;

  const scripts = getScriptTags(html);
  const mainScripts = scripts.filter((tag) => /assets\/js\/main\.js/i.test(getAttribute(tag, "src")));
  const schemaScripts = scripts.filter((tag) => /assets\/js\/schema\.js/i.test(getAttribute(tag, "src")));
  const directTrackingScripts = scripts.filter((tag) => /assets\/js\/conversion-tracking\.js/i.test(getAttribute(tag, "src")));
  const directDebugScripts = scripts.filter((tag) => /assets\/js\/analytics-debug\.js/i.test(getAttribute(tag, "src")));

  if (mainScripts.length !== 1) errors.push(`${pageFile}: expected exactly one main.js, got ${mainScripts.length}`);
  if (schemaScripts.length !== 1) errors.push(`${pageFile}: expected exactly one schema.js, got ${schemaScripts.length}`);
  if (directTrackingScripts.length) errors.push(`${pageFile}: conversion-tracking.js must be loaded only by schema.js to avoid duplicate events`);
  if (directDebugScripts.length) errors.push(`${pageFile}: analytics-debug.js must be loaded conditionally by schema.js`);

  const mainIndex = html.indexOf(mainScripts[0] || "__missing_main__");
  const schemaIndex = html.indexOf(schemaScripts[0] || "__missing_schema__");
  if (mainIndex < 0 || schemaIndex < 0 || mainIndex > schemaIndex) {
    errors.push(`${pageFile}: main.js must be loaded before schema.js`);
  }

  for (const formId of page.formIds) {
    const fragment = `data-form-id="${formId}"`;
    const singleQuotes = `data-form-id='${formId}'`;
    const count = countOccurrences(html, fragment) + countOccurrences(html, singleQuotes);
    if (count !== 1) errors.push(`${pageFile}: expected one form ${formId}, got ${count}`);
    checkedForms += count;
  }

  const anchors = getAnchorTags(html);
  for (const anchor of anchors) {
    const href = getAttribute(anchor, "href");
    const action = getAttribute(anchor, "data-track-action");
    const placement = getAttribute(anchor, "data-track-placement");
    const objectId = getAttribute(anchor, "data-track-object");

    if (action) checkedTrackedLinks += 1;
    if (!href.toLowerCase().startsWith("tel:")) continue;

    checkedPhoneLinks += 1;
    if (action !== "phone") errors.push(`${pageFile}: tel link must use data-track-action=phone`);
    if (!placement) errors.push(`${pageFile}: tel link must have data-track-placement`);
    if (!/^tel:\+7\d{10}$/.test(href)) errors.push(`${pageFile}: tel link must use normalized Russian E.164 format`);

    const projectIds = [...page.objectIds].filter((id) => id !== "all-newbuilds");
    if (projectIds.length === 1 && objectId !== projectIds[0]) {
      errors.push(`${pageFile}: project tel link must use data-track-object=${projectIds[0]}`);
    }
    if (projectIds.length === 0 && objectId && objectId !== "all-newbuilds") {
      errors.push(`${pageFile}: generic tel link uses unexpected object ${objectId}`);
    }
  }
}

if (checkedForms !== 14) errors.push(`runtime coverage: expected 14 forms, checked ${checkedForms}`);
if (checkedPhoneLinks < 7) errors.push(`runtime coverage: expected at least 7 phone links, checked ${checkedPhoneLinks}`);
if (checkedTrackedLinks < checkedPhoneLinks) errors.push(`runtime coverage: tracked links count cannot be lower than phone links count`);

console.log(`Checked runtime pages: ${pages.size}`);
console.log(`Checked active forms: ${checkedForms}`);
console.log(`Checked tracked links: ${checkedTrackedLinks}`);
console.log(`Checked phone links: ${checkedPhoneLinks}`);

if (errors.length) {
  console.error("\nConversion runtime validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Conversion runtime validation passed.");
