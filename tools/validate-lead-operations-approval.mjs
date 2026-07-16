import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = "data/operations/lead-operations-approval.json";
const MATRIX_PATH = "data/qa/form-scenarios.json";
const CONTRACTS = {
  handling: "data/operations/lead-handling.json",
  lifecycle: "data/operations/lead-lifecycle.json",
  handoff: "data/operations/lead-handoff.json",
  event_log: "data/operations/lead-event-log.json"
};
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

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

const spec = readJson(SPEC_PATH);
const matrix = readJson(MATRIX_PATH);
const handling = readJson(CONTRACTS.handling);
const lifecycle = readJson(CONTRACTS.lifecycle);
const handoff = readJson(CONTRACTS.handoff);
const eventLog = readJson(CONTRACTS.event_log);

if (!spec || !matrix || !handling || !lifecycle || !handoff || !eventLog) process.exit(1);

if (spec.schema_version !== "1.0") errors.push(`${SPEC_PATH}: schema_version must be 1.0`);
if (!isIsoDate(spec.updated_at)) errors.push(`${SPEC_PATH}: updated_at must be an ISO date`);
if (spec.portal_id !== "newbuilds-borisoglebsk") errors.push(`${SPEC_PATH}: invalid portal_id`);
if (spec.status !== "requires_owner_approval_not_operational") {
  errors.push(`${SPEC_PATH}: status must remain requires_owner_approval_not_operational`);
}

const expectedSources = {
  handling_playbook: CONTRACTS.handling,
  lifecycle_contract: CONTRACTS.lifecycle,
  handoff_contract: CONTRACTS.handoff,
  event_log_contract: CONTRACTS.event_log,
  form_matrix: MATRIX_PATH
};
for (const [key, value] of Object.entries(expectedSources)) {
  if (spec.sources?.[key] !== value) errors.push(`${SPEC_PATH}: sources.${key} must be ${value}`);
}

const rules = spec.rules || {};
for (const key of [
  "activation_requires_all_decisions_approved",
  "real_owner_identity_in_repository_forbidden",
  "approved_owner_values_must_use_role_or_secure_reference",
  "hypotheses_are_not_approved_sla",
  "test_leads_only_until_activation",
  "personal_data_in_decision_register_forbidden",
  "timezone_required_before_activation",
  "system_of_record_required_before_activation"
]) {
  if (rules[key] !== true) errors.push(`${SPEC_PATH}: rules.${key} must be true`);
}
for (const key of ["operational_activation_enabled", "crm_mutation_enabled"]) {
  if (rules[key] !== false) errors.push(`${SPEC_PATH}: rules.${key} must be false`);
}

const allowedStatuses = new Set(Array.isArray(rules.allowed_decision_statuses) ? rules.allowed_decision_statuses : []);
exactSet(allowedStatuses, new Set(["requires_owner_decision", "approved", "rejected", "superseded"]), `${SPEC_PATH}: allowed decision statuses`);

const decisions = Array.isArray(spec.decisions) ? spec.decisions : [];
const expectedDecisionIds = new Set([
  "primary_owner_assignment",
  "backup_owner_assignment",
  "working_schedule",
  "first_response_sla",
  "routing_policy",
  "contact_attempt_policy",
  "closure_reason_policy",
  "system_of_record"
]);
const decisionIds = new Set();

if (decisions.length !== 8) errors.push(`${SPEC_PATH}: expected 8 decisions`);
for (const item of decisions) {
  const id = String(item?.id || "").trim();
  if (!id) {
    errors.push(`${SPEC_PATH}: decision without id`);
    continue;
  }
  if (decisionIds.has(id)) errors.push(`${SPEC_PATH}: duplicate decision id ${id}`);
  decisionIds.add(id);
  if (!allowedStatuses.has(item.status)) errors.push(`${SPEC_PATH}:${id}: unsupported status ${item.status}`);
  if (!String(item.decision_type || "").trim()) errors.push(`${SPEC_PATH}:${id}: decision_type is required`);
  if (!String(item.hypothesis || "").trim()) errors.push(`${SPEC_PATH}:${id}: hypothesis is required`);
  if (!String(item.approval_question || "").trim()) errors.push(`${SPEC_PATH}:${id}: approval_question is required`);
  if (!Array.isArray(item.activation_effects) || item.activation_effects.length < 2) {
    errors.push(`${SPEC_PATH}:${id}: at least 2 activation_effects required`);
  }

  if (item.status === "requires_owner_decision") {
    if (item.approved_value !== null) errors.push(`${SPEC_PATH}:${id}: pending decision must keep approved_value=null`);
    if (item.secure_reference !== null) errors.push(`${SPEC_PATH}:${id}: pending decision must keep secure_reference=null`);
  }
  if (item.status === "approved" && item.approved_value === null && !String(item.secure_reference || "").trim()) {
    errors.push(`${SPEC_PATH}:${id}: approved decision needs approved_value or secure_reference`);
  }
  if (["primary_owner_assignment", "backup_owner_assignment"].includes(id) && item.status === "approved") {
    if (!String(item.secure_reference || "").trim() && !String(item.approved_value || "").startsWith("role:")) {
      errors.push(`${SPEC_PATH}:${id}: owner approval must use role: value or secure_reference`);
    }
  }
}
exactSet(decisionIds, expectedDecisionIds, `${SPEC_PATH}: decision ids`);

const pending = decisions.filter((item) => item.status === "requires_owner_decision");
const approved = decisions.filter((item) => item.status === "approved");
if (pending.length !== 8 || approved.length !== 0) {
  errors.push(`${SPEC_PATH}: current branch must remain 8 pending and 0 approved until owner decisions are supplied`);
}

const requiredFields = new Set(Array.isArray(spec.required_operational_fields) ? spec.required_operational_fields : []);
exactSet(requiredFields, new Set([
  "lead_id",
  "received_at",
  "lead_owner_ref",
  "backup_owner_ref",
  "assigned_at",
  "first_action_due_at",
  "first_action_at",
  "contact_outcome",
  "next_action",
  "next_action_at",
  "close_reason",
  "source_system",
  "record_locator"
]), `${SPEC_PATH}: required operational fields`);

const activationGates = new Set(Array.isArray(spec.activation_gates) ? spec.activation_gates : []);
if (activationGates.size !== 7) errors.push(`${SPEC_PATH}: expected 7 activation gates`);
for (const gate of [
  "all_decisions_approved",
  "owner_references_resolve_in_secure_system",
  "working_schedule_and_timezone_approved",
  "system_of_record_available",
  "test_lead_has_owner_first_action_outcome_and_next_action",
  "crm_or_endpoint_security_review_completed",
  "operational_activation_explicitly_enabled"
]) {
  if (!activationGates.has(gate)) errors.push(`${SPEC_PATH}: missing activation gate ${gate}`);
}

const serialized = JSON.stringify(spec);
if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized)) errors.push(`${SPEC_PATH}: email address forbidden`);
if (/\+?7[\s()-]*\d{3}[\s()-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/.test(serialized)) errors.push(`${SPEC_PATH}: phone number forbidden`);
for (const forbiddenKey of ["owner_name", "backup_owner_name", "owner_email", "owner_phone", "lead_name", "lead_phone"]) {
  if (serialized.includes(`"${forbiddenKey}"`)) errors.push(`${SPEC_PATH}: forbidden personal key ${forbiddenKey}`);
}

if (!Array.isArray(matrix.scenarios) || matrix.scenarios.length !== 14) {
  errors.push(`${MATRIX_PATH}: expected 14 active form scenarios`);
}

if (handling.status !== "recommended_draft_not_operational") errors.push(`${CONTRACTS.handling}: must remain non-operational`);
if (handling.rules?.approved_sla_exists !== false || handling.rules?.live_owner_assignment_exists !== false || handling.rules?.crm_mutation_enabled !== false) {
  errors.push(`${CONTRACTS.handling}: operational flags must remain false`);
}
if (lifecycle.status !== "draft_contract_not_connected") errors.push(`${CONTRACTS.lifecycle}: must remain draft`);
if (lifecycle.rules?.approved_sla_exists !== false || lifecycle.rules?.live_owner_assignment_exists !== false || lifecycle.rules?.crm_connected !== false) {
  errors.push(`${CONTRACTS.lifecycle}: operational flags must remain false`);
}
if (handoff.status !== "draft_contract_not_connected") errors.push(`${CONTRACTS.handoff}: must remain draft`);
if (handoff.rules?.approved_sla_exists !== false || handoff.rules?.automatic_owner_assignment_enabled !== false || handoff.rules?.crm_connected !== false) {
  errors.push(`${CONTRACTS.handoff}: operational flags must remain false`);
}
if (eventLog.status !== "draft_contract_not_connected") errors.push(`${CONTRACTS.event_log}: must remain draft`);
if (eventLog.rules?.approved_sla_exists !== false || eventLog.rules?.automatic_transition_enabled !== false || eventLog.rules?.crm_connected !== false) {
  errors.push(`${CONTRACTS.event_log}: operational flags must remain false`);
}

console.log(`Owner decisions checked: ${decisions.length}`);
console.log(`Pending decisions: ${pending.length}`);
console.log(`Approved decisions: ${approved.length}`);
console.log(`Active form scenarios preserved: ${matrix.scenarios?.length || 0}`);
console.log(`Operational activation enabled: ${rules.operational_activation_enabled === true}`);

if (errors.length) {
  console.error("\nLead operations approval validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Lead operations approval validation passed.");
