import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PLAN_PATH = "data/research/source-recheck-plan-2026-09-01.json";
const SOURCE_PATH = "data/research/source-collection.json";
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

function isHttps(value) {
  return /^https:\/\//i.test(String(value || ""));
}

const plan = readJson(PLAN_PATH);
const sourceCollection = readJson(SOURCE_PATH);
if (!plan || !sourceCollection) process.exit(1);

if (plan.schema_version !== "1.0") errors.push(`${PLAN_PATH}: schema_version must be 1.0`);
if (plan.portal_id !== "newbuilds-borisoglebsk") errors.push(`${PLAN_PATH}: invalid portal_id`);
if (plan.status !== "scheduled_source_recheck_not_acceptance") {
  errors.push(`${PLAN_PATH}: status must remain scheduled_source_recheck_not_acceptance`);
}

const createdAt = String(plan.created_at || "");
const recheckDate = String(plan.recheck_not_before || "");
const registryEffective = String(plan.authority_context?.future_federal_registry?.effective_from || "");
if (!/^\d{4}-\d{2}-\d{2}$/.test(createdAt)) errors.push(`${PLAN_PATH}: created_at must be YYYY-MM-DD`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(recheckDate)) errors.push(`${PLAN_PATH}: recheck_not_before must be YYYY-MM-DD`);
if (recheckDate !== registryEffective) errors.push(`${PLAN_PATH}: recheck date must match federal registry effective date`);
if (createdAt && recheckDate && createdAt >= recheckDate) errors.push(`${PLAN_PATH}: recheck must be after plan creation date`);

for (const [key, expected] of Object.entries({
  plan_has_no_publication_effect: true,
  recheck_date_is_not_acceptance_date: true,
  exact_address_or_land_plot_match_required: true,
  permit_registry_record_must_match_object: true,
  secondary_search_results_cannot_close_task: true,
  negative_search_result_is_not_proof_of_absence: true,
  accepted_status_requires_saved_evidence: true
})) {
  if (plan.rules?.[key] !== expected) errors.push(`${PLAN_PATH}: rules.${key} must be ${expected}`);
}

const municipal = plan.authority_context?.current_municipal_channel;
if (!municipal || !isHttps(municipal.official_site)) errors.push(`${PLAN_PATH}: current municipal official_site must be HTTPS`);
if (!String(municipal?.department || "").includes("архитектур")) errors.push(`${PLAN_PATH}: architecture department must be identified`);
if (!String(municipal?.current_crawler_status || "").startsWith("403_")) errors.push(`${PLAN_PATH}: current crawler limitation must remain explicit`);

const federal = plan.authority_context?.future_federal_registry;
if (federal?.system_name !== "ЕГИС Стройкомплекс.РФ") errors.push(`${PLAN_PATH}: future system name must be ЕГИС Стройкомплекс.РФ`);
if (!Array.isArray(federal?.registry_scope) || federal.registry_scope.length < 2) errors.push(`${PLAN_PATH}: both construction and commissioning registries are required`);
if (!Array.isArray(federal?.legal_basis) || federal.legal_basis.length < 2) {
  errors.push(`${PLAN_PATH}: legal basis must contain at least two references`);
} else {
  for (const item of federal.legal_basis) {
    if (!isHttps(item.reference)) errors.push(`${PLAN_PATH}: legal basis reference must be HTTPS: ${item.title || "unknown"}`);
    if (!String(item.supports || "").includes("01.09.2026")) errors.push(`${PLAN_PATH}: legal basis must state effective date 01.09.2026`);
  }
}

const sourceProjects = new Map((sourceCollection.projects || []).map((project) => [project.project_id, project]));
const expectedProjectIds = new Set(["aerodromnaya-18g", "sennaya-76"]);
const planProjects = Array.isArray(plan.projects) ? plan.projects : [];
const planProjectIds = new Set(planProjects.map((project) => project.project_id));
if (planProjects.length !== 2 || [...expectedProjectIds].some((id) => !planProjectIds.has(id))) {
  errors.push(`${PLAN_PATH}: plan must contain exactly aerodromnaya-18g and sennaya-76`);
}

for (const project of planProjects) {
  const sourceProject = sourceProjects.get(project.project_id);
  if (!sourceProject) {
    errors.push(`${SOURCE_PATH}: missing project ${project.project_id}`);
    continue;
  }

  const tasks = new Map((sourceProject.tasks || []).map((task) => [task.id, task]));
  const snapshot = project.current_source_state || {};
  if (Object.keys(snapshot).length !== tasks.size) {
    errors.push(`${PLAN_PATH}:${project.project_id}: current_source_state must snapshot all ${tasks.size} source tasks`);
  }

  for (const [taskId, expectedStatus] of Object.entries(snapshot)) {
    const task = tasks.get(taskId);
    if (!task) {
      errors.push(`${PLAN_PATH}:${project.project_id}: unknown source task ${taskId}`);
      continue;
    }
    if (task.status !== expectedStatus) {
      errors.push(`${PLAN_PATH}:${project.project_id}:${taskId}: snapshot=${expectedStatus}, current=${task.status}; update or retire recheck plan`);
    }
  }

  if (!Array.isArray(project.registry_queries) || project.registry_queries.length < 3) {
    errors.push(`${PLAN_PATH}:${project.project_id}: registry_queries must be explicit`);
  }
  if (!Array.isArray(project.acceptance_targets) || project.acceptance_targets.length < 5) {
    errors.push(`${PLAN_PATH}:${project.project_id}: acceptance_targets must be explicit`);
  }
  if (!Array.isArray(project.closes_only_if_evidence_matches) || project.closes_only_if_evidence_matches.length < 2) {
    errors.push(`${PLAN_PATH}:${project.project_id}: closes_only_if_evidence_matches is required`);
  } else {
    for (const taskId of project.closes_only_if_evidence_matches) {
      const task = tasks.get(taskId);
      if (!task) errors.push(`${PLAN_PATH}:${project.project_id}: close target ${taskId} does not exist`);
      if (task && !["primary_required", "rights_evidence_required"].includes(task.authority)) {
        errors.push(`${PLAN_PATH}:${project.project_id}:${taskId}: close target must remain primary/rights evidence gated`);
      }
    }
  }
}

const resultSchema = plan.execution_result_schema || {};
const allowedResults = new Set(resultSchema.allowed_results || []);
for (const required of ["accepted", "candidate_found", "not_found_recheck_required", "conflict_requires_resolution"]) {
  if (!allowedResults.has(required)) errors.push(`${PLAN_PATH}: allowed_results missing ${required}`);
}
for (const required of ["checked_at", "source_reference", "matched_identifiers", "evidence_note", "result"]) {
  if (!(resultSchema.required_fields || []).includes(required)) errors.push(`${PLAN_PATH}: required_fields missing ${required}`);
}
for (const required of ["primary_or_official_registry_source", "exact_object_match", "repository_evidence_saved", "source_collection_task_updated"]) {
  if (!(resultSchema.accepted_requires || []).includes(required)) errors.push(`${PLAN_PATH}: accepted_requires missing ${required}`);
}

console.log(`Recheck date: ${recheckDate}`);
console.log(`Projects checked: ${planProjects.length}`);
console.log(`Source queue projects linked: ${planProjects.filter((project) => sourceProjects.has(project.project_id)).length}`);

if (errors.length) {
  console.error("\nSource recheck plan validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Source recheck plan validation passed.");
