import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = "data/operations/lead-event-log.json";
const errors = [];

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function uniqueStrings(values, label) {
  if (!Array.isArray(values)) {
    errors.push(`${label}: expected array`);
    return [];
  }
  const normalized = values.map((value) => String(value || "").trim()).filter(Boolean);
  if (new Set(normalized).size !== normalized.length) errors.push(`${label}: duplicate values`);
  return normalized;
}

function setEquals(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    errors.push(`${label}: expected [${right.join(", ")}], got [${left.join(", ")}]`);
  }
}

const spec = readJson(SPEC_PATH);
if (!spec) process.exit(1);
const lifecycle = readJson(spec.sources?.lifecycle_contract || "");
const playbook = readJson(spec.sources?.handling_playbook || "");
const handoff = readJson(spec.sources?.handoff_contract || "");
if (!lifecycle || !playbook || !handoff) process.exit(1);

if (spec.schema_version !== "2.0") errors.push(`${SPEC_PATH}: schema_version must be 2.0`);
if (spec.portal_id !== "newbuilds-borisoglebsk") errors.push(`${SPEC_PATH}: unexpected portal_id`);
if (spec.portal_id !== lifecycle.portal_id || spec.portal_id !== playbook.portal_id || spec.portal_id !== handoff.portal_id) {
  errors.push(`${SPEC_PATH}: portal_id must match source contracts`);
}
if (spec.status !== "server_append_only_connected") errors.push(`${SPEC_PATH}: invalid connected status`);
if (spec.sources?.system_of_record !== "public.newbuild_leads") errors.push(`${SPEC_PATH}: invalid system_of_record`);
if (spec.sources?.event_table !== "public.newbuild_lead_events") errors.push(`${SPEC_PATH}: invalid event_table`);
if (spec.sources?.transition_function !== "public.newbuild_lead_transition") errors.push(`${SPEC_PATH}: invalid transition_function`);

const rules = spec.rules || {};
[
  "append_only",
  "database_append_only_trigger_enabled",
  "event_update_forbidden",
  "event_delete_forbidden",
  "real_event_records_in_repository_forbidden",
  "personal_values_in_generated_reports_forbidden",
  "automatic_transition_enabled",
  "automatic_triage_only",
  "actor_is_role_not_person"
].forEach((key) => {
  if (rules[key] !== true) errors.push(`${SPEC_PATH}: ${key} must be true`);
});
[
  "crm_connected",
  "approved_sla_exists",
  "automatic_owner_assignment_enabled",
  "operational_activation_enabled"
].forEach((key) => {
  if (rules[key] !== false) errors.push(`${SPEC_PATH}: ${key} must be false`);
});

const transitions = Array.isArray(lifecycle.transitions) ? lifecycle.transitions : [];
if (transitions.length !== 18) errors.push(`${lifecycle.sources || "lifecycle"}: expected 18 transitions`);
if (rules.expected_event_templates !== transitions.length || rules.expected_event_templates !== 18) {
  errors.push(`${SPEC_PATH}: expected_event_templates must equal 18`);
}

const transitionIds = new Set();
const transitionEvents = new Set();
for (const transition of transitions) {
  if (!transition.id || !transition.event || !transition.from || !transition.to) {
    errors.push("lifecycle transition: id, event, from and to are required");
    continue;
  }
  if (transitionIds.has(transition.id)) errors.push(`lifecycle transition: duplicate id ${transition.id}`);
  if (transitionEvents.has(transition.event)) errors.push(`lifecycle transition: duplicate event ${transition.event}`);
  transitionIds.add(transition.id);
  transitionEvents.add(transition.event);
}

const requiredFields = new Set(uniqueStrings(spec.required_event_fields, `${SPEC_PATH}:required_event_fields`));
setEquals(requiredFields, new Set([
  "event_id",
  "lead_id",
  "occurred_at",
  "event_type",
  "from_state",
  "to_state",
  "actor_role",
  "source_system",
  "payload_version"
]), "required event fields");

const optionalFields = new Set(uniqueStrings(spec.optional_event_fields, `${SPEC_PATH}:optional_event_fields`));
setEquals(optionalFields, new Set([
  "contact_outcome",
  "next_action",
  "next_action_at",
  "source_check_required",
  "evidence_ref",
  "reason_code"
]), "optional event fields");
for (const field of requiredFields) {
  if (optionalFields.has(field)) errors.push(`${SPEC_PATH}: field ${field} cannot be required and optional`);
}

const actorRoles = new Set(uniqueStrings(spec.actor_roles, `${SPEC_PATH}:actor_roles`));
setEquals(actorRoles, new Set([
  "portal_system",
  "lead_operator",
  "manager",
  "source_reviewer",
  "integration_system"
]), "actor roles");

const sourceSystems = new Set(uniqueStrings(spec.source_systems, `${SPEC_PATH}:source_systems`));
setEquals(sourceSystems, new Set([
  "portal_form",
  "supabase:newbuild_leads",
  "manual_register",
  "future_crm"
]), "source systems");

const reasonCodes = new Set(uniqueStrings(spec.reason_codes, `${SPEC_PATH}:reason_codes`));
if (reasonCodes.size !== 10) errors.push(`${SPEC_PATH}: expected 10 reason codes`);

const playbookOutcomes = new Set((playbook.contact_outcomes || []).map((item) => item.id));
for (const transition of transitions) {
  if (transition.required_outcome && !playbookOutcomes.has(transition.required_outcome)) {
    errors.push(`transition ${transition.id}: unknown required_outcome ${transition.required_outcome}`);
  }
}

const lifecycleStates = new Map((lifecycle.states || []).map((state) => [state.id, state]));
const terminalStates = new Set(lifecycle.rules?.terminal_states || []);
for (const transition of transitions) {
  if (!lifecycleStates.has(transition.from) || !lifecycleStates.has(transition.to)) {
    errors.push(`transition ${transition.id}: unknown lifecycle state`);
  }
  if (terminalStates.has(transition.from)) errors.push(`transition ${transition.id}: terminal state cannot be source`);
}

const privacy = spec.privacy || {};
if (privacy.repository_may_store_contract_only !== true) errors.push(`${SPEC_PATH}: repository_may_store_contract_only must be true`);
if (privacy.database_event_payload_must_be_minimized !== true) errors.push(`${SPEC_PATH}: database_event_payload_must_be_minimized must be true`);
const forbiddenFields = new Set(uniqueStrings(privacy.forbidden_fields, `${SPEC_PATH}:privacy.forbidden_fields`));
setEquals(forbiddenFields, new Set([
  "name",
  "phone",
  "phone_normalized",
  "email",
  "comment",
  "question",
  "conversation_text",
  "client_fixation_id"
]), "privacy forbidden fields");
for (const field of [...requiredFields, ...optionalFields]) {
  if (forbiddenFields.has(field)) errors.push(`${SPEC_PATH}: event schema includes forbidden field ${field}`);
}

if (spec.rendering?.payload_version !== "2.0") errors.push(`${SPEC_PATH}: payload_version must be 2.0`);
if (spec.rendering?.default_source_system !== "supabase:newbuild_leads") errors.push(`${SPEC_PATH}: invalid default_source_system`);
if (!actorRoles.has(spec.rendering?.default_actor_role)) errors.push(`${SPEC_PATH}: invalid default_actor_role`);
if (!sourceSystems.has(spec.rendering?.default_source_system)) errors.push(`${SPEC_PATH}: invalid default_source_system`);

const serialized = JSON.stringify(spec);
if (/\+7\d{10}/.test(serialized) || /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized)) {
  errors.push(`${SPEC_PATH}: contract must not contain contact values`);
}
if (/owner_email|assignee|manager_id|sla_minutes|sla_hours/i.test(serialized)) {
  errors.push(`${SPEC_PATH}: live owner assignment or SLA fields are forbidden`);
}

console.log(`Checked event templates: ${transitions.length}`);
console.log(`Checked lifecycle states: ${lifecycleStates.size}`);
console.log(`Checked actor roles: ${actorRoles.size}`);
console.log(`Checked reason codes: ${reasonCodes.size}`);
console.log(`Database append-only enabled: ${rules.database_append_only_trigger_enabled === true}`);
console.log(`Automatic owner assignment enabled: ${rules.automatic_owner_assignment_enabled === true}`);

if (errors.length) {
  console.error("\nLead event log validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Lead event log contract validation passed.");