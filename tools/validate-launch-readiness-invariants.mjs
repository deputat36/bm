import fs from "node:fs";
import { execFileSync } from "node:child_process";

const RESULTS_PATH = "data/qa/form-results.json";
const SCENARIOS_PATH = "data/qa/form-scenarios.json";
const MOBILE_POLICY_PATH = "data/qa/mobile-release-policy.json";
const PACKAGE_PATH = "package.json";
const WORKFLOW_PATH = ".github/workflows/form-qa-execution-pack-guard.yml";
const BUILDER_PATH = "tools/build-launch-readiness-report.mjs";
const errors = [];
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const resultsFile = readJson(RESULTS_PATH);
const scenariosFile = readJson(SCENARIOS_PATH);
const mobilePolicy = readJson(MOBILE_POLICY_PATH);
const packageFile = readJson(PACKAGE_PATH);
const launchReadinessCommand = String(packageFile.scripts?.["validate:launch-readiness"] || "");
const workflowSource = fs.readFileSync(WORKFLOW_PATH, "utf8");

function validateCounts(label, counts) {
  const keys = ["passed", "failed", "blocked", "not_run"];
  for (const key of keys) {
    if (!Number.isInteger(counts[key]) || counts[key] < 0) errors.push(`${label}: invalid ${key}`);
  }
  const total = keys.reduce((sum, key) => sum + counts[key], 0);
  if (total !== 42) errors.push(`${label}: statuses must sum to 42, found ${total}`);
}

const scenarios = Array.isArray(scenariosFile.scenarios) ? scenariosFile.scenarios : [];
const devices = Array.isArray(resultsFile.rules?.expected_devices) ? resultsFile.rules.expected_devices : [];
const results = Array.isArray(resultsFile.results) ? resultsFile.results : [];
const expectedSlots = scenarios.length * devices.length;
if (scenarios.length !== 14) errors.push(`expected 14 scenarios, found ${scenarios.length}`);
if (devices.length !== 3) errors.push(`expected 3 devices, found ${devices.length}`);
if (expectedSlots !== 42) errors.push(`expected 42 slots, found ${expectedSlots}`);

const current = {
  passed: results.filter((item) => item.status === "passed").length,
  failed: results.filter((item) => item.status === "failed").length,
  blocked: results.filter((item) => item.status === "blocked").length,
  not_run: expectedSlots - results.length
};
validateCounts("current matrix", current);
validateCounts("required evidence matrix", { passed: 0, failed: 14, blocked: 28, not_run: 0 });
validateCounts("fully successful matrix", { passed: 42, failed: 0, blocked: 0, not_run: 0 });

if (!launchReadinessCommand) errors.push(`${PACKAGE_PATH}: validate:launch-readiness command is missing`);
const forbiddenLocks = [
  "recorded_results!==0",
  "by_status?.not_run!==42",
  "metrics?.form_qa?.not_run!==42",
  "summary?.passed!==1",
  "summary?.blocked!==11"
];
for (const fragment of forbiddenLocks) {
  if (launchReadinessCommand.includes(fragment)) errors.push(`${PACKAGE_PATH}: validate:launch-readiness state lock remains: ${fragment}`);
  if (workflowSource.includes(fragment)) errors.push(`${WORKFLOW_PATH}: state lock remains: ${fragment}`);
}

try {
  const report = JSON.parse(execFileSync(process.execPath, [BUILDER_PATH, "--format=json"], { encoding: "utf8" }));
  const gates = Array.isArray(report.gates) ? report.gates : [];
  const profiles = Array.isArray(report.profiles) ? report.profiles : [];
  if (!gates.length || report.summary?.total_gates !== gates.length) errors.push("launch report gate count is inconsistent");
  const gateStatusTotal = ["passed", "blocked", "in_review", "not_applicable"].reduce((sum, key) => sum + Number(report.summary?.[key] || 0), 0);
  if (gateStatusTotal !== gates.length) errors.push("launch report gate status counts are inconsistent");
  if (report.summary?.total_profiles !== profiles.length) errors.push("launch report profile count is inconsistent");

  const qa = report.metrics?.form_qa || {};
  validateCounts("launch report form_qa", qa);
  if (qa.expected_slots !== 42) errors.push("launch report form_qa expected_slots must be 42");
  if (qa.passed !== current.passed || qa.failed !== current.failed || qa.blocked !== current.blocked || qa.not_run !== current.not_run) {
    errors.push("mobile policy must not alter historical form_qa counts");
  }

  const mobileGate = gates.find((item) => item.id === "mobile_qa_release_policy");
  const campaign = profiles.find((item) => item.id === "campaign_launch");
  const mobileMetrics = report.metrics?.mobile_qa_policy || {};
  if (!mobileGate) errors.push("mobile_qa_release_policy gate is missing");
  if (!campaign?.required_gates?.includes("mobile_qa_release_policy")) errors.push("campaign_launch must require mobile_qa_release_policy");
  if (mobileMetrics.status !== mobilePolicy.status) errors.push("mobile QA policy metric status mismatch");
  if (mobileMetrics.decision !== (mobilePolicy.decision?.value || null)) errors.push("mobile QA policy metric decision mismatch");
  if (mobileMetrics.physical_device_evidence !== 0) errors.push("current mobile QA policy must not claim physical device evidence");
  if (mobileMetrics.emulation_profiles !== 2) errors.push("current mobile QA evidence must identify two emulation profiles");

  if (mobilePolicy.status === "requires_owner_decision") {
    if (mobileGate?.status !== "blocked") errors.push("pending mobile QA policy must produce blocked gate");
    if (mobileMetrics.resolved !== false) errors.push("pending mobile QA policy must not be resolved");
    if (!campaign?.blocked_gates?.includes("mobile_qa_release_policy")) errors.push("campaign_launch must expose pending mobile QA policy blocker");
  } else if (mobilePolicy.status === "approved") {
    if (mobileGate?.status !== "passed") errors.push("valid approved mobile QA policy must produce passed policy gate");
    if (mobileMetrics.resolved !== true) errors.push("approved mobile QA policy must be resolved");
  } else {
    errors.push(`unsupported mobile QA policy status: ${mobilePolicy.status}`);
  }
} catch (error) {
  errors.push(`${BUILDER_PATH}: ${error.message}`);
}

if (errors.length) {
  console.error("Launch readiness invariant validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`Launch readiness invariants passed: current=${current.passed}/${current.failed}/${current.blocked}/${current.not_run}; total=42; mobile_policy=${mobilePolicy.status}.`);
