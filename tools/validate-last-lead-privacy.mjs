import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MAIN_PATH = "assets/js/main.js";
const SCHEMA_PATH = "assets/js/schema.js";
const CONVERSION_PATH = "assets/js/conversion-tracking.js";
const errors = [];

const LIVE_FIELDS = new Set([
  "client_fixation_id",
  "lead_type",
  "form_id",
  "project_id",
  "project_name",
  "residential_complex",
  "residential_complex_id",
  "qualification",
  "created_at"
]);

const DRY_RUN_FIELDS = new Set([
  ...LIVE_FIELDS,
  "dry_run"
]);

const FORBIDDEN_FIELDS = [
  "name",
  "phone",
  "phone_normalized",
  "phone_for_contact",
  "email",
  "budget",
  "comment",
  "question",
  "tracking",
  "consent_text",
  "personal_data_consent",
  "marketing_consent",
  "user_agent",
  "fields_json"
];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function extractObjectFields(block, marker) {
  const start = block.indexOf(marker);
  if (start < 0) return [];
  const bodyStart = block.indexOf("{", start);
  if (bodyStart < 0) return [];

  let depth = 0;
  let bodyEnd = -1;
  for (let index = bodyStart; index < block.length; index += 1) {
    if (block[index] === "{") depth += 1;
    if (block[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        bodyEnd = index;
        break;
      }
    }
  }

  if (bodyEnd < 0) return [];
  const body = block.slice(bodyStart + 1, bodyEnd);
  return Array.from(body.matchAll(/^\s*([a-z][a-z0-9_]*)\s*:/gmi), (match) => match[1]);
}

function compareFields(actual, expected, label) {
  const actualSet = new Set(actual);
  expected.forEach((field) => {
    if (!actualSet.has(field)) errors.push(`${label}: missing ${field}`);
  });
  actualSet.forEach((field) => {
    if (!expected.has(field)) errors.push(`${label}: unexpected ${field}`);
  });
}

function checkForbidden(block, label) {
  FORBIDDEN_FIELDS.forEach((field) => {
    const pattern = new RegExp(`(?:^|[^a-z0-9_])${field}(?:\\s*:|\\s*=|\\s*\\.)`, "i");
    if (pattern.test(block)) errors.push(`${label}: contains forbidden field ${field}`);
  });
}

const main = read(MAIN_PATH);
const schema = read(SCHEMA_PATH);
const conversion = read(CONVERSION_PATH);

const saveStart = main.indexOf("function saveLastLead(data)");
const saveEnd = main.indexOf("\nfunction trackLeadEvent", saveStart);
const saveBlock = saveStart >= 0 && saveEnd > saveStart ? main.slice(saveStart, saveEnd) : "";
if (!saveBlock) {
  errors.push(`${MAIN_PATH}: saveLastLead block not found`);
} else {
  if (!saveBlock.includes("safeStorageSet(LAST_LEAD_STORAGE_KEY, JSON.stringify(safeLead))")) {
    errors.push(`${MAIN_PATH}: lastLead must use safeStorageSet with safeLead`);
  }
  compareFields(extractObjectFields(saveBlock, "const safeLead ="), LIVE_FIELDS, `${MAIN_PATH}:safeLead`);
  checkForbidden(saveBlock, `${MAIN_PATH}:safeLead`);
}

const dryStart = schema.indexOf("localStorage.setItem(lastLeadStorageKey, JSON.stringify({");
const dryEnd = schema.indexOf("window.dispatchEvent(new CustomEvent(\"newbuildLeadDryRun\"", dryStart);
const dryBlock = dryStart >= 0 && dryEnd > dryStart ? schema.slice(dryStart, dryEnd) : "";
if (!dryBlock) {
  errors.push(`${SCHEMA_PATH}: dry-run lastLead block not found`);
} else {
  compareFields(extractObjectFields(dryBlock, "JSON.stringify("), DRY_RUN_FIELDS, `${SCHEMA_PATH}:dryRunLastLead`);
  checkForbidden(dryBlock, `${SCHEMA_PATH}:dryRunLastLead`);
  if (!dryBlock.includes("dry_run: true")) errors.push(`${SCHEMA_PATH}: dry-run marker is missing`);
}

const roleStart = conversion.indexOf("function updateStoredLeadRole(detail, formRole)");
const roleEnd = conversion.indexOf("\nfunction sendConversionEvent", roleStart);
const roleBlock = roleStart >= 0 && roleEnd > roleStart ? conversion.slice(roleStart, roleEnd) : "";
if (!roleBlock) {
  errors.push(`${CONVERSION_PATH}: updateStoredLeadRole block not found`);
} else {
  if (!roleBlock.includes("stored.form_role = formRole;")) {
    errors.push(`${CONVERSION_PATH}: form_role update is missing`);
  }
  const assignments = Array.from(roleBlock.matchAll(/stored\.([a-z][a-z0-9_]*)\s*=/gi), (match) => match[1]);
  assignments.forEach((field) => {
    if (field !== "form_role") errors.push(`${CONVERSION_PATH}: unexpected lastLead update ${field}`);
  });
  checkForbidden(roleBlock, `${CONVERSION_PATH}:lastLeadRoleUpdate`);
}

console.log(`Live lastLead fields: ${LIVE_FIELDS.size}`);
console.log(`Dry-run lastLead fields: ${DRY_RUN_FIELDS.size}`);
console.log("Allowed later enrichment: form_role");
console.log("Stored contact fields: 0");

if (errors.length) {
  console.error("\nLast lead privacy validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Last lead privacy validation passed.");