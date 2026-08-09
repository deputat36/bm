import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILE = "data/analytics/live-provider.json";
const ALLOWED_PROVIDERS = new Set(["ga4", "yandex_metrika"]);
const REQUIRED_EVENTS = new Set([
  "lead_cta_click",
  "lead_form_view",
  "lead_form_start",
  "lead_submit",
  "lead_submit_classified",
  "lead_thankyou_view"
]);
const REQUIRED_DIMENSIONS = new Set(["form_id", "form_role", "lead_type", "object_id", "placement"]);
const REQUIRED_CHECKS = [
  "required_events_observed",
  "required_dimensions_observed",
  "lead_submit_not_double_counted",
  "lead_submit_classified_is_dimension_only",
  "pii_absent",
  "arbitrary_query_absent"
];
const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) {
    fail(`${relativePath}: file missing`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    fail(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function exactSet(actual, expected, label) {
  const a = [...actual].sort();
  const b = [...expected].sort();
  if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${label}: set mismatch`);
}

function validPublicId(provider, value) {
  const id = String(value || "").trim();
  if (provider === "ga4") return /^G-[A-Z0-9]{6,20}$/i.test(id);
  if (provider === "yandex_metrika") return /^\d{4,12}$/.test(id);
  return false;
}

const data = readJson(FILE);
if (!data) process.exit(1);

if (data.schema_version !== "1.0") fail("schema_version must be 1.0");
if (data.portal_id !== "newbuilds-borisoglebsk") fail("portal_id mismatch");
if (data.rules?.personal_data_forbidden !== true) fail("personal_data_forbidden must be true");
if (data.rules?.secret_credentials_forbidden !== true) fail("secret_credentials_forbidden must be true");
exactSet(new Set(data.rules?.allowed_providers || []), ALLOWED_PROVIDERS, "allowed_providers");
exactSet(new Set(data.required_events || []), REQUIRED_EVENTS, "required_events");
exactSet(new Set(data.required_dimensions || []), REQUIRED_DIMENSIONS, "required_dimensions");

const provider = data.provider;
const enabled = data.rules?.live_delivery_enabled === true;
const debugVerified = data.rules?.debug_verified === true;
const checks = data.acceptance_checks || {};
const allChecks = REQUIRED_CHECKS.every((key) => checks[key] === true);
const evidence = Array.isArray(data.debug_evidence) ? data.debug_evidence : [];

if (provider !== null && !ALLOWED_PROVIDERS.has(provider)) fail(`unsupported provider=${provider}`);
if (!enabled) {
  if (data.status === "live_debug_passed") fail("status cannot be live_debug_passed while delivery is disabled");
  if (debugVerified) fail("debug_verified cannot be true while delivery is disabled");
}

if (enabled) {
  if (!ALLOWED_PROVIDERS.has(provider)) fail("live delivery requires supported provider");
  if (!validPublicId(provider, data.public_counter_id)) fail("live delivery requires valid public counter id");
  if (!data.configuration_checked_at || Number.isNaN(Date.parse(data.configuration_checked_at))) {
    fail("live delivery requires configuration_checked_at");
  }
}

if (debugVerified || data.status === "live_debug_passed") {
  if (!enabled) fail("debug pass requires live delivery enabled");
  if (!allChecks) fail("debug pass requires all acceptance checks=true");
  if (!evidence.length) fail("debug pass requires evidence");
  if (!data.debug_checked_at || Number.isNaN(Date.parse(data.debug_checked_at))) fail("debug pass requires debug_checked_at");
  if (!String(data.reviewer_reference || "").trim()) fail("debug pass requires reviewer_reference");
}

for (const [index, item] of evidence.entries()) {
  const ref = String(item?.reference || "").trim();
  if (!ref.startsWith("https://") && !/^(docs|data|artifacts)\//.test(ref)) {
    fail(`debug_evidence#${index + 1}: invalid reference`);
  }
  if (!String(item?.note || "").trim()) fail(`debug_evidence#${index + 1}: note missing`);
}

const serialized = JSON.stringify(data).toLowerCase();
for (const forbidden of ["access_token", "api_secret", "client_secret", "password", "authorization", "bearer "]) {
  if (serialized.includes(forbidden)) fail(`secret-like field/value forbidden: ${forbidden}`);
}

console.log(`Live analytics provider: ${provider || "none"}; enabled=${enabled}; debug_verified=${debugVerified}; checks=${REQUIRED_CHECKS.filter((key) => checks[key] === true).length}/${REQUIRED_CHECKS.length}`);

if (errors.length) {
  console.error("\nLive analytics provider validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Live analytics provider contract passed structural validation.");
