import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const artifactDir = path.resolve(process.argv[2] || "artifacts/form-browser-qa");
const summaryPath = path.join(artifactDir, "summary.json");
const eventsDir = path.join(artifactDir, "events");
const screenshotsDir = path.join(artifactDir, "screenshots");
const errors = [];
const REQUIRED_EVENTS = [
  "lead_form_view",
  "lead_form_start",
  "lead_submit",
  "lead_submit_classified",
  "lead_thankyou_view"
];
const STORAGE_EVENTS = [
  "lead_form_view",
  "lead_form_start",
  "lead_submit",
  "lead_submit_classified"
];
const PROHIBITED_KEYS = new Set([
  "name",
  "phone",
  "phone_normalized",
  "email",
  "budget",
  "comment",
  "question",
  "consent_text",
  "user_agent",
  "client_fixation_id",
  "fields_json",
  "message"
]);
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const PHONE_LIKE = /(?:^|\D)\+?\d[\d\s().-]{8,}\d(?:\D|$)/;
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[^\s@]+/i;
const NORMALIZED_PLACEMENT = /^[a-zа-яё0-9_-]{1,120}$/i;

function fail(message) {
  errors.push(message);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${path.relative(ROOT, file)}: invalid JSON: ${error.message}`);
    return null;
  }
}

function listFiles(dir, extension = "") {
  if (!fs.existsSync(dir)) {
    fail(`${path.relative(ROOT, dir)}: directory missing`);
    return [];
  }
  return fs.readdirSync(dir)
    .filter((file) => !extension || file.endsWith(extension))
    .sort();
}

function scanPrivacy(value, source, currentPath = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanPrivacy(item, source, `${currentPath}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = currentPath ? `${currentPath}.${key}` : key;
      if (PROHIBITED_KEYS.has(key)) fail(`${source}: prohibited key ${nextPath}`);
      scanPrivacy(nested, source, nextPath);
    }
    return;
  }

  if (typeof value !== "string" || ISO_TIMESTAMP.test(value)) return;
  if (PHONE_LIKE.test(value)) fail(`${source}: phone-like value at ${currentPath}`);
  if (EMAIL_LIKE.test(value)) fail(`${source}: email-like value at ${currentPath}`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertTrue(value, label) {
  if (!value) fail(label);
}

if (!fs.existsSync(summaryPath)) {
  console.error(`${path.relative(ROOT, summaryPath)}: file missing`);
  process.exit(1);
}

const summary = readJson(summaryPath);
if (!summary) process.exit(1);
scanPrivacy(summary, path.relative(ROOT, summaryPath));

assertEqual(summary.schema_version, "1.0", "summary.schema_version");
assertEqual(summary.target?.mode, "local_static", "target.mode");
assertEqual(summary.target?.device_profile, "desktop_chromium_emulation", "target.device_profile");
assertEqual(summary.target?.physical_device, false, "target.physical_device");
assertEqual(summary.safety?.dry_run_only, true, "safety.dry_run_only");
assertEqual(summary.safety?.analytics_debug_only, true, "safety.analytics_debug_only");
assertEqual(summary.safety?.real_submission_forbidden, true, "safety.real_submission_forbidden");
assertEqual(summary.safety?.lead_endpoint_requests_allowed, 0, "safety.lead_endpoint_requests_allowed");
assertEqual(summary.safety?.personal_data_in_artifacts_forbidden, true, "safety.personal_data_in_artifacts_forbidden");
assertEqual(summary.safety?.repository_results_modified, false, "safety.repository_results_modified");

assertEqual(summary.summary?.unique_scenarios, 14, "summary.unique_scenarios");
assertEqual(summary.summary?.scenario_runs, 15, "summary.scenario_runs");
assertEqual(summary.summary?.scenario_passed, 15, "summary.scenario_passed");
assertEqual(summary.summary?.scenario_failed, 0, "summary.scenario_failed");
assertEqual(summary.summary?.aerodromnaya_detailed_runs, 2, "summary.aerodromnaya_detailed_runs");
assertEqual(summary.summary?.storage_checks, 2, "summary.storage_checks");
assertEqual(summary.summary?.storage_passed, 2, "summary.storage_passed");
assertEqual(summary.summary?.storage_failed, 0, "summary.storage_failed");

const scenarioResults = Array.isArray(summary.scenario_results) ? summary.scenario_results : [];
const storageResults = Array.isArray(summary.storage_results) ? summary.storage_results : [];
assertEqual(scenarioResults.length, 15, "scenario_results.length");
assertEqual(storageResults.length, 2, "storage_results.length");

for (const result of scenarioResults) {
  const label = `scenario ${result.scenario_id || "unknown"} iteration ${result.iteration || "?"}`;
  assertEqual(result.status, "passed", `${label}.status`);
  assertEqual(result.network?.lead_endpoint_requests, 0, `${label}.lead_endpoint_requests`);
  assertEqual(result.network?.external_data_requests, 0, `${label}.external_data_requests`);
  assertEqual((result.runtime_errors?.console || []).length, 0, `${label}.console_errors`);
  assertEqual((result.runtime_errors?.page || []).length, 0, `${label}.page_errors`);
  assertEqual(result.event_counts?.lead_form_view, 1, `${label}.lead_form_view`);
  assertEqual(result.event_counts?.lead_form_start, 1, `${label}.lead_form_start`);
  assertEqual(result.event_counts?.lead_submit, 1, `${label}.lead_submit`);
  assertEqual(result.event_counts?.lead_submit_classified, 1, `${label}.lead_submit_classified`);
  assertEqual(result.event_counts?.lead_thankyou_view, 1, `${label}.lead_thankyou_view`);
  assertTrue(result.checks && Object.values(result.checks).every(Boolean), `${label}: not all checks passed`);
}

for (const result of storageResults) {
  const label = `storage ${result.mode || "unknown"}`;
  assertEqual(result.status, "passed", `${label}.status`);
  assertTrue(result.checks && Object.values(result.checks).every(Boolean), `${label}: not all checks passed`);
}

const eventFiles = listFiles(eventsDir, ".json");
const screenshotFiles = listFiles(screenshotsDir, ".png");
assertEqual(eventFiles.length, 17, "event file count");
assertEqual(screenshotFiles.length, 17, "screenshot file count");
assertTrue(!eventFiles.some((file) => file.includes("failed")), "failed event artifact present");
assertTrue(!screenshotFiles.some((file) => file.includes("failed")), "failed screenshot artifact present");

for (const file of eventFiles) {
  const fullPath = path.join(eventsDir, file);
  const events = readJson(fullPath);
  if (!events) continue;
  const source = path.relative(ROOT, fullPath);
  scanPrivacy(events, source);
  assertTrue(Array.isArray(events), `${source}: event log must be an array`);
  if (!Array.isArray(events)) continue;

  const storageFile = file.startsWith("storage-");
  const required = storageFile ? STORAGE_EVENTS : REQUIRED_EVENTS;
  for (const eventName of required) {
    assertEqual(events.filter((event) => event?.event === eventName).length, 1, `${source}:${eventName}`);
  }
  if (storageFile) {
    assertEqual(events.filter((event) => event?.event === "lead_thankyou_view").length, 0, `${source}:lead_thankyou_view`);
  }

  for (const event of events.filter((item) => required.includes(item?.event))) {
    assertTrue(Boolean(event.form_id), `${source}:${event.event}: form_id missing`);
    assertTrue(["primary", "detailed"].includes(event.form_role), `${source}:${event.event}: form_role invalid`);
    assertTrue(Boolean(event.lead_type), `${source}:${event.event}: lead_type missing`);
    assertTrue(Boolean(event.object_id), `${source}:${event.event}: object_id missing`);
    assertTrue(NORMALIZED_PLACEMENT.test(String(event.placement || "")), `${source}:${event.event}: placement invalid`);
  }
}

const allFiles = [];
for (const directory of [artifactDir, eventsDir, screenshotsDir]) {
  if (!fs.existsSync(directory)) continue;
}
function collectFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(fullPath);
    else allFiles.push(fullPath);
  }
}
collectFiles(artifactDir);
assertEqual(allFiles.length, 35, "artifact file count");

console.log(`Checked browser QA artifact files: ${allFiles.length}`);
console.log(`Scenario runs: ${summary.summary?.scenario_passed || 0}/${summary.summary?.scenario_runs || 0}`);
console.log(`Storage checks: ${summary.summary?.storage_passed || 0}/${summary.summary?.storage_checks || 0}`);
console.log("Endpoint requests: 0; external data requests: 0");
console.log("Runtime console/page errors: 0; privacy violations: 0");

if (errors.length) {
  console.error("\nBrowser QA artifact validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Browser QA artifact validation passed.");
