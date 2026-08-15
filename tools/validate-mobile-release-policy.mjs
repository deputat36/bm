import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const POLICY_PATH = "data/qa/mobile-release-policy.json";
const RESULTS_PATH = "data/qa/form-results.json";
const DESKTOP_EVIDENCE = "evidence/qa/2026-08-06-production-browser/README.md";
const MOBILE_EVIDENCE = "evidence/qa/2026-08-09-mobile-emulation/README.md";
const errors = [];

function read(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) {
    errors.push(`${relativePath}: missing`);
    return "";
  }
  return fs.readFileSync(full, "utf8");
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
  if (JSON.stringify(left) !== JSON.stringify(right)) errors.push(`${label}: expected ${right.join(", ")}; got ${left.join(", ")}`);
}

function validDateTimeOrDate(value) {
  return Boolean(value && Number.isFinite(Date.parse(String(value))));
}

const policy = readJson(POLICY_PATH);
const historical = readJson(RESULTS_PATH);
const desktopText = read(DESKTOP_EVIDENCE);
const mobileText = read(MOBILE_EVIDENCE);
if (!policy || !historical || !desktopText || !mobileText) process.exit(1);

if (policy.schema_version !== "1.0") errors.push(`${POLICY_PATH}: schema_version must be 1.0`);
if (policy.portal_id !== "newbuilds-borisoglebsk") errors.push(`${POLICY_PATH}: portal_id mismatch`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(String(policy.updated_at || ""))) errors.push(`${POLICY_PATH}: updated_at must be YYYY-MM-DD`);

const decision = policy.decision || {};
if (decision.id !== "mobile_device_release_policy") errors.push(`${POLICY_PATH}: decision id mismatch`);
exactSet(new Set(decision.allowed_values || []), new Set([
  "emulation_sufficient_for_controlled_launch",
  "physical_android_and_iphone_required_before_campaign_launch"
]), `${POLICY_PATH}: allowed decision values`);

if (policy.status === "requires_owner_decision") {
  if (decision.value !== null) errors.push(`${POLICY_PATH}: pending decision must keep value=null`);
  if (decision.checked_at !== null) errors.push(`${POLICY_PATH}: pending decision must keep checked_at=null`);
  if (decision.reviewer_reference !== null) errors.push(`${POLICY_PATH}: pending decision must keep reviewer_reference=null`);
  if ((decision.evidence || []).length !== 0) errors.push(`${POLICY_PATH}: pending decision must keep evidence empty`);
} else if (policy.status === "approved") {
  if (!(decision.allowed_values || []).includes(decision.value)) errors.push(`${POLICY_PATH}: approved decision value invalid`);
  if (!validDateTimeOrDate(decision.checked_at)) errors.push(`${POLICY_PATH}: approved decision requires checked_at`);
  if (!/^(role|secure_reference):[a-z0-9_./-]+$/i.test(String(decision.reviewer_reference || ""))) errors.push(`${POLICY_PATH}: approved decision requires role:/secure_reference: reviewer`);
  if (!(decision.evidence || []).length) errors.push(`${POLICY_PATH}: approved decision requires evidence reference`);
} else {
  errors.push(`${POLICY_PATH}: unsupported status ${policy.status}`);
}

const evidence = policy.current_evidence || {};
for (const id of ["desktop_production", "android", "iphone"]) {
  const item = evidence[id];
  if (!item) {
    errors.push(`${POLICY_PATH}: evidence ${id} missing`);
    continue;
  }
  if (item.physical_device !== false) errors.push(`${POLICY_PATH}:${id}: current evidence must remain physical_device=false`);
  if (item.browser_runs_passed !== 15 || item.browser_runs_total !== 15) errors.push(`${POLICY_PATH}:${id}: expected 15/15 browser evidence`);
  if (item.storage_cases_passed !== 2 || item.storage_cases_total !== 2) errors.push(`${POLICY_PATH}:${id}: expected 2/2 storage evidence`);
  if (!String(item.reference || "").startsWith("evidence/qa/")) errors.push(`${POLICY_PATH}:${id}: repository evidence reference required`);
}
if (evidence.desktop_production?.reference !== DESKTOP_EVIDENCE) errors.push(`${POLICY_PATH}: desktop evidence reference mismatch`);
if (evidence.android?.reference !== MOBILE_EVIDENCE || evidence.iphone?.reference !== MOBILE_EVIDENCE) errors.push(`${POLICY_PATH}: mobile evidence reference mismatch`);

for (const fragment of ["15/15 browser-прогонов passed", "физическое устройство: нет"]) {
  if (!desktopText.toLowerCase().includes(fragment.toLowerCase())) errors.push(`${DESKTOP_EVIDENCE}: expected evidence fragment missing: ${fragment}`);
}
for (const fragment of ["15/15 browser-прогонов passed", "physical_device=false", "эмуляция, а не физические устройства", "data/qa/form-results.json"] ) {
  if (!mobileText.toLowerCase().includes(fragment.toLowerCase())) errors.push(`${MOBILE_EVIDENCE}: expected evidence fragment missing: ${fragment}`);
}

if (policy.historical_manual_registry?.path !== RESULTS_PATH) errors.push(`${POLICY_PATH}: historical registry path mismatch`);
if (policy.historical_manual_registry?.updated_at !== historical.updated_at) errors.push(`${POLICY_PATH}: historical registry updated_at mismatch`);
if (policy.historical_manual_registry?.must_not_be_rewritten_from_emulation !== true) errors.push(`${POLICY_PATH}: emulation must not rewrite historical registry`);
if (policy.historical_manual_registry?.missing_or_historical_failed_slots_must_not_be_inferred_passed !== true) errors.push(`${POLICY_PATH}: historical failed/missing slots must not be inferred passed`);

for (const key of [
  "emulation_must_not_be_labeled_physical",
  "policy_decision_is_not_qa_evidence",
  "historical_manual_results_are_immutable_evidence",
  "owner_decision_required_before_release_policy_change",
  "owner_decision_must_not_directly_mutate_form_results",
  "form_manual_qa_must_not_be_auto_passed_by_this_contract",
  "real_lead_delivery_gate_unchanged",
  "live_analytics_gate_unchanged",
  "legal_and_operations_gates_unchanged"
]) {
  if (policy.rules?.[key] !== true) errors.push(`${POLICY_PATH}: rules.${key} must be true`);
}
if (policy.future_effect?.current_effect !== "none_form_manual_qa_remains_derived_from_existing_registry") errors.push(`${POLICY_PATH}: current effect must remain no-op for form_manual_qa`);

console.log(`Mobile QA release policy: ${policy.status}`);
console.log(`Current evidence: desktop=15/15, android=15/15 emulation, iphone=15/15 emulation`);
console.log(`Historical manual results updated_at: ${historical.updated_at}`);

if (errors.length) {
  console.error("\nMobile QA release policy validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Mobile QA release policy validation passed.");
