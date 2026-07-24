import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = "data/operations/lead-handling.json";
const MAIN_PATH = "assets/js/main.js";
const MATRIX_PATH = "data/qa/form-scenarios.json";
const PROJECTS_PATH = "data/projects/index.json";
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

function nonEmpty(value, label) {
  if (!String(value || "").trim()) errors.push(`${label}: value is required`);
}

function exactSet(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    errors.push(`${label}: expected ${right.join(", ")}; got ${left.join(", ")}`);
  }
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

const spec = readJson(SPEC_PATH);
const mainSource = read(MAIN_PATH);
const matrix = readJson(MATRIX_PATH);
const projects = readJson(PROJECTS_PATH);

if (!spec || !mainSource || !matrix || !projects) process.exit(1);

if (spec.portal_id !== "newbuilds-borisoglebsk") errors.push(`${SPEC_PATH}: invalid portal_id`);
if (spec.schema_version !== "2.0") errors.push(`${SPEC_PATH}: schema_version must be 2.0`);
if (spec.status !== "server_connected_owner_activation_pending") {
  errors.push(`${SPEC_PATH}: status must be server_connected_owner_activation_pending`);
}

const expectedSources = {
  qualification_logic: MAIN_PATH,
  form_matrix: MATRIX_PATH,
  project_registry: PROJECTS_PATH,
  system_of_record: "public.newbuild_leads",
  operations_queue: "public.newbuild_lead_operations_queue_v1",
  transition_function: "public.newbuild_lead_transition"
};
for (const [key, value] of Object.entries(expectedSources)) {
  if (spec.sources?.[key] !== value) errors.push(`${SPEC_PATH}: sources.${key} must be ${value}`);
}

const rules = spec.rules || {};
[
  "system_of_record_available",
  "automatic_triage_enabled",
  "response_guidance_is_recommendation",
  "personal_data_in_playbook_forbidden",
  "verified_source_required_before_factual_claim",
  "first_contact_must_end_with_recorded_outcome"
].forEach((key) => {
  if (rules[key] !== true) errors.push(`${SPEC_PATH}: rules.${key} must be true`);
});
[
  "approved_sla_exists",
  "live_owner_assignment_exists",
  "automatic_owner_assignment_enabled",
  "operational_activation_enabled",
  "crm_mutation_enabled"
].forEach((key) => {
  if (rules[key] !== false) errors.push(`${SPEC_PATH}: rules.${key} must be false`);
});

const allowedGuidance = new Set(Array.isArray(rules.allowed_response_guidance) ? rules.allowed_response_guidance : []);
exactSet(allowedGuidance, new Set([
  "first_available_work_block",
  "same_working_day",
  "planned_nurture_cycle"
]), `${SPEC_PATH}: allowed response guidance`);

const forbiddenKeys = new Set([
  "owner",
  "assignee",
  "owner_email",
  "owner_phone",
  "sla_minutes",
  "sla_hours",
  "response_minutes",
  "response_hours",
  "approved_sla"
]);
walkKeys(spec, (key, _value, trail) => {
  if (forbiddenKeys.has(key)) errors.push(`${SPEC_PATH}: forbidden operational key ${trail.join(".")}`);
});
const serialized = JSON.stringify(spec);
if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized)) errors.push(`${SPEC_PATH}: email address must not be stored`);
if (/\+7\d{10}/.test(serialized)) errors.push(`${SPEC_PATH}: phone number must not be stored`);

const sourceFragments = [
  'score >= 65 ? "hot" : score >= 40 ? "warm" : "cold"',
  'status === "hot" ? "срочно обработать"',
  'status === "warm" ? "обработать в рабочий день" : "добавить в прогрев"'
];
sourceFragments.forEach((fragment) => {
  if (!mainSource.includes(fragment)) errors.push(`${MAIN_PATH}: qualification fragment missing: ${fragment}`);
});

const priorityBands = uniqueById(spec.priority_bands, `${SPEC_PATH}:priority_bands`);
exactSet(new Set(priorityBands.keys()), new Set(["hot", "warm", "cold"]), `${SPEC_PATH}: priority bands`);
const priorityExpectations = {
  hot: { rank: 1, rule: "score>=65", guidance: "first_available_work_block" },
  warm: { rank: 2, rule: "40<=score<65", guidance: "same_working_day" },
  cold: { rank: 3, rule: "score<40", guidance: "planned_nurture_cycle" }
};
for (const [id, expected] of Object.entries(priorityExpectations)) {
  const item = priorityBands.get(id) || {};
  if (item.urgency_rank !== expected.rank) errors.push(`${SPEC_PATH}:${id}: invalid urgency_rank`);
  if (item.source_score_rule !== expected.rule) errors.push(`${SPEC_PATH}:${id}: invalid source_score_rule`);
  if (item.response_guidance !== expected.guidance || !allowedGuidance.has(item.response_guidance)) {
    errors.push(`${SPEC_PATH}:${id}: invalid response_guidance`);
  }
  nonEmpty(item.first_action, `${SPEC_PATH}:${id}:first_action`);
  nonEmpty(item.required_outcome, `${SPEC_PATH}:${id}:required_outcome`);
}

const scenarios = Array.isArray(matrix.scenarios) ? matrix.scenarios : [];
if (scenarios.length !== 14) errors.push(`${MATRIX_PATH}: expected 14 scenarios`);
const activeLeadTypes = new Set(scenarios.map((item) => item.lead_type).filter(Boolean));
const activeFormRoles = new Set(scenarios.map((item) => item.form_role).filter(Boolean));
const activeObjectIds = new Set(scenarios.map((item) => item.object_id).filter(Boolean));

const formRoles = uniqueById(spec.form_roles, `${SPEC_PATH}:form_roles`);
exactSet(new Set(formRoles.keys()), activeFormRoles, `${SPEC_PATH}: form role coverage`);
for (const item of formRoles.values()) {
  nonEmpty(item.conversation_goal, `${SPEC_PATH}:${item.id}:conversation_goal`);
  nonEmpty(item.required_outcome, `${SPEC_PATH}:${item.id}:required_outcome`);
  if (!Array.isArray(item.collect_if_missing) || !item.collect_if_missing.length) {
    errors.push(`${SPEC_PATH}:${item.id}: collect_if_missing is required`);
  }
}

const globalNextActions = new Set(Array.isArray(spec.next_actions) ? spec.next_actions : []);
if (globalNextActions.size !== 9) errors.push(`${SPEC_PATH}: expected 9 next actions`);
if (!globalNextActions.has("assign_owner")) errors.push(`${SPEC_PATH}: assign_owner next action is required`);

const leadTypes = uniqueById(spec.lead_types, `${SPEC_PATH}:lead_types`);
exactSet(new Set(leadTypes.keys()), activeLeadTypes, `${SPEC_PATH}: active lead type coverage`);
for (const item of leadTypes.values()) {
  if (!Array.isArray(item.first_questions) || item.first_questions.length < 3) {
    errors.push(`${SPEC_PATH}:${item.id}: at least 3 first_questions required`);
  }
  nonEmpty(item.lead_class, `${SPEC_PATH}:${item.id}:lead_class`);
  nonEmpty(item.required_outcome, `${SPEC_PATH}:${item.id}:required_outcome`);
  if (typeof item.source_check_required_by_default !== "boolean") {
    errors.push(`${SPEC_PATH}:${item.id}: source_check_required_by_default must be boolean`);
  }
  const actions = new Set(Array.isArray(item.allowed_next_actions) ? item.allowed_next_actions : []);
  if (!actions.size) errors.push(`${SPEC_PATH}:${item.id}: allowed_next_actions required`);
  actions.forEach((action) => {
    if (!globalNextActions.has(action)) errors.push(`${SPEC_PATH}:${item.id}: unknown next action ${action}`);
  });
}
if (leadTypes.get("project_consultation")?.source_check_required_by_default !== true) {
  errors.push(`${SPEC_PATH}: project_consultation must require source check by default`);
}

const objectContexts = uniqueById(spec.object_contexts, `${SPEC_PATH}:object_contexts`);
exactSet(new Set(objectContexts.keys()), activeObjectIds, `${SPEC_PATH}: active object coverage`);
const projectMap = new Map(projects.map((item) => [item.id, item]));
for (const [id, context] of objectContexts) {
  nonEmpty(context.first_contact_focus, `${SPEC_PATH}:${id}:first_contact_focus`);
  if (typeof context.source_check_required !== "boolean") errors.push(`${SPEC_PATH}:${id}: source_check_required must be boolean`);
  if (!Array.isArray(context.blocked_claim_categories) || !context.blocked_claim_categories.length) {
    errors.push(`${SPEC_PATH}:${id}: blocked_claim_categories required`);
  }
  if (id === "all-newbuilds") {
    if (context.verification_status !== "neutral_selection_context") errors.push(`${SPEC_PATH}:${id}: invalid neutral status`);
    continue;
  }
  const project = projectMap.get(context.project_registry_id);
  if (!project) {
    errors.push(`${SPEC_PATH}:${id}: project_registry_id not found`);
    continue;
  }
  const expectedPortalId = project.portal_slug || project.slug || project.id;
  if (expectedPortalId !== id) errors.push(`${SPEC_PATH}:${id}: does not match project portal identifier ${expectedPortalId}`);
  if (context.verification_status !== project.verification_status) {
    errors.push(`${SPEC_PATH}:${id}: verification_status must match project registry`);
  }
  if (project.is_public_ready !== false) errors.push(`${PROJECTS_PATH}:${project.id}: expected is_public_ready=false`);
}
if (objectContexts.get("prostornaya-4a")?.source_check_required !== true) errors.push(`${SPEC_PATH}: Просторная 4А must require source check`);
if (objectContexts.get("aerodromnaya-18g")?.source_check_required !== true) errors.push(`${SPEC_PATH}: Аэродромная 18Г must require source check`);
if (objectContexts.get("sennaya-76")?.source_check_required !== true) errors.push(`${SPEC_PATH}: Сенная 76 must require source check`);

const outcomes = uniqueById(spec.contact_outcomes, `${SPEC_PATH}:contact_outcomes`);
if (outcomes.size !== 9) errors.push(`${SPEC_PATH}: expected 9 contact outcomes`);
const expectedOutcomes = new Set([
  "contacted_qualified",
  "contacted_follow_up_scheduled",
  "no_answer_follow_up_planned",
  "source_check_required",
  "selection_started",
  "mortgage_consultation_started",
  "duplicate",
  "invalid_or_spam",
  "do_not_contact"
]);
exactSet(new Set(outcomes.keys()), expectedOutcomes, `${SPEC_PATH}: contact outcomes`);
for (const item of outcomes.values()) {
  if (typeof item.requires_next_action !== "boolean") errors.push(`${SPEC_PATH}:${item.id}: requires_next_action must be boolean`);
}

console.log(`Checked priority bands: ${priorityBands.size}`);
console.log(`Checked form roles: ${formRoles.size}`);
console.log(`Checked active lead types: ${leadTypes.size}`);
console.log(`Checked object contexts: ${objectContexts.size}`);
console.log(`Checked contact outcomes: ${outcomes.size}`);
console.log(`System of record connected: ${rules.system_of_record_available === true}`);
console.log(`Automatic triage enabled: ${rules.automatic_triage_enabled === true}`);
console.log(`Owner assignment enabled: ${rules.automatic_owner_assignment_enabled === true}`);

if (errors.length) {
  console.error("\nLead handling playbook validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Lead handling playbook validation passed.");