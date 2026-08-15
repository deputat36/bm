import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const BM_PATH = "data/legal/bm-group-advertising-contract.json";
const MOBILE_QA_PATH = "data/qa/mobile-release-policy.json";
const OPERATIONS_PATH = "data/operations/lead-operations-approval.json";
const output = execFileSync(process.execPath, ["tools/build-owner-release-blockers.mjs", "--format=json"], {
  encoding: "utf8"
});
const data = JSON.parse(output);
const bm = JSON.parse(fs.readFileSync(path.join(ROOT, BM_PATH), "utf8"));
const mobileQa = JSON.parse(fs.readFileSync(path.join(ROOT, MOBILE_QA_PATH), "utf8"));
const operations = JSON.parse(fs.readFileSync(path.join(ROOT, OPERATIONS_PATH), "utf8"));
const errors = [];

if (data.schema_version !== "1.3") errors.push("schema_version must be 1.3");
if (data.portal_id !== "newbuilds-borisoglebsk") errors.push("portal_id mismatch");
if (!Array.isArray(data.decisions)) errors.push("decisions must be array");
if (!Array.isArray(data.conditional_blockers)) errors.push("conditional_blockers must be array");

const decisions = Array.isArray(data.decisions) ? data.decisions : [];
const conditional = Array.isArray(data.conditional_blockers) ? data.conditional_blockers : [];
const groups = new Set(["legal", "operations", "qa", "analytics", "real_lead", "campaign"]);
const ids = new Set();
for (const item of decisions) {
  if (!groups.has(item.group)) errors.push(`${item.id}: unsupported group=${item.group}`);
  if (!item.id || ids.has(item.id)) errors.push(`${item.id || "unknown"}: duplicate or missing id`);
  ids.add(item.id);
  if (!String(item.title || "").trim()) errors.push(`${item.id}: title missing`);
  if (!String(item.question || "").trim()) errors.push(`${item.id}: question missing`);
  if (!String(item.decision_status || "").trim()) errors.push(`${item.id}: decision_status missing`);
  if (!String(item.source || "").startsWith("data/")) errors.push(`${item.id}: source must be data/*`);
  if (typeof item.secure_value_required !== "boolean") errors.push(`${item.id}: secure_value_required must be boolean`);
}

for (const item of conditional) {
  if (item.group !== "external_approval") errors.push(`${item.id}: conditional group must be external_approval`);
  if (!item.id || ids.has(item.id)) errors.push(`${item.id || "unknown"}: duplicate or missing id across blocker sets`);
  ids.add(item.id);
  if (!String(item.title || "").trim()) errors.push(`${item.id}: title missing`);
  if (!String(item.question || "").trim()) errors.push(`${item.id}: question missing`);
  if (!String(item.decision_status || "").trim()) errors.push(`${item.id}: decision_status missing`);
  if (!String(item.source || "").startsWith("data/")) errors.push(`${item.id}: source must be data/*`);
  if (typeof item.secure_value_required !== "boolean") errors.push(`${item.id}: secure_value_required must be boolean`);
  if (item.blocks_global_release !== false) errors.push(`${item.id}: conditional blocker must not block global release`);
  if (!String(item.scope || "").trim()) errors.push(`${item.id}: conditional scope missing`);
  if (!String(item.blocking_effect || "").trim()) errors.push(`${item.id}: blocking_effect missing`);
}

const operationsDecisions = Array.isArray(operations.decisions) ? operations.decisions : [];
const operationsCounts = {
  approved: operationsDecisions.filter((item) => item.status === "approved").length,
  pending: operationsDecisions.filter((item) => item.status === "requires_owner_decision").length,
  rejected: operationsDecisions.filter((item) => item.status === "rejected").length,
  superseded: operationsDecisions.filter((item) => item.status === "superseded").length
};
const operationsUnresolved = operationsDecisions.filter((item) => item.status !== "approved");
const allOperationsApproved = operationsDecisions.length === 8 && operationsCounts.approved === 8;
const activationEnabled = operations.rules?.operational_activation_enabled === true;
const activationRequired = allOperationsApproved && !activationEnabled;
const operationsReportItems = decisions.filter((item) => item.group === "operations");
const activationDecision = decisions.find((item) => item.id === "operational_activation_approval");

for (const sourceDecision of operationsUnresolved) {
  const item = decisions.find((candidate) => candidate.id === sourceDecision.id);
  if (!item) errors.push(`non-approved operations decision must remain visible: ${sourceDecision.id}`);
  else {
    if (item.group !== "operations" || item.source !== OPERATIONS_PATH) errors.push(`${sourceDecision.id}: operations blocker source/group mismatch`);
    if (item.decision_status !== sourceDecision.status) errors.push(`${sourceDecision.id}: decision_status must match operations registry`);
  }
}
for (const sourceDecision of operationsDecisions.filter((item) => item.status === "approved")) {
  if (decisions.some((candidate) => candidate.id === sourceDecision.id)) errors.push(`approved operations decision must not remain owner blocker: ${sourceDecision.id}`);
}
if (activationRequired && !activationDecision) errors.push("8/8 approved with activation=false must expose operational_activation_approval");
if (!activationRequired && activationDecision) errors.push("operational_activation_approval must only exist after 8/8 approved and before activation");
if (activationDecision) {
  if (activationDecision.group !== "operations" || activationDecision.source !== OPERATIONS_PATH) errors.push("operational_activation_approval source/group mismatch");
  if (activationDecision.decision_status !== "requires_activation_decision") errors.push("operational_activation_approval status mismatch");
}
const expectedOperationsReportCount = operationsUnresolved.length + (activationRequired ? 1 : 0);
if (operationsReportItems.length !== expectedOperationsReportCount) errors.push("operations owner blocker count mismatch");

const qaDecision = decisions.find((item) => item.id === "mobile_device_release_policy");
const qaPending = mobileQa.status === "requires_owner_decision";
if (qaPending && !qaDecision) errors.push("pending mobile QA policy must appear in owner decisions");
if (!qaPending && qaDecision) errors.push("resolved mobile QA policy must be removed from owner decisions");
if (qaDecision) {
  if (qaDecision.group !== "qa") errors.push("mobile QA owner decision group mismatch");
  if (qaDecision.source !== MOBILE_QA_PATH) errors.push("mobile QA owner decision source mismatch");
  if (qaDecision.question !== mobileQa.decision?.question) errors.push("mobile QA owner decision question mismatch");
  if (qaDecision.decision_status !== mobileQa.status) errors.push("mobile QA decision status mismatch");
}

const bmPending = bm.approval?.status !== "passed";
const bmBlocker = conditional.find((item) => item.id === "bm_group_written_approval");
if (bmPending && !bmBlocker) errors.push("pending BM written approval must appear as conditional blocker");
if (!bmPending && bmBlocker) errors.push("passed BM written approval must remove conditional blocker");
if (bmBlocker) {
  if (bmBlocker.source !== BM_PATH) errors.push("BM blocker source mismatch");
  if (bmBlocker.scope !== "prostornaya-4a_object_specific_advertising") errors.push("BM blocker scope mismatch");
  if (bmBlocker.blocks_global_release !== false) errors.push("BM blocker must not block general portal release");
  if (bmBlocker.decision_status !== (bm.approval?.status || "requires_external_written_approval")) errors.push("BM blocker decision_status mismatch");
}

const summary = data.summary || {};
if (Number(summary.total_owner_decisions) !== decisions.length) errors.push("summary.total_owner_decisions mismatch");
if (Number(summary.legal_pending) !== decisions.filter((item) => item.group === "legal").length) errors.push("legal_pending mismatch");
if (Number(summary.operations_pending) !== operationsCounts.pending) errors.push("operations_pending mismatch");
if (Number(summary.operations_unresolved) !== operationsUnresolved.length) errors.push("operations_unresolved mismatch");
if (Number(summary.operations_rejected) !== operationsCounts.rejected) errors.push("operations_rejected mismatch");
if (Number(summary.operations_superseded) !== operationsCounts.superseded) errors.push("operations_superseded mismatch");
if (Number(summary.operations_approved) !== operationsCounts.approved) errors.push("operations_approved mismatch");
if (Boolean(summary.operations_activation_required) !== activationRequired) errors.push("operations_activation_required mismatch");
if (Boolean(summary.qa_policy_decision_required) !== Boolean(qaDecision)) errors.push("qa_policy_decision_required mismatch");
if (Boolean(summary.analytics_configuration_required) !== decisions.some((item) => item.group === "analytics")) errors.push("analytics flag mismatch");
if (Boolean(summary.real_lead_consent_required) !== decisions.some((item) => item.group === "real_lead")) errors.push("real lead flag mismatch");
if (Boolean(summary.campaign_approval_required) !== decisions.some((item) => item.group === "campaign")) errors.push("campaign flag mismatch");
if (Number(summary.conditional_external_approvals) !== conditional.length) errors.push("conditional_external_approvals mismatch");
if (Boolean(summary.bm_object_approval_required) !== Boolean(bmBlocker)) errors.push("bm_object_approval_required mismatch");
if (data.status !== (decisions.length ? "owner_decisions_required" : "owner_decisions_complete")) errors.push("status mismatch");

if (data.rules?.report_is_not_approval !== true) errors.push("report_is_not_approval must be true");
if (data.rules?.no_personal_contact_values !== true) errors.push("no_personal_contact_values must be true");
if (data.rules?.no_secret_credentials !== true) errors.push("no_secret_credentials must be true");
if (data.rules?.source_contracts_remain_authoritative !== true) errors.push("source_contracts_remain_authoritative must be true");
if (data.rules?.conditional_blockers_do_not_block_general_portal_release !== true) errors.push("conditional blocker boundary must be explicit");
if (data.rules?.qa_policy_decision_does_not_rewrite_historical_results !== true) errors.push("QA policy must not rewrite historical results");
if (data.rules?.non_approved_operations_decisions_remain_visible !== true) errors.push("non-approved operations decisions must remain visible");
if (data.rules?.operations_activation_must_remain_visible_after_8_of_8_approval !== true) errors.push("operations activation handoff must remain visible");

const serialized = JSON.stringify(data).toLowerCase();
for (const forbidden of ["access_token", "api_secret", "client_secret", "password", "bearer "]) {
  if (serialized.includes(forbidden)) errors.push(`secret-like content forbidden: ${forbidden}`);
}

console.log(`Owner release blockers: ${decisions.length}; operations approved=${operationsCounts.approved}; unresolved=${operationsUnresolved.length}; activation_required=${activationRequired}; qa=${Boolean(qaDecision)}; conditional=${conditional.length}`);

if (errors.length) {
  console.error("\nOwner release blockers validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Owner release blockers report validation passed.");
