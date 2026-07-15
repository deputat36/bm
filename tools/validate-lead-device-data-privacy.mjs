import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MAIN_PATH = "assets/js/main.js";
const RUNTIME_PATH = "assets/js/form-accessibility.js";
const SCHEMA_PATH = "assets/js/schema.js";
const EVENTS_PATH = "data/analytics/events.json";
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

function requireFragment(source, fragment, label) {
  if (!source.includes(fragment)) errors.push(`${label}: missing ${fragment}`);
}

const main = read(MAIN_PATH);
const runtime = read(RUNTIME_PATH);
const schema = read(SCHEMA_PATH);
const events = readJson(EVENTS_PATH);

[
  "function enableLeadPayloadPrivacy()",
  'window.__NEWBUILD_LEAD_PAYLOAD_PRIVACY__ === true',
  'typeof collectFormData !== "function"',
  'typeof sendLead !== "function"',
  "const originalCollectFormData = collectFormData;",
  "collectFormData = function collectLeadDataWithoutDeviceFingerprint(form)",
  "delete data.user_agent;",
  "const originalSendLead = sendLead;",
  "sendLead = async function sendLeadWithoutDeviceFingerprint(data)",
  "const privateData = { ...(data || {}) };",
  "delete privateData.user_agent;",
  "return originalSendLead(privateData);",
  "window.__NEWBUILD_LEAD_PAYLOAD_PRIVACY__ = true;",
  "enableLeadPayloadPrivacy();"
].forEach((fragment) => requireFragment(runtime, fragment, RUNTIME_PATH));

const privacyCall = runtime.indexOf("enableLeadPayloadPrivacy();");
const enhanceCall = runtime.indexOf("forms.forEach(enhanceForm);");
if (privacyCall < 0 || enhanceCall < 0 || privacyCall > enhanceCall) {
  errors.push(`${RUNTIME_PATH}: payload privacy must be installed before form enhancement`);
}

if (!schema.includes('loadPortalScript(schemaScriptUrl, "form-accessibility.js")')) {
  errors.push(`${SCHEMA_PATH}: form-accessibility runtime must load on active lead pages`);
}

if (main.includes("user_agent: data.user_agent") || main.includes("`User agent: ${data.user_agent")) {
  errors.push(`${MAIN_PATH}: user agent must not be mapped into readable or top-level delivery fields`);
}

const web3Start = main.indexOf("async function sendWeb3FormsLead(data)");
const web3End = main.indexOf("async function sendCustomLead(data)", web3Start);
const web3Block = web3Start >= 0 && web3End > web3Start ? main.slice(web3Start, web3End) : "";
if (!web3Block) {
  errors.push(`${MAIN_PATH}: Web3Forms delivery block not found`);
} else if (/\buser_agent\s*:/.test(web3Block)) {
  errors.push(`${MAIN_PATH}: user_agent must not be an explicit Web3Forms field`);
}

const prohibited = new Set(events?.rules?.prohibited_fields || []);
if (!prohibited.has("user_agent")) {
  errors.push(`${EVENTS_PATH}: user_agent must remain prohibited in analytics`);
}

for (const event of events?.events || []) {
  const fields = [...(event.required_fields || []), ...(event.optional_fields || [])];
  if (fields.includes("user_agent")) {
    errors.push(`${EVENTS_PATH}:${event.id}: user_agent must not be an analytics field`);
  }
}

console.log(`Legacy collector present: ${main.includes("data.user_agent = navigator.userAgent")}`);
console.log("Checked collectFormData privacy wrapper: yes");
console.log("Checked sendLead privacy wrapper: yes");
console.log("Checked analytics prohibition: yes");

if (errors.length) {
  console.error("\nLead device data privacy validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Lead device data privacy validation passed.");
