import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BUILDER_PATH = "tools/build-launch-readiness-report.mjs";
const APPROVAL_PATH = "data/operations/lead-operations-approval.json";
const errors = [];

function read(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
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

const builder = read(BUILDER_PATH);
const approval = readJson(APPROVAL_PATH);
if (!builder || !approval) process.exit(1);

[
  'leadOperationsApproval: "data/operations/lead-operations-approval.json"',
  'id: "lead_operations_approval"',
  'scope: "campaign_launch"',
  '"lead_operations_approval",',
  'lead_operations: {'
].forEach((fragment) => {
  if (!builder.includes(fragment)) errors.push(`${BUILDER_PATH}: missing ${fragment}`);
});

const decisions = Array.isArray(approval.decisions) ? approval.decisions : [];
const approved = decisions.filter((item) => item.status === "approved").length;
const pending = decisions.filter((item) => item.status === "requires_owner_decision").length;
const activationEnabled = approval.rules?.operational_activation_enabled === true;

if (decisions.length !== 8) errors.push(`${APPROVAL_PATH}: expected 8 decisions`);
if (approved !== 0) errors.push(`${APPROVAL_PATH}: current baseline must have 0 approved decisions`);
if (pending !== 8) errors.push(`${APPROVAL_PATH}: current baseline must have 8 pending decisions`);
if (activationEnabled) errors.push(`${APPROVAL_PATH}: operational activation must remain disabled`);

const result = spawnSync(process.execPath, [BUILDER_PATH, "--format=json"], {
  cwd: ROOT,
  encoding: "utf8"
});
if (result.status !== 0) {
  errors.push(`${BUILDER_PATH}: failed to generate JSON report: ${result.stderr || result.stdout}`);
} else {
  try {
    const report = JSON.parse(result.stdout);
    const gate = (report.gates || []).find((item) => item.id === "lead_operations_approval");
    const campaign = (report.profiles || []).find((item) => item.id === "campaign_launch");

    if (!gate) errors.push("launch report: lead_operations_approval gate is missing");
    if (gate?.status !== "blocked") errors.push("launch report: lead_operations_approval must be blocked");
    if (gate?.evidence_count !== 0) errors.push("launch report: operations evidence_count must be 0");
    if (!campaign?.required_gates?.includes("lead_operations_approval")) {
      errors.push("launch report: campaign_launch must require lead_operations_approval");
    }
    if (!campaign?.blocked_gates?.includes("lead_operations_approval")) {
      errors.push("launch report: campaign_launch must be blocked by lead_operations_approval");
    }
    if (report.summary?.total_gates !== 12) errors.push("launch report: total_gates must be 12");
    if (report.summary?.passed !== 1) errors.push("launch report: passed gates must remain 1");
    if (report.summary?.blocked !== 11) errors.push("launch report: blocked gates must be 11");
    if (report.summary?.total_profiles !== 4) errors.push("launch report: total_profiles must be 4");
    if (report.summary?.ready_profiles !== 0) errors.push("launch report: ready_profiles must remain 0");
    if (report.metrics?.lead_operations?.total_decisions !== 8) errors.push("launch report: total operations decisions must be 8");
    if (report.metrics?.lead_operations?.approved !== 0) errors.push("launch report: approved operations decisions must be 0");
    if (report.metrics?.lead_operations?.pending !== 8) errors.push("launch report: pending operations decisions must be 8");
    if (report.metrics?.lead_operations?.activation_enabled !== false) errors.push("launch report: operations activation must be false");
    if (report.metrics?.lead_operations?.ready !== false) errors.push("launch report: operations ready must be false");
  } catch (error) {
    errors.push(`${BUILDER_PATH}: generated invalid JSON: ${error.message}`);
  }
}

console.log(`Operations decisions: ${decisions.length}`);
console.log(`Approved operations decisions: ${approved}`);
console.log(`Pending operations decisions: ${pending}`);
console.log(`Operational activation enabled: ${activationEnabled}`);

if (errors.length) {
  console.error("\nLaunch operations gate validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Launch operations gate validation passed.");
