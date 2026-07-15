import fs from "node:fs";

const schema = fs.readFileSync("assets/js/schema.js", "utf8");

function fail(message) {
  console.error(`Offline draft privacy validation failed: ${message}`);
  process.exit(1);
}

function extractFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start === -1) fail(`function ${name} is missing`);

  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) return source.slice(start, index + 1);
  }

  fail(`function ${name} has no closing brace`);
}

const privacy = extractFunction(schema, "enableOfflineDraftPrivacy");
const receipt = extractFunction(privacy, "createOfflineReceipt");
const saveReceipt = extractFunction(privacy, "saveOfflineReceipt");

const requiredPrivacyFragments = [
  'const legacyStorageKey = "newbuildsBorisoglebskLeadsDraft"',
  'const receiptStorageKey = "newbuildsBorisoglebskOfflineReceipts"',
  "const receiptLimit = 5",
  "const originalSendLead = sendLead",
  "localStorage.removeItem(legacyStorageKey)",
  "SITE_CONFIG.LEAD_ENDPOINT",
  "SITE_CONFIG.WEB3FORMS_ACCESS_KEY && SITE_CONFIG.SEND_EMAIL_COPY",
  "data.spam_check?.likely_bot || hasExternalDestination",
  "return originalSendLead(data)",
  "sendLead = async function sendLeadWithPrivateFallback(data)",
  "offline: true",
  "contact_data_stored: false",
  "window.__NEWBUILD_OFFLINE_DRAFT_PRIVACY__ = true"
];

for (const fragment of requiredPrivacyFragments) {
  if (!privacy.includes(fragment)) fail(`missing privacy fragment: ${fragment}`);
}

const requiredReceiptFields = [
  "lead_type",
  "form_id",
  "project_id",
  "residential_complex_id",
  "qualification_status",
  "lead_source",
  "placement",
  "created_at",
  "contact_data_stored"
];

for (const field of requiredReceiptFields) {
  if (!receipt.includes(`${field}:`)) fail(`receipt field ${field} is missing`);
}

const prohibitedReceiptFields = [
  "name",
  "phone",
  "phone_normalized",
  "email",
  "budget",
  "comment",
  "question",
  "interest",
  "room_type",
  "purchase_method",
  "mortgage_program",
  "timeline",
  "purchase_timeline",
  "consent_text",
  "user_agent",
  "client_fixation_id",
  "tracking"
];

for (const field of prohibitedReceiptFields) {
  const pattern = new RegExp(`\\b${field}\\s*:`);
  if (pattern.test(receipt)) fail(`personal or excessive field ${field} is stored in receipt`);
}

if (!saveReceipt.includes("stored.slice(-receiptLimit)")) {
  fail("offline receipt list is not capped by receiptLimit");
}

if (!saveReceipt.includes("JSON.stringify")) fail("receipt list is not serialized explicitly");

const privacyCall = schema.indexOf("enableOfflineDraftPrivacy();");
const dryRunCall = schema.indexOf("enableLeadDryRunMode();");
if (privacyCall === -1 || dryRunCall === -1 || privacyCall > dryRunCall) {
  fail("offline privacy must be enabled before dry-run initialization");
}

if (schema.includes('saved.push(data)')) {
  fail("full lead payload is still pushed into browser draft storage");
}

console.log("Offline draft privacy validated: legacy PII draft removed, max 5 technical receipts, external delivery unchanged.");
