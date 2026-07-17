import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HTML_PATH = "tools/form-qa-runner.html";
const JS_PATH = "assets/js/form-qa-runner.js";
const CSS_PATH = "assets/css/form-qa-runner.css";
const MATRIX_PATH = "data/qa/form-scenarios.json";
const CONTRACT_PATH = "data/qa/form-execution-contract.json";
const RESULTS_PATH = "data/qa/form-results.json";
const ROBOTS_PATH = "robots.txt";
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

function requireFragment(content, fragment, label) {
  if (!content.includes(fragment)) errors.push(`${label}: missing required fragment ${fragment}`);
}

function forbidFragment(content, fragment, label) {
  if (content.includes(fragment)) errors.push(`${label}: forbidden fragment ${fragment}`);
}

const html = read(HTML_PATH);
const script = read(JS_PATH);
const styles = read(CSS_PATH);
const robots = read(ROBOTS_PATH);
const matrix = readJson(MATRIX_PATH);
const contract = readJson(CONTRACT_PATH);
const results = readJson(RESULTS_PATH);

if (html) {
  [
    '<meta name="robots" content="noindex,nofollow,noarchive">',
    'data-qa-device',
    'data-qa-browser',
    'data-qa-os',
    'data-qa-export-results',
    'data-qa-export-evidence',
    'data-qa-scenarios',
    'data-qa-resilience',
    '../assets/js/page-accessibility.js',
    '../assets/js/form-qa-runner.js',
    '../assets/css/form-qa-runner.css',
    'реальные заявки не отправляются',
    'Персональные данные вводить запрещено'
  ].forEach((fragment) => requireFragment(html, fragment, HTML_PATH));

  [
    'assets/js/main.js',
    'assets/js/schema.js',
    'data-lead-form',
    'name="phone"',
    'name="email"',
    'name="name"'
  ].forEach((fragment) => forbidFragment(html, fragment, HTML_PATH));
}

if (script) {
  [
    'const MATRIX_URL = "../data/qa/form-scenarios.json";',
    'const CONTRACT_URL = "../data/qa/form-execution-contract.json";',
    'const RESULTS_URL = "../data/qa/form-results.json";',
    'newbuildsBorisoglebskFormQaRunnerV1',
    'matrix.test_parameters',
    'url.searchParams.set',
    'url.hash = scenario.anchor',
    'matrix.rules?.real_submission_forbidden !== true',
    'contract.rules?.external_delivery_forbidden !== true',
    'matrix.scenarios.length !== 14',
    'contract.slot_checks.length !== 10',
    'contract.required_devices.length !== 3',
    'allChecksPassed(slot)',
    'slot.event_log_attached',
    'slot.evidence_reference',
    'status: "local_evidence_export_no_implied_approval"',
    'personal_data_forbidden: true',
    'downloadJson("form-results.json"',
    'downloadJson("form-qa-evidence.json"',
    'EMAIL_PATTERN',
    'PHONE_PATTERN',
    'credentials: "same-origin"',
    'cache: "no-store"'
  ].forEach((fragment) => requireFragment(script, fragment, JS_PATH));

  [
    'api.web3forms.com',
    'WEB3FORMS_ACCESS_KEY',
    'sendBeacon(',
    'method: "POST"',
    'method: \'POST\'',
    'navigator.userAgent',
    'client_fixation_id',
    'localStorage.setItem("newbuildsBorisoglebskLastLead"'
  ].forEach((fragment) => forbidFragment(script, fragment, JS_PATH));
}

if (styles) {
  [
    '.qa-controls',
    '.qa-summary',
    '.qa-scenario',
    '.qa-checklist',
    '.qa-result-panel',
    '@media (max-width: 900px)',
    '@media (max-width: 560px)'
  ].forEach((fragment) => requireFragment(styles, fragment, CSS_PATH));
}

if (!robots.includes("Disallow: /tools/")) {
  errors.push(`${ROBOTS_PATH}: /tools/ must remain disallowed`);
}
if (!robots.includes("Disallow: /data/")) {
  errors.push(`${ROBOTS_PATH}: /data/ must remain disallowed`);
}

const scenarios = Array.isArray(matrix?.scenarios) ? matrix.scenarios : [];
const devices = Array.isArray(contract?.required_devices) ? contract.required_devices : [];
const slotChecks = Array.isArray(contract?.slot_checks) ? contract.slot_checks : [];
const resilienceChecks = Array.isArray(contract?.device_resilience_checks) ? contract.device_resilience_checks : [];

if (matrix?.portal_id !== "newbuilds-borisoglebsk") errors.push(`${MATRIX_PATH}: invalid portal_id`);
if (contract?.portal_id !== "newbuilds-borisoglebsk") errors.push(`${CONTRACT_PATH}: invalid portal_id`);
if (results?.portal_id !== "newbuilds-borisoglebsk") errors.push(`${RESULTS_PATH}: invalid portal_id`);
if (scenarios.length !== 14) errors.push(`${MATRIX_PATH}: expected 14 scenarios, found ${scenarios.length}`);
if (devices.length !== 3) errors.push(`${CONTRACT_PATH}: expected 3 devices, found ${devices.length}`);
if (slotChecks.length !== 10) errors.push(`${CONTRACT_PATH}: expected 10 slot checks, found ${slotChecks.length}`);
if (resilienceChecks.length !== 2) errors.push(`${CONTRACT_PATH}: expected 2 resilience checks, found ${resilienceChecks.length}`);
if (scenarios.length * devices.length !== 42) errors.push("QA matrix must contain exactly 42 device/scenario slots");

if (matrix?.rules?.real_submission_forbidden !== true) {
  errors.push(`${MATRIX_PATH}: real_submission_forbidden must be true`);
}
if (contract?.rules?.external_delivery_forbidden !== true) {
  errors.push(`${CONTRACT_PATH}: external_delivery_forbidden must be true`);
}
if (contract?.rules?.personal_data_in_evidence_forbidden !== true) {
  errors.push(`${CONTRACT_PATH}: personal_data_in_evidence_forbidden must be true`);
}
if (results?.rules?.personal_data_forbidden !== true) {
  errors.push(`${RESULTS_PATH}: personal_data_forbidden must be true`);
}

const testParameters = matrix?.test_parameters || {};
if (testParameters.lead_test !== "dry-run" || testParameters.analytics_test !== "debug" || testParameters.test_ack !== "1") {
  errors.push(`${MATRIX_PATH}: test parameters must enforce dry-run analytics debug mode`);
}

const scenarioIds = new Set();
const formIds = new Set();
scenarios.forEach((scenario, index) => {
  const label = `${MATRIX_PATH}#${index + 1}`;
  if (!scenario.id || scenarioIds.has(scenario.id)) errors.push(`${label}: missing or duplicate scenario id`);
  if (!scenario.form_id || formIds.has(scenario.form_id)) errors.push(`${label}: missing or duplicate form_id`);
  if (!scenario.anchor || !["quick-lead", "lead"].includes(scenario.anchor)) errors.push(`${label}: invalid anchor`);
  scenarioIds.add(scenario.id);
  formIds.add(scenario.form_id);
});

console.log(`QA runner scenarios: ${scenarios.length}`);
console.log(`QA runner devices: ${devices.length}`);
console.log(`QA runner slots: ${scenarios.length * devices.length}`);
console.log(`QA runner checks per slot: ${slotChecks.length}`);
console.log(`QA runner resilience checks per device: ${resilienceChecks.length}`);

if (errors.length) {
  console.error("\nForm QA runner validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nForm QA runner validation passed.");
