import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUNTIME_PATH = "assets/js/form-accessibility.js";
const MAIN_PATH = "assets/js/main.js";
const errors = [];

const EXPECTED_LIMITS = Object.freeze({
  name: 80,
  budget: 120,
  callback_time: 120,
  convenient_time: 120,
  comment: 1000,
  question: 1000
});

const FORBIDDEN_LIMIT_FIELDS = [
  "phone",
  "phone_normalized",
  "email",
  "tracking",
  "consent_text",
  "personal_data_consent",
  "marketing_consent",
  "client_fixation_id",
  "user_agent"
];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireFragment(source, fragment, label = fragment) {
  if (!source.includes(fragment)) errors.push(`${RUNTIME_PATH}: missing ${label}`);
}

const runtime = read(RUNTIME_PATH);
const main = read(MAIN_PATH);
if (!runtime || !main) process.exit(1);

const limitsStart = runtime.indexOf("const LEAD_TEXT_LIMITS = Object.freeze({");
const limitsEnd = runtime.indexOf("});", limitsStart);
const limitsBlock = limitsStart >= 0 && limitsEnd > limitsStart
  ? runtime.slice(limitsStart, limitsEnd)
  : "";

if (!limitsBlock) {
  errors.push(`${RUNTIME_PATH}: LEAD_TEXT_LIMITS block not found`);
} else {
  const actual = Object.fromEntries(
    Array.from(limitsBlock.matchAll(/^\s*([a-z][a-z0-9_]*)\s*:\s*(\d+)\s*,?$/gmi), (match) => [match[1], Number(match[2])])
  );

  for (const [field, limit] of Object.entries(EXPECTED_LIMITS)) {
    if (actual[field] !== limit) errors.push(`${RUNTIME_PATH}: ${field} limit must be ${limit}`);
  }

  for (const field of Object.keys(actual)) {
    if (!(field in EXPECTED_LIMITS)) errors.push(`${RUNTIME_PATH}: unexpected limited field ${field}`);
  }

  FORBIDDEN_LIMIT_FIELDS.forEach((field) => {
    if (field in actual) errors.push(`${RUNTIME_PATH}: forbidden field in text limits: ${field}`);
  });
}

[
  "const LEAD_TEXT_CONTROL_PATTERN =",
  "function sanitizeLeadTextValue(value, maxLength)",
  ".replace(LEAD_TEXT_CONTROL_PATTERN, \"\")",
  ".trim()",
  ".slice(0, maxLength)",
  "function sanitizeLeadTextFields(data)",
  "Object.entries(LEAD_TEXT_LIMITS).forEach",
  "Object.prototype.hasOwnProperty.call(sanitized, field)",
  "collectFormData = function collectPrivateAndBoundedLeadData(form)",
  "sanitizeLeadTextFields(originalCollectFormData(form))",
  "sendLead = async function sendPrivateAndBoundedLead(data)",
  "const privateData = sanitizeLeadTextFields(data);",
  "function enhanceLeadTextFields(form)",
  "field.maxLength = maxLength;",
  "field.dataset.leadTextLimit = String(maxLength);",
  "enhanceLeadTextFields(form);"
].forEach((fragment) => requireFragment(runtime, fragment));

const collectStart = runtime.indexOf("collectFormData = function collectPrivateAndBoundedLeadData(form)");
const collectEnd = runtime.indexOf("const originalSendLead = sendLead;", collectStart);
const collectBlock = collectStart >= 0 && collectEnd > collectStart ? runtime.slice(collectStart, collectEnd) : "";
if (!collectBlock.includes("sanitizeLeadTextFields")) {
  errors.push(`${RUNTIME_PATH}: collectFormData must sanitize text fields`);
}

const sendStart = runtime.indexOf("sendLead = async function sendPrivateAndBoundedLead(data)");
const sendEnd = runtime.indexOf("window.__NEWBUILD_LEAD_PAYLOAD_PRIVACY__", sendStart);
const sendBlock = sendStart >= 0 && sendEnd > sendStart ? runtime.slice(sendStart, sendEnd) : "";
if (!sendBlock.includes("sanitizeLeadTextFields")) {
  errors.push(`${RUNTIME_PATH}: sendLead must sanitize text fields again`);
}

if (!main.includes("fields_json: JSON.stringify(data, null, 2)")) {
  errors.push(`${MAIN_PATH}: Web3Forms fields_json contract not found`);
}

console.log(`Lead text fields with limits: ${Object.keys(EXPECTED_LIMITS).length}`);
console.log(`Name limit: ${EXPECTED_LIMITS.name}`);
console.log(`Short free-text limit: ${EXPECTED_LIMITS.budget}`);
console.log(`Long free-text limit: ${EXPECTED_LIMITS.comment}`);
console.log("Sanitization layers: collectFormData + sendLead");

if (errors.length) {
  console.error("\nLead text limits validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Lead text limits validation passed.");