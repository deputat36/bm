import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = "data/operations/lead-handoff.json";
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

function asUniqueIds(items, label) {
  if (!Array.isArray(items)) {
    errors.push(`${label}: expected array`);
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

function setEquals(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    errors.push(`${label}: expected [${right.join(", ")}], got [${left.join(", ")}]`);
  }
}

const spec = readJson(SPEC_PATH);
if (!spec) process.exit(1);

const playbook = readJson(spec.sources?.handling_playbook || "");
const lifecycle = readJson(spec.sources?.lifecycle_contract || "");
const matrix = readJson(spec.sources?.form_matrix || "");
const projects = readJson(spec.sources?.project_registry || "");
if (!playbook || !lifecycle || !matrix || !projects) process.exit(1);

if (spec.schema_version !== "1.0") errors.push(`${SPEC_PATH}: schema_version must be 1.0`);
if (spec.portal_id !== "newbuilds-borisoglebsk") errors.push(`${SPEC_PATH}: unexpected portal_id`);
if (spec.portal_id !== playbook.portal_id || spec.portal_id !== lifecycle.portal_id) {
  errors.push(`${SPEC_PATH}: portal_id must match operation sources`);
}
if (spec.status !== "draft_contract_not_connected") errors.push(`${SPEC_PATH}: status must remain draft_contract_not_connected`);

const rules = spec.rules || {};
[
  "runtime_email_payload_changed",
  "crm_connected",
  "automatic_owner_assignment_enabled",
  "approved_sla_exists",
  "generated_reports_contain_personal_values",
  "analytics_export_enabled"
].forEach((key) => {
  if (rules[key] !== false) errors.push(`${SPEC_PATH}: ${key} must be false`);
});

if (rules.initial_lifecycle_state !== lifecycle.rules?.initial_state || rules.initial_lifecycle_state !== "received") {
  errors.push(`${SPEC_PATH}: initial lifecycle state must match received`);
}

const expectedDimensions = new Set(["qualification_status", "form_role", "lead_type", "residential_complex_id"]);
setEquals(new Set(rules.template_dimensions || []), expectedDimensions, `${SPEC_PATH}:template_dimensions`);

const priorities = asUniqueIds(playbook.priority_bands, "priority_bands");
const roles = asUniqueIds(playbook.form_roles, "form_roles");
const leadTypes = asUniqueIds(playbook.lead_types, "lead_types");
const objectContexts = asUniqueIds(playbook.object_contexts, "object_contexts");

if (priorities.size !== 3) errors.push("priority_bands: expected 3 priorities");
if (roles.size !== 2) errors.push("form_roles: expected 2 roles");
if (leadTypes.size !== 3) errors.push("lead_types: expected 3 lead types");
if (objectContexts.size !== 4) errors.push("object_contexts: expected 4 object contexts");

const expectedTemplates = priorities.size * roles.size * leadTypes.size * objectContexts.size;
if (rules.expected_route_templates !== expectedTemplates || expectedTemplates !== 72) {
  errors.push(`${SPEC_PATH}: expected_route_templates must equal 72`);
}

const matrixRoles = new Set((matrix.scenarios || []).map((item) => item.form_role).filter(Boolean));
const matrixLeadTypes = new Set((matrix.scenarios || []).map((item) => item.lead_type).filter(Boolean));
const matrixObjects = new Set((matrix.scenarios || []).map((item) => item.object_id).filter(Boolean));
setEquals(matrixRoles, new Set(roles.keys()), "form matrix roles");
setEquals(matrixLeadTypes, new Set(leadTypes.keys()), "form matrix lead types");
setEquals(matrixObjects, new Set(objectContexts.keys()), "form matrix objects");

const projectMap = new Map((Array.isArray(projects) ? projects : []).map((item) => [item.id, item]));
for (const context of objectContexts.values()) {
  if (!context.project_registry_id) continue;
  const project = projectMap.get(context.project_registry_id);
  if (!project) {
    errors.push(`object context ${context.id}: unknown project_registry_id ${context.project_registry_id}`);
    continue;
  }
  const expectedObjectId = project.portal_slug || project.slug || project.id;
  if (expectedObjectId !== context.id) {
    errors.push(`object context ${context.id}: project registry resolves to ${expectedObjectId}`);
  }
  if (project.verification_status !== context.verification_status) {
    errors.push(`object context ${context.id}: verification status differs from project registry`);
  }
}

const requiredSections = new Set(["routing", "context", "action", "attribution"]);
const sections = asUniqueIds(spec.packet_sections, "packet_sections");
setEquals(new Set(sections.keys()), requiredSections, "packet sections");

const requiredFields = new Set([
  "handling_contract_version",
  "lead_lifecycle_state",
  "qualification_status",
  "response_guidance",
  "form_role",
  "lead_type",
  "residential_complex_id",
  "source_check_required",
  "conversation_goal",
  "object_handling_focus",
  "recommended_first_action",
  "required_contact_outcome",
  "allowed_next_actions",
  "form_id",
  "lead_source",
  "placement"
]);
const seenFields = new Set();
for (const section of sections.values()) {
  if (!Array.isArray(section.fields) || !section.fields.length) errors.push(`packet section ${section.id}: fields required`);
  for (const field of section.fields || []) {
    if (seenFields.has(field)) errors.push(`packet field ${field}: duplicated across sections`);
    seenFields.add(field);
  }
}
setEquals(seenFields, requiredFields, "packet fields");

const runtimeContact = spec.runtime_contact_fields || {};
if (runtimeContact.handled_by_delivery_layer !== true || runtimeContact.excluded_from_generated_reports !== true) {
  errors.push(`${SPEC_PATH}: runtime contact fields must stay in delivery layer and outside generated reports`);
}
setEquals(new Set(runtimeContact.fields || []), new Set(["name", "phone", "personal_data_consent"]), "runtime contact fields");

const labels = spec.rendering?.response_guidance_labels || {};
for (const priority of priorities.values()) {
  if (!labels[priority.response_guidance]) errors.push(`rendering: missing label for ${priority.response_guidance}`);
  if (!priority.first_action || !priority.required_outcome) errors.push(`priority ${priority.id}: action and outcome required`);
}
for (const role of roles.values()) {
  if (!role.conversation_goal || !role.required_outcome) errors.push(`role ${role.id}: conversation goal and outcome required`);
}
for (const leadType of leadTypes.values()) {
  if (!Array.isArray(leadType.allowed_next_actions) || !leadType.allowed_next_actions.length) {
    errors.push(`lead type ${leadType.id}: allowed_next_actions required`);
  }
}
for (const context of objectContexts.values()) {
  if (typeof context.source_check_required !== "boolean") errors.push(`object context ${context.id}: source_check_required must be boolean`);
  if (!context.first_contact_focus) errors.push(`object context ${context.id}: first_contact_focus required`);
}

const serialized = JSON.stringify(spec);
if (/\+7\d{10}/.test(serialized) || /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized)) {
  errors.push(`${SPEC_PATH}: generated contract must not contain contact values`);
}
if (/sla_minutes|sla_hours|owner_email|assignee|manager_id/i.test(serialized)) {
  errors.push(`${SPEC_PATH}: live SLA or owner assignment fields are forbidden`);
}

console.log(`Checked handoff templates: ${expectedTemplates}`);
console.log(`Checked packet sections: ${sections.size}`);
console.log(`Checked packet fields: ${seenFields.size}`);
console.log(`Checked object contexts: ${objectContexts.size}`);

if (errors.length) {
  console.error("\nLead handoff validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Lead handoff contract validation passed.");
