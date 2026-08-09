import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = "data/operations/commercial-outcome-events.json";
const PERSISTENCE_PATH = "data/operations/commercial-outcome-persistence.json";
const LIFECYCLE_PATH = "data/operations/lead-lifecycle.json";
const HANDLING_PATH = "data/operations/lead-handling.json";
const APPROVAL_PATH = "data/operations/lead-operations-approval.json";
const EVENT_LOG_PATH = "data/operations/lead-event-log.json";
const INTERNAL_OUTCOMES_PATH = "data/analytics/internal-outcomes.json";
const PUBLIC_EVENTS_PATH = "data/analytics/events.json";
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
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

const contract = readJson(CONTRACT_PATH);
const persistence = readJson(PERSISTENCE_PATH);
const lifecycle = readJson(LIFECYCLE_PATH);
const handling = readJson(HANDLING_PATH);
const approval = readJson(APPROVAL_PATH);
const eventLog = readJson(EVENT_LOG_PATH);
const internalOutcomes = readJson(INTERNAL_OUTCOMES_PATH);
const publicEvents = readJson(PUBLIC_EVENTS_PATH);
if (!contract || !persistence || !lifecycle || !handling || !approval || !eventLog || !internalOutcomes || !publicEvents) process.exit(1);

if (contract.schema_version !== "1.0") errors.push(`${CONTRACT_PATH}: schema_version must be 1.0`);
if (!isIsoDate(contract.updated_at)) errors.push(`${CONTRACT_PATH}: updated_at must be YYYY-MM-DD`);
if (contract.portal_id !== "newbuilds-borisoglebsk") errors.push(`${CONTRACT_PATH}: invalid portal_id`);
if (contract.status !== "specification_only_persistence_not_connected") errors.push(`${CONTRACT_PATH}: status must remain specification_only_persistence_not_connected before persistence exists`);

const expectedSources = {
  lead_lifecycle: LIFECYCLE_PATH,
  lead_handling: HANDLING_PATH,
  operations_approval: APPROVAL_PATH,
  event_log_contract: EVENT_LOG_PATH,
  internal_outcomes: INTERNAL_OUTCOMES_PATH,
  persistence_design: PERSISTENCE_PATH
};
for (const [key, value] of Object.entries(expectedSources)) {
  if (contract.sources?.[key] !== value) errors.push(`${CONTRACT_PATH}: sources.${key} must be ${value}`);
}

for (const key of [
  "protected_internal_events_only",
  "persistence_design_selected",
  "append_only_required_when_persisted",
  "existing_lead_lifecycle_not_mutated_by_spec",
  "commercial_event_must_not_be_inferred",
  "event_actor_requires_role_or_secure_reference",
  "lead_id_required_in_protected_store",
  "lead_id_external_export_forbidden",
  "personal_data_in_event_payload_forbidden",
  "free_text_in_analytics_export_forbidden",
  "closed_lost_requires_reason",
  "closed_won_requires_evidence_reference",
  "deposit_amount_not_required",
  "owner_closure_policy_required_before_closed_lost_activation"
]) {
  if (contract.rules?.[key] !== true) errors.push(`${CONTRACT_PATH}: rules.${key} must be true`);
}
for (const key of ["persistence_connected", "event_write_enabled"]) {
  if (contract.rules?.[key] !== false) errors.push(`${CONTRACT_PATH}: rules.${key} must remain false before server implementation`);
}

if (contract.persistence_design?.status !== "selected_not_deployed") errors.push(`${CONTRACT_PATH}: persistence_design.status must be selected_not_deployed`);
if (contract.persistence_design?.store !== "public.newbuild_commercial_events") errors.push(`${CONTRACT_PATH}: persistence_design.store mismatch`);
if (contract.persistence_design?.contract !== PERSISTENCE_PATH) errors.push(`${CONTRACT_PATH}: persistence_design.contract must be ${PERSISTENCE_PATH}`);
for (const key of ["migration_created", "production_ddl_applied", "write_api_deployed"]) {
  if (contract.persistence_design?.[key] !== false) errors.push(`${CONTRACT_PATH}: persistence_design.${key} must remain false before deployment`);
}
if (contract.persistence_design?.deployment_effect !== "none") errors.push(`${CONTRACT_PATH}: persistence design must have deployment_effect=none`);
if (persistence.status !== "store_design_selected_not_deployed") errors.push(`${PERSISTENCE_PATH}: status must remain store_design_selected_not_deployed`);
if (`${persistence.store?.schema}.${persistence.store?.table}` !== contract.persistence_design?.store) errors.push(`${CONTRACT_PATH}: selected store must match ${PERSISTENCE_PATH}`);
for (const key of ["migration_file_created", "production_ddl_applied", "write_api_deployed", "event_write_enabled"]) {
  if (persistence.deployment?.[key] !== false) errors.push(`${PERSISTENCE_PATH}: deployment.${key} must remain false in design-only phase`);
}
if (persistence.deployment?.sql_preview_only !== true) errors.push(`${PERSISTENCE_PATH}: SQL preview must remain preview-only`);

const expectedEventIds = new Set([
  "consultation_scheduled",
  "consultation_completed",
  "selection_sent",
  "showing_scheduled",
  "showing_completed",
  "deposit",
  "closed_won",
  "closed_lost"
]);
const events = Array.isArray(contract.events) ? contract.events : [];
exactSet(new Set(events.map((item) => item.id)), expectedEventIds, `${CONTRACT_PATH}: event ids`);
if (events.length !== 8) errors.push(`${CONTRACT_PATH}: expected 8 commercial events`);

const expectedRequiredFields = new Set([
  "event_id",
  "lead_id",
  "event_type",
  "occurred_at",
  "actor_ref",
  "source_system",
  "object_id",
  "scheduled_for",
  "reason_code",
  "next_action",
  "next_action_at",
  "evidence_ref",
  "protected_note"
]);
exactSet(new Set(contract.required_event_fields || []), expectedRequiredFields, `${CONTRACT_PATH}: required_event_fields`);

const persistenceColumnNames = new Set((persistence.columns || []).map((column) => column.name));
for (const field of expectedRequiredFields) {
  if (!persistenceColumnNames.has(field)) errors.push(`${PERSISTENCE_PATH}: missing canonical event column ${field}`);
}

const ranks = new Set();
for (const event of events) {
  const label = `${CONTRACT_PATH}:${event.id}`;
  if (!Number.isInteger(event.stage_rank) || event.stage_rank <= 0) errors.push(`${label}: stage_rank must be positive integer`);
  if (ranks.has(event.stage_rank)) errors.push(`${label}: duplicate stage_rank ${event.stage_rank}`);
  ranks.add(event.stage_rank);
  if (typeof event.terminal !== "boolean") errors.push(`${label}: terminal must be boolean`);
  if (!Array.isArray(event.requires_prior_context) || !event.requires_prior_context.length) errors.push(`${label}: requires_prior_context required`);
  if (!Array.isArray(event.required_non_null_fields)) errors.push(`${label}: required_non_null_fields must be array`);
  if (!Array.isArray(event.allowed_next_actions)) errors.push(`${label}: allowed_next_actions must be array`);
  for (const field of event.required_non_null_fields || []) {
    if (!expectedRequiredFields.has(field)) errors.push(`${label}: required field ${field} not in canonical event schema`);
  }
  if (event.terminal && (event.allowed_next_actions || []).length !== 0) errors.push(`${label}: terminal event cannot have next actions`);
}

const closedLost = events.find((item) => item.id === "closed_lost");
const closedWon = events.find((item) => item.id === "closed_won");
const deposit = events.find((item) => item.id === "deposit");
if (closedLost?.terminal !== true || !closedLost?.required_non_null_fields?.includes("reason_code")) errors.push(`${CONTRACT_PATH}: closed_lost must be terminal and require reason_code`);
if (closedWon?.terminal !== true || !closedWon?.required_non_null_fields?.includes("evidence_ref") || !closedWon?.required_non_null_fields?.includes("object_id")) errors.push(`${CONTRACT_PATH}: closed_won must be terminal and require object_id + evidence_ref`);
if (!deposit?.required_non_null_fields?.includes("evidence_ref") || !deposit?.required_non_null_fields?.includes("object_id")) errors.push(`${CONTRACT_PATH}: deposit must require object_id + evidence_ref`);

const closureDecision = (approval.decisions || []).find((item) => item.id === "closure_reason_policy");
if (!closureDecision) errors.push(`${APPROVAL_PATH}: closure_reason_policy decision missing`);
if (closureDecision?.status !== "requires_owner_decision") errors.push(`${APPROVAL_PATH}: closure_reason_policy must remain owner-gated in current phase`);
if (contract.closure_reason_policy?.status !== "owner_decision_required") errors.push(`${CONTRACT_PATH}: closure reason policy must remain owner_decision_required`);
if (contract.closure_reason_policy?.decision_id !== "closure_reason_policy") errors.push(`${CONTRACT_PATH}: closure decision id mismatch`);

const candidateReasons = new Set(contract.closure_reason_policy?.candidate_values_from_owner_register || []);
const expectedReasons = new Set([
  "duplicate",
  "invalid_or_spam",
  "do_not_contact",
  "no_answer_after_policy",
  "not_interested",
  "postponed",
  "no_suitable_option",
  "financing_not_available",
  "other_with_comment"
]);
exactSet(candidateReasons, expectedReasons, `${CONTRACT_PATH}: candidate closure reasons`);
const hypothesis = String(closureDecision?.hypothesis || "");
for (const reason of expectedReasons) {
  if (!hypothesis.includes(reason)) errors.push(`${APPROVAL_PATH}: closure hypothesis missing ${reason}`);
}

const technicalMapping = contract.closure_reason_policy?.technical_terminal_mapping || {};
for (const reason of ["duplicate", "invalid_or_spam", "do_not_contact"]) {
  if (technicalMapping[reason] !== reason) errors.push(`${CONTRACT_PATH}: technical mapping ${reason} must map to lifecycle state ${reason}`);
}
const lifecycleTerminalStates = new Set(lifecycle.rules?.terminal_states || []);
for (const mappedState of Object.values(technicalMapping)) {
  if (!lifecycleTerminalStates.has(mappedState)) errors.push(`${CONTRACT_PATH}: mapped lifecycle terminal state ${mappedState} is not registered`);
}
if (contract.closure_reason_policy?.other_with_comment_requires_protected_note !== true) errors.push(`${CONTRACT_PATH}: other_with_comment must require protected note`);
if (contract.closure_reason_policy?.protected_note_external_export_forbidden !== true) errors.push(`${CONTRACT_PATH}: protected note must be forbidden from external export`);

if (lifecycle.rules?.deal_pipeline_not_in_scope !== true) errors.push(`${LIFECYCLE_PATH}: current primary lead lifecycle must keep deal_pipeline_not_in_scope=true until a separate implementation changes it`);
const lifecycleStateIds = new Set((lifecycle.states || []).map((item) => item.id));
for (const commercialId of expectedEventIds) {
  if (lifecycleStateIds.has(commercialId)) errors.push(`${LIFECYCLE_PATH}: commercial milestone ${commercialId} must not be silently added as a primary lifecycle state by this spec`);
}
if (handling.status !== "server_connected_owner_activation_pending") errors.push(`${HANDLING_PATH}: unexpected handling status`);
if (eventLog.rules?.append_only !== true || eventLog.rules?.database_append_only_trigger_enabled !== true) errors.push(`${EVENT_LOG_PATH}: protected operational event log append-only guarantees must remain enabled`);

const internalEvents = new Map((internalOutcomes.canonical_outcome_events || []).map((item) => [item.id, item]));
for (const eventId of expectedEventIds) {
  const outcome = internalEvents.get(eventId);
  if (!outcome) errors.push(`${INTERNAL_OUTCOMES_PATH}: canonical event missing ${eventId}`);
  else if (outcome.coverage !== "schema_gap" || outcome.source !== null) errors.push(`${INTERNAL_OUTCOMES_PATH}:${eventId}: must remain schema_gap until persistence is implemented`);
}

const publicEventIds = new Set((publicEvents.events || []).map((item) => item.id));
for (const eventId of expectedEventIds) {
  if (publicEventIds.has(eventId)) errors.push(`${PUBLIC_EVENTS_PATH}: protected commercial event ${eventId} must not be registered as public browser analytics`);
}

const forbiddenPayloadKeys = new Set(contract.forbidden_payload_keys || []);
for (const key of [
  "name",
  "phone",
  "phone_normalized",
  "email",
  "client_fixation_id",
  "page_url",
  "referrer",
  "user_agent",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content"
]) {
  if (!forbiddenPayloadKeys.has(key)) errors.push(`${CONTRACT_PATH}: forbidden payload key missing ${key}`);
}

for (const field of ["event_id", "lead_id", "event_type", "occurred_at", "actor_ref", "source_system", "object_id", "scheduled_for", "reason_code", "next_action", "next_action_at", "evidence_ref", "protected_note"]) {
  if (!String(contract.field_rules?.[field] || "").trim()) errors.push(`${CONTRACT_PATH}: field rule missing ${field}`);
}

const activationGates = new Set(contract.activation_gates || []);
exactSet(activationGates, new Set([
  "operational_activation_enabled",
  "commercial_event_store_selected",
  "append_only_server_enforcement_reviewed",
  "actor_reference_policy_approved",
  "closure_reason_policy_approved",
  "protected_event_write_api_reviewed"
]), `${CONTRACT_PATH}: activation gates`);

console.log(`Commercial outcome events: ${events.length}`);
console.log(`Persistence design selected: ${contract.rules.persistence_design_selected === true}`);
console.log(`Selected store: ${contract.persistence_design?.store || "missing"}`);
console.log(`Migration created: ${contract.persistence_design?.migration_created === true}`);
console.log(`Production DDL applied: ${contract.persistence_design?.production_ddl_applied === true}`);
console.log(`Closure reason candidates: ${candidateReasons.size}; owner decision status: ${closureDecision?.status || "missing"}`);
console.log(`Persistence connected: ${contract.rules.persistence_connected === true}`);
console.log(`Event writes enabled: ${contract.rules.event_write_enabled === true}`);
console.log(`Internal outcome gaps preserved: ${[...expectedEventIds].filter((id) => internalEvents.get(id)?.coverage === "schema_gap").length}`);

if (errors.length) {
  console.error("\nCommercial outcome event validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Commercial outcome event validation passed.");
