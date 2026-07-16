import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = "data/qa/form-execution-contract.json";
const MATRIX_PATH = "data/qa/form-scenarios.json";
const RESULTS_PATH = "data/qa/form-results.json";
const BUILDER_PATH = "tools/build-form-qa-execution-pack.mjs";
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
  const source = read(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function exactSet(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    errors.push(`${label}: expected ${right.join(", ")}; got ${left.join(", ")}`);
  }
}

const contract = readJson(CONTRACT_PATH);
const matrix = readJson(MATRIX_PATH);
const results = readJson(RESULTS_PATH);
const builder = read(BUILDER_PATH);

if (!contract || !matrix || !results || !builder) process.exit(1);
if (contract.schema_version !== "1.0") errors.push(`${CONTRACT_PATH}: schema_version must be 1.0`);
if (contract.portal_id !== "newbuilds-borisoglebsk") errors.push(`${CONTRACT_PATH}: invalid portal_id`);
if (contract.status !== "execution_specification_no_implied_results") {
  errors.push(`${CONTRACT_PATH}: status must remain execution_specification_no_implied_results`);
}
if (contract.sources?.scenario_matrix !== MATRIX_PATH) errors.push(`${CONTRACT_PATH}: invalid scenario_matrix source`);
if (contract.sources?.result_registry !== RESULTS_PATH) errors.push(`${CONTRACT_PATH}: invalid result_registry source`);

for (const key of [
  "all_links_use_dry_run",
  "external_delivery_forbidden",
  "synthetic_contact_values_required",
  "synthetic_values_in_repository_forbidden",
  "personal_data_in_evidence_forbidden",
  "passed_requires_result_registry_record",
  "passed_requires_evidence_reference",
  "passed_requires_event_log_attached",
  "missing_record_means_not_run",
  "generated_pack_is_not_execution_evidence"
]) {
  if (contract.rules?.[key] !== true) errors.push(`${CONTRACT_PATH}: rules.${key} must be true`);
}

const expectedSlotChecks = new Set([
  "target_form_visible",
  "required_validation_and_focus",
  "phone_boundary_validation",
  "phone_keyboard_and_autocomplete",
  "select_and_text_controls",
  "dry_run_submission",
  "analytics_event_sequence",
  "privacy_payload_check",
  "repeat_submit_integrity",
  "status_and_recovery"
]);
const slotChecks = Array.isArray(contract.slot_checks) ? contract.slot_checks : [];
const slotCheckIds = new Set(slotChecks.map((item) => item.id));
if (slotChecks.length !== 10) errors.push(`${CONTRACT_PATH}: expected 10 slot checks`);
exactSet(slotCheckIds, expectedSlotChecks, `${CONTRACT_PATH}: slot check ids`);
slotChecks.forEach((item) => {
  if (!String(item.acceptance || "").trim()) errors.push(`${CONTRACT_PATH}:${item.id}: acceptance is required`);
});

const expectedResilience = new Set(["local_storage_unavailable", "session_storage_unavailable"]);
const resilience = Array.isArray(contract.device_resilience_checks) ? contract.device_resilience_checks : [];
const resilienceIds = new Set(resilience.map((item) => item.id));
if (resilience.length !== 2) errors.push(`${CONTRACT_PATH}: expected 2 device resilience checks`);
exactSet(resilienceIds, expectedResilience, `${CONTRACT_PATH}: device resilience ids`);
resilience.forEach((item) => {
  if (item.run_once_per_device !== true) errors.push(`${CONTRACT_PATH}:${item.id}: run_once_per_device must be true`);
  if (!String(item.acceptance || "").trim()) errors.push(`${CONTRACT_PATH}:${item.id}: acceptance is required`);
});

const devices = Array.isArray(contract.required_devices) ? contract.required_devices : [];
exactSet(new Set(devices), new Set(["desktop", "android", "iphone"]), `${CONTRACT_PATH}: required devices`);
const scenarios = Array.isArray(matrix.scenarios) ? matrix.scenarios : [];
if (scenarios.length !== 14) errors.push(`${MATRIX_PATH}: expected 14 scenarios`);
if (scenarios.length * devices.length !== 42) errors.push(`${MATRIX_PATH}: expected 42 execution slots`);
if (resilience.length * devices.length !== 6) errors.push(`${CONTRACT_PATH}: expected 6 device resilience cases`);

if (matrix.test_parameters?.lead_test !== "dry-run" || matrix.test_parameters?.analytics_test !== "debug" || String(matrix.test_parameters?.test_ack) !== "1") {
  errors.push(`${MATRIX_PATH}: QA links must remain dry-run + debug + test_ack=1`);
}
if (matrix.rules?.real_submission_forbidden !== true) errors.push(`${MATRIX_PATH}: real_submission_forbidden must be true`);
if (results.rules?.personal_data_forbidden !== true) errors.push(`${RESULTS_PATH}: personal_data_forbidden must be true`);
if (results.rules?.missing_result_status !== "not_run") errors.push(`${RESULTS_PATH}: missing_result_status must be not_run`);

const requiredBuilderFragments = [
  'status: "execution_pack_only_no_implied_results"',
  'url.searchParams.set(key, String(value))',
  'url.hash = scenario.anchor',
  'status: result?.status || "not_run"',
  'required_checks: contract.slot_checks.map((item) => item.id)',
  'device_resilience_cases: contract.device_resilience_checks.length * devices.length',
  'Генерация этого файла не означает выполнение тестов'
];
requiredBuilderFragments.forEach((fragment) => {
  if (!builder.includes(fragment)) errors.push(`${BUILDER_PATH}: missing ${fragment}`);
});

for (const forbidden of [
  "localStorage.setItem",
  "sessionStorage.setItem",
  "fetch(",
  "navigator.userAgent",
  "name=",
  "phone=",
  "email="
]) {
  if (builder.includes(forbidden)) errors.push(`${BUILDER_PATH}: forbidden runtime or personal token ${forbidden}`);
}

const serialized = JSON.stringify(contract);
if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized)) errors.push(`${CONTRACT_PATH}: email address forbidden`);
if (/\+?7[\s()-]*\d{3}[\s()-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/.test(serialized)) errors.push(`${CONTRACT_PATH}: phone number forbidden`);

console.log(`QA scenarios: ${scenarios.length}`);
console.log(`QA devices: ${devices.length}`);
console.log(`Execution slots: ${scenarios.length * devices.length}`);
console.log(`Checks per slot: ${slotChecks.length}`);
console.log(`Device resilience cases: ${resilience.length * devices.length}`);
console.log(`Recorded results: ${Array.isArray(results.results) ? results.results.length : 0}`);

if (errors.length) {
  console.error("\nForm QA execution pack validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Form QA execution pack validation passed.");
