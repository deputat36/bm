import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LIFECYCLE_PATH = "data/operations/lead-lifecycle.json";
const PLAYBOOK_PATH = "data/operations/lead-handling.json";
const MATRIX_PATH = "data/qa/form-scenarios.json";
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

function uniqueById(items, label) {
  if (!Array.isArray(items)) {
    errors.push(`${label}: must be an array`);
    return new Map();
  }
  const result = new Map();
  for (const item of items) {
    const id = String(item?.id || "").trim();
    if (!id) {
      errors.push(`${label}: item without id`);
      continue;
    }
    if (result.has(id)) errors.push(`${label}: duplicate id ${id}`);
    result.set(id, item);
  }
  return result;
}

function exactSet(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    errors.push(`${label}: expected ${right.join(", ")}; got ${left.join(", ")}`);
  }
}

function nonEmpty(value, label) {
  if (!String(value || "").trim()) errors.push(`${label}: value is required`);
}

function walkKeys(value, visitor, trail = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkKeys(item, visitor, [...trail, String(index)]));
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, child]) => {
    visitor(key, child, [...trail, key]);
    walkKeys(child, visitor, [...trail, key]);
  });
}

const lifecycle = readJson(LIFECYCLE_PATH);
const playbook = readJson(PLAYBOOK_PATH);
const matrix = readJson(MATRIX_PATH);
if (!lifecycle || !playbook || !matrix) process.exit(1);

if (lifecycle.portal_id !== playbook.portal_id || lifecycle.portal_id !== "newbuilds-borisoglebsk") {
  errors.push(`${LIFECYCLE_PATH}: portal_id must match playbook`);
}
if (lifecycle.schema_version !== "2.0") errors.push(`${LIFECYCLE_PATH}: schema_version must be 2.0`);
if (lifecycle.status !== "server_connected_owner_activation_pending") errors.push(`${LIFECYCLE_PATH}: invalid status`);
if (lifecycle.sources?.handling_playbook !== PLAYBOOK_PATH) errors.push(`${LIFECYCLE_PATH}: invalid handling_playbook source`);
if (lifecycle.sources?.form_matrix !== MATRIX_PATH) errors.push(`${LIFECYCLE_PATH}: invalid form_matrix source`);
if (lifecycle.sources?.system_of_record !== "public.newbuild_leads") errors.push(`${LIFECYCLE_PATH}: invalid system_of_record source`);
if (lifecycle.sources?.event_log !== "public.newbuild_lead_events") errors.push(`${LIFECYCLE_PATH}: invalid event_log source`);
if (lifecycle.sources?.transition_function !== "public.newbuild_lead_transition") errors.push(`${LIFECYCLE_PATH}: invalid transition_function source`);

const rules = lifecycle.rules || {};
if (rules.initial_state !== "received") errors.push(`${LIFECYCLE_PATH}: initial_state must be received`);
[
  "crm_connected",
  "approved_sla_exists",
  "live_owner_assignment_exists",
  "automatic_owner_assignment_enabled",
  "operational_activation_enabled"
].forEach((key) => {
  if (rules[key] !== false) errors.push(`${LIFECYCLE_PATH}: rules.${key} must be false`);
});
[
  "system_of_record_available",
  "server_transition_api_available",
  "automatic_transition_enabled",
  "automatic_triage_only",
  "deal_pipeline_not_in_scope",
  "personal_data_in_state_reports_forbidden"
].forEach((key) => {
  if (rules[key] !== true) errors.push(`${LIFECYCLE_PATH}: rules.${key} must be true`);
});

const technicalFieldSets = [
  ["lead_id", "received_at", "lead_type", "form_id"],
  ["form_role", "residential_complex_id", "qualification_status"],
  ["contact_outcome", "next_action", "source_check_required"]
];
[
  rules.required_identity_fields,
  rules.required_triage_fields,
  rules.required_action_fields
].forEach((fields, index) => {
  exactSet(new Set(Array.isArray(fields) ? fields : []), new Set(technicalFieldSets[index]), `${LIFECYCLE_PATH}: required field group ${index + 1}`);
});

const forbiddenKeys = new Set([
  "owner",
  "assignee",
  "sla_minutes",
  "sla_hours",
  "response_minutes",
  "response_hours",
  "approved_sla"
]);
walkKeys(lifecycle, (key, _value, trail) => {
  if (forbiddenKeys.has(key)) errors.push(`${LIFECYCLE_PATH}: forbidden key ${trail.join(".")}`);
});
const serialized = JSON.stringify(lifecycle);
if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized)) errors.push(`${LIFECYCLE_PATH}: email address must not be stored`);
if (/\+7\d{10}/.test(serialized)) errors.push(`${LIFECYCLE_PATH}: phone number must not be stored`);

const states = uniqueById(lifecycle.states, `${LIFECYCLE_PATH}:states`);
const expectedStates = new Set([
  "received",
  "triage_ready",
  "contact_pending",
  "contact_attempted",
  "contacted_qualified",
  "source_check_pending",
  "consultation_active",
  "follow_up_scheduled",
  "duplicate",
  "invalid_or_spam",
  "do_not_contact",
  "closed_no_action"
]);
exactSet(new Set(states.keys()), expectedStates, `${LIFECYCLE_PATH}: state coverage`);
if (states.size !== 12) errors.push(`${LIFECYCLE_PATH}: expected 12 states`);

const stageOrders = new Set();
const forbiddenStateFragments = /booking|reservation|sale|deal_won|mortgage_approved|contract_signed/i;
for (const state of states.values()) {
  if (!Number.isInteger(state.stage_order)) errors.push(`${LIFECYCLE_PATH}:${state.id}: stage_order must be integer`);
  if (stageOrders.has(state.stage_order)) errors.push(`${LIFECYCLE_PATH}:${state.id}: duplicate stage_order ${state.stage_order}`);
  stageOrders.add(state.stage_order);
  if (typeof state.terminal !== "boolean") errors.push(`${LIFECYCLE_PATH}:${state.id}: terminal must be boolean`);
  nonEmpty(state.purpose, `${LIFECYCLE_PATH}:${state.id}:purpose`);
  if (!Array.isArray(state.required_fields) || !state.required_fields.length) errors.push(`${LIFECYCLE_PATH}:${state.id}: required_fields are required`);
  if (forbiddenStateFragments.test(state.id)) errors.push(`${LIFECYCLE_PATH}:${state.id}: deal pipeline state is out of scope`);
}

const terminalStates = new Set(Array.isArray(rules.terminal_states) ? rules.terminal_states : []);
exactSet(terminalStates, new Set(["duplicate", "invalid_or_spam", "do_not_contact", "closed_no_action"]), `${LIFECYCLE_PATH}: terminal states`);
for (const [id, state] of states) {
  if (terminalStates.has(id) !== state.terminal) errors.push(`${LIFECYCLE_PATH}:${id}: terminal flag mismatch`);
}
if (states.get("received")?.terminal !== false) errors.push(`${LIFECYCLE_PATH}: received must not be terminal`);

const outcomes = new Set((playbook.contact_outcomes || []).map((item) => item.id).filter(Boolean));
const transitions = uniqueById(lifecycle.transitions, `${LIFECYCLE_PATH}:transitions`);
if (transitions.size !== 18) errors.push(`${LIFECYCLE_PATH}: expected 18 transitions`);

const outgoing = new Map([...states.keys()].map((id) => [id, []]));
const incoming = new Map([...states.keys()].map((id) => [id, []]));
for (const transition of transitions.values()) {
  if (!states.has(transition.from)) errors.push(`${LIFECYCLE_PATH}:${transition.id}: unknown from state ${transition.from}`);
  if (!states.has(transition.to)) errors.push(`${LIFECYCLE_PATH}:${transition.id}: unknown to state ${transition.to}`);
  if (transition.from === transition.to) errors.push(`${LIFECYCLE_PATH}:${transition.id}: self transition is forbidden`);
  nonEmpty(transition.event, `${LIFECYCLE_PATH}:${transition.id}:event`);
  if (states.has(transition.from)) outgoing.get(transition.from).push(transition);
  if (states.has(transition.to)) incoming.get(transition.to).push(transition);
  if (transition.required_outcome && !outcomes.has(transition.required_outcome)) {
    errors.push(`${LIFECYCLE_PATH}:${transition.id}: unknown required_outcome ${transition.required_outcome}`);
  }
}

for (const terminal of terminalStates) {
  if ((outgoing.get(terminal) || []).length) errors.push(`${LIFECYCLE_PATH}:${terminal}: terminal state must not have outgoing transitions`);
}
for (const [id, state] of states) {
  if (!state.terminal && !(outgoing.get(id) || []).length) errors.push(`${LIFECYCLE_PATH}:${id}: nonterminal state needs outgoing transition`);
  if (id !== rules.initial_state && !(incoming.get(id) || []).length) errors.push(`${LIFECYCLE_PATH}:${id}: state is unreachable without incoming transition`);
}
if ((incoming.get(rules.initial_state) || []).length) errors.push(`${LIFECYCLE_PATH}: initial state must not have incoming transitions`);

const reachable = new Set([rules.initial_state]);
const queue = [rules.initial_state];
while (queue.length) {
  const current = queue.shift();
  for (const transition of outgoing.get(current) || []) {
    if (!reachable.has(transition.to)) {
      reachable.add(transition.to);
      queue.push(transition.to);
    }
  }
}
exactSet(reachable, new Set(states.keys()), `${LIFECYCLE_PATH}: reachable states`);

const requiredTransitionIds = new Set([
  "receive_to_triage",
  "triage_to_queue",
  "queue_to_attempt",
  "attempt_to_qualified",
  "attempt_to_follow_up",
  "qualified_to_source_check",
  "qualified_to_consultation",
  "source_check_to_consultation",
  "follow_up_to_queue"
]);
requiredTransitionIds.forEach((id) => {
  if (!transitions.has(id)) errors.push(`${LIFECYCLE_PATH}: required transition missing ${id}`);
});

if (transitions.get("receive_to_triage")?.runtime !== "automatic") {
  errors.push(`${LIFECYCLE_PATH}: receive_to_triage must be automatic`);
}
if (transitions.get("triage_to_queue")?.runtime !== "owner_policy_required") {
  errors.push(`${LIFECYCLE_PATH}: triage_to_queue must remain owner_policy_required`);
}

const activeTypes = new Set((matrix.scenarios || []).map((item) => item.lead_type).filter(Boolean));
const playbookTypes = new Set((playbook.lead_types || []).map((item) => item.id).filter(Boolean));
activeTypes.forEach((type) => {
  if (!playbookTypes.has(type)) errors.push(`${PLAYBOOK_PATH}: active lead type missing ${type}`);
});

console.log(`Checked lifecycle states: ${states.size}`);
console.log(`Checked lifecycle transitions: ${transitions.size}`);
console.log(`Checked terminal states: ${terminalStates.size}`);
console.log(`Checked reachable states: ${reachable.size}`);
console.log(`Automatic transition enabled: ${rules.automatic_transition_enabled === true}`);
console.log(`Owner assignment enabled: ${rules.automatic_owner_assignment_enabled === true}`);

if (errors.length) {
  console.error("\nLead lifecycle validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Lead lifecycle validation passed.");