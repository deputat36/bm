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
const rejected = decisions.filter((item) => item.status === "rejected").length;
const superseded = decisions.filter((item) => item.status === "superseded").length;
const activationEnabled = approval.rules?.operational_activation_enabled === true;
const systemOfRecord = decisions.find((item) => item.id === "system_of_record");
const allApproved = decisions.length === 8 && approved === decisions.length && pending === 0 && rejected === 0 && superseded === 0;
const operationsReady = allApproved && activationEnabled;
const expectedGateStatus = operationsReady ? "passed" : "blocked";

if (decisions.length !== 8) errors.push(`${APPROVAL_PATH}: expected 8 decisions`);
if (approved + pending + rejected + superseded !== decisions.length) errors.push(`${APPROVAL_PATH}: decision status counts must sum to ${decisions.length}`);
if (systemOfRecord?.status !== "approved" || systemOfRecord?.approved_value !== "supabase:newbuild_leads") {
  errors.push(`${APPROVAL_PATH}: system_of_record must remain approved as supabase:newbuild_leads`);
}
if (activationEnabled && !allApproved) errors.push(`${APPROVAL_PATH}: activation cannot be enabled before all 8 decisions are approved`);

const result = spawnSync(process.execPath, [BUILDER_PATH, "--format=json"], {
  cwd: ROOT,
  encoding: "utf8"
});
if (result.status !== 0) {
  errors.push(`${BUILDER_PATH}: failed to generate JSON report: ${result.stderr || result.stdout}`);
} else {
  try {
    const report = JSON.parse(result.stdout);
    const gates = Array.isArray(report.gates) ? report.gates : [];
    const gate = gates.find((item) => item.id === "lead_operations_approval");
    const campaign = (report.profiles || []).find((item) => item.id === "campaign_launch");
    const metrics = report.metrics?.lead_operations || {};

    if (!gate) errors.push("launch report: lead_operations_approval gate is missing");
    if (gate?.status !== expectedGateStatus) errors.push(`launch report: lead_operations_approval must be ${expectedGateStatus}`);
    if (gate?.evidence_count !== approved) errors.push(`launch report: operations evidence_count must equal approved decisions (${approved})`);
    if (!campaign?.required_gates?.includes("lead_operations_approval")) {
      errors.push("launch report: campaign_launch must require lead_operations_approval");
    }
    if (operationsReady) {
      if (!campaign?.passed_gates?.includes("lead_operations_approval")) errors.push("launch report: ready operations gate must appear in campaign passed_gates");
      if (campaign?.blocked_gates?.includes("lead_operations_approval")) errors.push("launch report: ready operations gate must not remain blocked");
    } else {
      if (!campaign?.blocked_gates?.includes("lead_operations_approval")) errors.push("launch report: unresolved operations must block campaign_launch");
    }

    if (report.summary?.total_gates !== gates.length) errors.push("launch report: total_gates must match generated gate count");
    const gateStatusTotal = ["passed", "blocked", "in_review", "not_applicable"].reduce((sum, key) => sum + Number(report.summary?.[key] || 0), 0);
    if (gateStatusTotal !== report.summary?.total_gates) errors.push("gate status counts must match total_gates");
    if (report.summary?.total_profiles !== (report.profiles || []).length) errors.push("launch report: total_profiles must match generated profiles");

    if (metrics.total_decisions !== decisions.length) errors.push(`launch report: total operations decisions must be ${decisions.length}`);
    if (metrics.approved !== approved) errors.push(`launch report: approved operations decisions must be ${approved}`);
    if (metrics.pending !== pending) errors.push(`launch report: pending operations decisions must be ${pending}`);
    if (metrics.rejected !== rejected) errors.push(`launch report: rejected operations decisions must be ${rejected}`);
    if (metrics.superseded !== superseded) errors.push(`launch report: superseded operations decisions must be ${superseded}`);
    if (metrics.activation_enabled !== activationEnabled) errors.push(`launch report: activation_enabled must be ${activationEnabled}`);
    if (metrics.ready !== operationsReady) errors.push(`launch report: operations ready must be ${operationsReady}`);
  } catch (error) {
    errors.push(`${BUILDER_PATH}: generated invalid JSON: ${error.message}`);
  }
}

console.log(`Operations decisions: ${decisions.length}`);
console.log(`Approved operations decisions: ${approved}`);
console.log(`Pending operations decisions: ${pending}`);
console.log(`Rejected operations decisions: ${rejected}`);
console.log(`Superseded operations decisions: ${superseded}`);
console.log(`System of record: ${systemOfRecord?.approved_value || "missing"}`);
console.log(`Operational activation enabled: ${activationEnabled}`);
console.log(`Operations readiness: ${operationsReady}`);

if (errors.length) {
  console.error("\nLaunch operations gate validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Launch operations gate validation passed.");
