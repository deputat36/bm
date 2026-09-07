import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RESULT_PATH = "data/research/source-recheck-result-2026-09-07.json";
const PLAN_PATH = "data/research/source-recheck-plan-2026-09-01.json";
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

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function isHttps(value) {
  return /^https:\/\//i.test(String(value || ""));
}

const result = readJson(RESULT_PATH);
const plan = readJson(PLAN_PATH);
if (!result || !plan) process.exit(1);

if (result.schema_version !== "1.0") errors.push(`${RESULT_PATH}: schema_version must be 1.0`);
if (result.portal_id !== "newbuilds-borisoglebsk") errors.push(`${RESULT_PATH}: invalid portal_id`);
if (result.plan_reference !== PLAN_PATH) errors.push(`${RESULT_PATH}: plan_reference must be ${PLAN_PATH}`);
if (result.status !== "executed_access_limited_no_acceptance") {
  errors.push(`${RESULT_PATH}: historical result status must remain executed_access_limited_no_acceptance`);
}
if (!isIsoDate(result.executed_at)) errors.push(`${RESULT_PATH}: executed_at must be YYYY-MM-DD`);
if (isIsoDate(result.executed_at) && isIsoDate(plan.recheck_not_before) && result.executed_at < plan.recheck_not_before) {
  errors.push(`${RESULT_PATH}: execution cannot predate planned recheck ${plan.recheck_not_before}`);
}

for (const [key, expected] of Object.entries({
  result_has_no_publication_effect: true,
  negative_search_result_is_not_proof_of_absence: true,
  secondary_sources_cannot_close_task: true,
  accepted_requires_exact_object_match: true,
  accepted_requires_repository_evidence: true,
  accepted_requires_source_collection_update: true
})) {
  if (result.rules?.[key] !== expected) errors.push(`${RESULT_PATH}: rules.${key} must be ${expected}`);
}

const regional = result.authority_resolution?.regional_or_municipal_permits;
if (regional?.system_name !== "ГИС ОГД Воронежской области") {
  errors.push(`${RESULT_PATH}: regional permit authority route must be ГИС ОГД Воронежской области`);
}
if (!isHttps(regional?.public_portal)) errors.push(`${RESULT_PATH}: regional public portal must be HTTPS`);
if (regional?.status !== "primary_route_identified_direct_record_not_obtained") {
  errors.push(`${RESULT_PATH}: regional route status must preserve access limitation`);
}
if (!Array.isArray(regional?.legal_basis) || regional.legal_basis.length < 2) {
  errors.push(`${RESULT_PATH}: at least two authority references are required`);
} else {
  for (const item of regional.legal_basis) {
    if (!isHttps(item.reference)) errors.push(`${RESULT_PATH}: authority reference must be HTTPS: ${item.title || "unknown"}`);
    if (!String(item.supports || "").trim()) errors.push(`${RESULT_PATH}: authority reference must explain what it supports`);
  }
}

const federal = result.authority_resolution?.federal_registry;
if (federal?.system_name !== "ЕГИС Стройкомплекс.РФ") errors.push(`${RESULT_PATH}: federal system name mismatch`);
if (!isHttps(federal?.reference)) errors.push(`${RESULT_PATH}: federal registry reference must be HTTPS`);
if (federal?.status !== "federal_registry_effective_but_not_sufficient_as_sole_expected_route_for_local_permits") {
  errors.push(`${RESULT_PATH}: federal/local authority boundary must stay explicit`);
}

if (result.execution?.direct_registry_record_export_obtained !== false) {
  errors.push(`${RESULT_PATH}: direct registry record/export was not obtained in this historical pass`);
}
if (!Array.isArray(result.execution?.source_collection_tasks_changed) || result.execution.source_collection_tasks_changed.length !== 0) {
  errors.push(`${RESULT_PATH}: no source collection task may be marked changed without accepted primary evidence`);
}
if (result.execution?.publication_effect !== "none") errors.push(`${RESULT_PATH}: publication effect must remain none`);

const expectedIds = new Set(["aerodromnaya-18g", "sennaya-76"]);
const projects = Array.isArray(result.projects) ? result.projects : [];
if (projects.length !== 2) errors.push(`${RESULT_PATH}: exactly two project results are required`);
for (const project of projects) {
  if (!expectedIds.has(project.project_id)) errors.push(`${RESULT_PATH}: unexpected project ${project.project_id}`);
  expectedIds.delete(project.project_id);
  if (!isIsoDate(project.checked_at)) errors.push(`${RESULT_PATH}:${project.project_id}: checked_at must be YYYY-MM-DD`);
  if (project.checked_at !== result.executed_at) errors.push(`${RESULT_PATH}:${project.project_id}: checked_at must equal executed_at`);
  if (project.result !== "not_found_recheck_required") {
    errors.push(`${RESULT_PATH}:${project.project_id}: no primary record was accepted in this historical recheck`);
  }
  if (!isHttps(project.source_reference)) errors.push(`${RESULT_PATH}:${project.project_id}: source_reference must be HTTPS`);
  if (!Array.isArray(project.matched_identifiers) || project.matched_identifiers.length !== 0) {
    errors.push(`${RESULT_PATH}:${project.project_id}: matched_identifiers must remain empty without an exact primary record`);
  }
  if (!Array.isArray(project.source_tasks_affected) || project.source_tasks_affected.length !== 0) {
    errors.push(`${RESULT_PATH}:${project.project_id}: source_tasks_affected must remain empty without acceptance`);
  }
  if (!String(project.evidence_note || "").includes("не считается доказательством отсутствия документа")) {
    errors.push(`${RESULT_PATH}:${project.project_id}: evidence_note must preserve negative-search boundary`);
  }
  if (!String(project.next_action || "").trim()) errors.push(`${RESULT_PATH}:${project.project_id}: next_action is required`);
}
if (expectedIds.size) errors.push(`${RESULT_PATH}: missing project result(s): ${[...expectedIds].join(", ")}`);

const conclusion = result.conclusion || {};
if (conclusion.accepted_records !== 0) errors.push(`${RESULT_PATH}: accepted_records must remain 0`);
if (conclusion.candidate_records_promoted !== 0) errors.push(`${RESULT_PATH}: candidate_records_promoted must remain 0`);
if (conclusion.source_tasks_closed !== 0) errors.push(`${RESULT_PATH}: source_tasks_closed must remain 0`);
if (conclusion.recheck_completed !== true) errors.push(`${RESULT_PATH}: recheck_completed must be true`);
if (conclusion.permit_inventory_scan_complete !== false) errors.push(`${RESULT_PATH}: permit inventory scan must remain incomplete`);
if (!String(conclusion.blocking_reason || "").trim()) errors.push(`${RESULT_PATH}: blocking_reason is required`);
if (!String(conclusion.next_recheck_trigger || "").trim()) errors.push(`${RESULT_PATH}: next_recheck_trigger is required`);

console.log(`Executed source recheck: ${result.executed_at}`);
console.log(`Projects checked: ${projects.length}`);
console.log(`Accepted primary records: ${conclusion.accepted_records}`);
console.log(`Permit inventory scan complete: ${conclusion.permit_inventory_scan_complete}`);

if (errors.length) {
  console.error("\nSource recheck result validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Source recheck result validation passed.");
