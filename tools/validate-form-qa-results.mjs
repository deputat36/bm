import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MATRIX_PATH = "data/qa/form-scenarios.json";
const RESULTS_PATH = "data/qa/form-results.json";
const FORBIDDEN_KEYS = new Set([
  "name",
  "phone",
  "phone_normalized",
  "email",
  "test_name",
  "test_phone",
  "client_fixation_id",
  "fields_json",
  "message",
  "user_agent"
]);
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

function requireText(item, field, label) {
  const value = String(item?.[field] || "").trim();
  if (!value) errors.push(`${label}: missing ${field}`);
  return value;
}

function isIsoDate(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === text;
}

function scanForbiddenKeys(value, label, trail = []) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const nextTrail = [...trail, key];
    if (FORBIDDEN_KEYS.has(key)) {
      errors.push(`${label}: forbidden personal or technical field ${nextTrail.join(".")}`);
    }
    scanForbiddenKeys(child, label, nextTrail);
  }
}

const matrix = readJson(MATRIX_PATH);
const resultsFile = readJson(RESULTS_PATH);
const scenarios = Array.isArray(matrix?.scenarios) ? matrix.scenarios : [];
const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
const devices = Array.isArray(matrix?.rules?.expected_devices) ? matrix.rules.expected_devices : [];
const deviceSet = new Set(devices);
const expectedSlots = scenarios.length * devices.length;
const results = Array.isArray(resultsFile?.results) ? resultsFile.results : [];
const allowedStatuses = new Set(resultsFile?.rules?.allowed_statuses || []);
const seen = new Set();
const statusCounts = { passed: 0, failed: 0, blocked: 0 };

if (!matrix || !scenarios.length) {
  errors.push(`${MATRIX_PATH}: scenarios must be a non-empty array`);
}
if (!resultsFile || !Array.isArray(resultsFile.results)) {
  errors.push(`${RESULTS_PATH}: results must be an array`);
} else {
  if (resultsFile.portal_id !== "newbuilds-borisoglebsk") {
    errors.push(`${RESULTS_PATH}: invalid portal_id`);
  }
  if (resultsFile.source_matrix !== MATRIX_PATH) {
    errors.push(`${RESULTS_PATH}: source_matrix must be ${MATRIX_PATH}`);
  }
  if (resultsFile.rules?.missing_result_status !== "not_run") {
    errors.push(`${RESULTS_PATH}: missing_result_status must be not_run`);
  }
  if (resultsFile.rules?.personal_data_forbidden !== true) {
    errors.push(`${RESULTS_PATH}: personal_data_forbidden must be true`);
  }
  ["passed", "failed", "blocked"].forEach((status) => {
    if (!allowedStatuses.has(status)) errors.push(`${RESULTS_PATH}: allowed_statuses missing ${status}`);
  });
  if (allowedStatuses.has("not_run")) {
    errors.push(`${RESULTS_PATH}: not_run must be represented by a missing result, not a stored record`);
  }

  const resultDevices = resultsFile.rules?.expected_devices || [];
  devices.forEach((device) => {
    if (!resultDevices.includes(device)) errors.push(`${RESULTS_PATH}: expected_devices missing ${device}`);
  });

  scanForbiddenKeys(resultsFile, RESULTS_PATH);

  results.forEach((result, index) => {
    const label = `${RESULTS_PATH}#${index + 1}`;
    const scenarioId = requireText(result, "scenario_id", label);
    const device = requireText(result, "device", label);
    const status = requireText(result, "status", label);
    const testedAt = requireText(result, "tested_at", label);
    const browser = requireText(result, "browser", label);
    const os = requireText(result, "os", label);
    const key = `${scenarioId}__${device}`;

    if (!scenarioIds.has(scenarioId)) errors.push(`${label}: unknown scenario_id=${scenarioId}`);
    if (!deviceSet.has(device)) errors.push(`${label}: unsupported device=${device}`);
    if (!allowedStatuses.has(status)) errors.push(`${label}: unsupported status=${status}`);
    if (seen.has(key)) errors.push(`${label}: duplicate scenario/device pair ${key}`);
    seen.add(key);

    if (testedAt && !isIsoDate(testedAt)) {
      errors.push(`${label}: tested_at must be an exact ISO datetime`);
    }

    if (status in statusCounts) statusCounts[status] += 1;

    const evidence = String(result?.evidence_reference || "").trim();
    const notes = String(result?.notes || "").trim();
    const eventLogAttached = result?.event_log_attached === true;

    if (status === "passed") {
      if (!evidence) errors.push(`${label}: passed result requires evidence_reference`);
      if (!eventLogAttached) errors.push(`${label}: passed result requires event_log_attached=true`);
    }
    if ((status === "failed" || status === "blocked") && !notes) {
      errors.push(`${label}: ${status} result requires notes`);
    }

    if (browser.length > 80 || os.length > 80 || evidence.length > 300 || notes.length > 1000) {
      errors.push(`${label}: text field exceeds the allowed length`);
    }
  });
}

const notRun = Math.max(0, expectedSlots - seen.size);
console.log(`Expected QA result slots: ${expectedSlots}`);
console.log(`Recorded QA results: ${seen.size}`);
console.log(`Not run: ${notRun}`);
console.log(`Passed: ${statusCounts.passed}`);
console.log(`Failed: ${statusCounts.failed}`);
console.log(`Blocked: ${statusCounts.blocked}`);

if (expectedSlots !== 42) {
  errors.push(`${MATRIX_PATH}: expected scenario/device matrix must contain 42 slots, found ${expectedSlots}`);
}
if (seen.size > expectedSlots) {
  errors.push(`${RESULTS_PATH}: recorded results exceed expected slots`);
}

if (errors.length) {
  console.error("\nForm QA result validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Form QA result validation passed.");
