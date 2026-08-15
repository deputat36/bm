import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const BM_PATH = "data/legal/bm-group-advertising-contract.json";
const output = execFileSync(process.execPath, ["tools/build-owner-release-blockers.mjs", "--format=json"], {
  encoding: "utf8"
});
const data = JSON.parse(output);
const bm = JSON.parse(fs.readFileSync(path.join(ROOT, BM_PATH), "utf8"));
const errors = [];

if (data.schema_version !== "1.1") errors.push("schema_version must be 1.1");
if (data.portal_id !== "newbuilds-borisoglebsk") errors.push("portal_id mismatch");
if (!Array.isArray(data.decisions)) errors.push("decisions must be array");
if (!Array.isArray(data.conditional_blockers)) errors.push("conditional_blockers must be array");

const decisions = Array.isArray(data.decisions) ? data.decisions : [];
const conditional = Array.isArray(data.conditional_blockers) ? data.conditional_blockers : [];
const groups = new Set(["legal", "operations", "analytics", "real_lead", "campaign"]);
const ids = new Set();
for (const item of decisions) {
  if (!groups.has(item.group)) errors.push(`${item.id}: unsupported group=${item.group}`);
  if (!item.id || ids.has(item.id)) errors.push(`${item.id || "unknown"}: duplicate or missing id`);
  ids.add(item.id);
  if (!String(item.title || "").trim()) errors.push(`${item.id}: title missing`);
  if (!String(item.question || "").trim()) errors.push(`${item.id}: question missing`);
  if (!String(item.source || "").startsWith("data/")) errors.push(`${item.id}: source must be data/*`);
  if (typeof item.secure_value_required !== "boolean") errors.push(`${item.id}: secure_value_required must be boolean`);
}

for (const item of conditional) {
  if (item.group !== "external_approval") errors.push(`${item.id}: conditional group must be external_approval`);
  if (!item.id || ids.has(item.id)) errors.push(`${item.id || "unknown"}: duplicate or missing id across blocker sets`);
  ids.add(item.id);
  if (!String(item.title || "").trim()) errors.push(`${item.id}: title missing`);
  if (!String(item.question || "").trim()) errors.push(`${item.id}: question missing`);
  if (!String(item.source || "").startsWith("data/")) errors.push(`${item.id}: source must be data/*`);
  if (typeof item.secure_value_required !== "boolean") errors.push(`${item.id}: secure_value_required must be boolean`);
  if (item.blocks_global_release !== false) errors.push(`${item.id}: conditional blocker must not block global release`);
  if (!String(item.scope || "").trim()) errors.push(`${item.id}: conditional scope missing`);
  if (!String(item.blocking_effect || "").trim()) errors.push(`${item.id}: blocking_effect missing`);
}

const bmPending = bm.approval?.status !== "passed";
const bmBlocker = conditional.find((item) => item.id === "bm_group_written_approval");
if (bmPending && !bmBlocker) errors.push("pending BM written approval must appear as conditional blocker");
if (!bmPending && bmBlocker) errors.push("passed BM written approval must remove conditional blocker");
if (bmBlocker) {
  if (bmBlocker.source !== BM_PATH) errors.push("BM blocker source mismatch");
  if (bmBlocker.scope !== "prostornaya-4a_object_specific_advertising") errors.push("BM blocker scope mismatch");
  if (bmBlocker.blocks_global_release !== false) errors.push("BM blocker must not block general portal release");
}

const summary = data.summary || {};
if (Number(summary.total_owner_decisions) !== decisions.length) errors.push("summary.total_owner_decisions mismatch");
if (Number(summary.legal_pending) !== decisions.filter((item) => item.group === "legal").length) errors.push("legal_pending mismatch");
if (Number(summary.operations_pending) !== decisions.filter((item) => item.group === "operations").length) errors.push("operations_pending mismatch");
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

const serialized = JSON.stringify(data).toLowerCase();
for (const forbidden of ["access_token", "api_secret", "client_secret", "password", "bearer "]) {
  if (serialized.includes(forbidden)) errors.push(`secret-like content forbidden: ${forbidden}`);
}

console.log(`Owner release blockers: ${decisions.length}; legal=${summary.legal_pending}; operations=${summary.operations_pending}; conditional=${conditional.length}; manual_blocked=${summary.manual_blocked_gates}`);

if (errors.length) {
  console.error("\nOwner release blockers validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Owner release blockers report validation passed.");
