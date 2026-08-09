import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const METHOD_PATH = "data/research/city-inventory-method.json";
const COVERAGE_PATH = "data/research/city-catalog-coverage.json";
const PRIORITY_PATH = "data/research/priority-projects.json";
const REFERENCE_PATH = "data/research/reference-projects.json";
const CANDIDATE_PATH = "data/research/reference-candidates.json";
const SOURCE_COLLECTION_PATH = "data/research/source-collection.json";
const RECHECK_PATH = "data/research/source-recheck-plan-2026-09-01.json";
const errors = [];

function readText(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const source = readText(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function existingEvidence(reference, scanId) {
  const value = String(reference || "").trim();
  if (!value) {
    errors.push(`${METHOD_PATH}:${scanId}: empty evidence reference`);
    return false;
  }
  if (/^https:\/\//i.test(value)) return true;
  if (!fs.existsSync(path.join(ROOT, value))) {
    errors.push(`${METHOD_PATH}:${scanId}: evidence file does not exist: ${value}`);
    return false;
  }
  return true;
}

const method = readJson(METHOD_PATH);
const coverage = readJson(COVERAGE_PATH);
const priority = readJson(PRIORITY_PATH);
const reference = readJson(REFERENCE_PATH);
const candidates = readJson(CANDIDATE_PATH);
const sourceCollection = readJson(SOURCE_COLLECTION_PATH);
const recheck = readJson(RECHECK_PATH);

if (!method || !coverage || !priority || !reference || !candidates || !sourceCollection || !recheck) {
  process.exit(1);
}

if (method.schema_version !== "1.0") errors.push(`${METHOD_PATH}: schema_version must be 1.0`);
if (method.portal_id !== "newbuilds-borisoglebsk") errors.push(`${METHOD_PATH}: invalid portal_id`);
if (method.status !== "method_defined_execution_partial") {
  errors.push(`${METHOD_PATH}: status must remain method_defined_execution_partial until execution completes`);
}
if (method.target_scope?.city !== "Борисоглебск") errors.push(`${METHOD_PATH}: target city must be Борисоглебск`);
if (Number(method.target_scope?.built_multifamily_houses_from_year) !== 2018) {
  errors.push(`${METHOD_PATH}: built scope must start from 2018`);
}
if (method.target_scope?.under_construction_multifamily_houses !== true) {
  errors.push(`${METHOD_PATH}: under-construction scope must remain enabled`);
}
if (method.target_scope?.publicly_confirmed_planned_projects !== true) {
  errors.push(`${METHOD_PATH}: planned-public scope must remain enabled`);
}

const requiredRules = [
  "secondary_sources_cannot_close_required_scan",
  "all_discovered_objects_require_registry_mapping",
  "unresolved_objects_require_candidate_registry",
  "final_completion_requires_all_required_scans_passed",
  "completion_requires_zero_unmapped_observations",
  "completion_requires_primary_permit_or_registry_scan",
  "completion_requires_eiszh_or_equivalent_primary_project_scan",
  "completion_requires_municipal_or_official_planning_scan",
  "historical_failed_or_blocked_results_must_not_be_rewritten"
];
for (const key of requiredRules) {
  if (method.rules?.[key] !== true) errors.push(`${METHOD_PATH}: rules.${key} must be true`);
}

const expectedSources = {
  coverage_map: COVERAGE_PATH,
  priority_registry: PRIORITY_PATH,
  reference_registry: REFERENCE_PATH,
  candidate_registry: CANDIDATE_PATH,
  source_collection: SOURCE_COLLECTION_PATH,
  permit_recheck_plan: RECHECK_PATH
};
for (const [key, expected] of Object.entries(expectedSources)) {
  if (method.sources_of_truth?.[key] !== expected) {
    errors.push(`${METHOD_PATH}: sources_of_truth.${key} must be ${expected}`);
  }
}

const requiredScanIds = new Set([
  "secondary_marketplace_current_scan",
  "secondary_housing_stock_scan_2018_plus",
  "primary_permit_and_commissioning_registry_scan",
  "eiszh_primary_project_scan",
  "official_developer_project_scan",
  "municipal_planning_and_address_scan",
  "registry_entity_reconciliation"
]);
const allowedStatuses = new Set([
  "completed_discovery_only",
  "completed_with_known_omissions",
  "scheduled_not_started",
  "partial_access_limited",
  "in_progress",
  "access_limited_pending",
  "passed"
]);
const scans = Array.isArray(method.required_scans) ? method.required_scans : [];
if (scans.length !== requiredScanIds.size) {
  errors.push(`${METHOD_PATH}: required_scans must contain exactly ${requiredScanIds.size} scans`);
}

const scanById = new Map();
for (const scan of scans) {
  const id = String(scan?.id || "").trim();
  if (!id) {
    errors.push(`${METHOD_PATH}: scan without id`);
    continue;
  }
  if (scanById.has(id)) errors.push(`${METHOD_PATH}: duplicate scan ${id}`);
  scanById.set(id, scan);
  if (!requiredScanIds.has(id)) errors.push(`${METHOD_PATH}: unexpected scan ${id}`);
  if (!allowedStatuses.has(scan.status)) errors.push(`${METHOD_PATH}:${id}: invalid status ${scan.status}`);
  if (!String(scan.authority_class || "").trim()) errors.push(`${METHOD_PATH}:${id}: authority_class is required`);
  if (!String(scan.completeness_effect || "").trim()) errors.push(`${METHOD_PATH}:${id}: completeness_effect is required`);
  if (!Array.isArray(scan.evidence) || scan.evidence.length < 1) {
    errors.push(`${METHOD_PATH}:${id}: evidence is required`);
  } else {
    scan.evidence.forEach((item) => existingEvidence(item, id));
  }
  if (!Array.isArray(scan.limitations) || scan.limitations.length < 1) {
    errors.push(`${METHOD_PATH}:${id}: limitations are required`);
  }
  if (!String(scan.next_action || "").trim()) errors.push(`${METHOD_PATH}:${id}: next_action is required`);

  if (scan.authority_class === "secondary") {
    if (scan.completeness_effect !== "none") {
      errors.push(`${METHOD_PATH}:${id}: secondary scan cannot close inventory completeness`);
    }
    if (scan.status === "passed") {
      errors.push(`${METHOD_PATH}:${id}: secondary scan must remain discovery-only, not primary passed`);
    }
  }
}
for (const id of requiredScanIds) {
  if (!scanById.has(id)) errors.push(`${METHOD_PATH}: missing required scan ${id}`);
}

const permitScan = scanById.get("primary_permit_and_commissioning_registry_scan");
if (permitScan?.not_before !== recheck.recheck_not_before) {
  errors.push(`${METHOD_PATH}: permit scan not_before must match ${RECHECK_PATH}.recheck_not_before`);
}
if (permitScan?.status === "passed" && new Date(`${permitScan.not_before}T00:00:00Z`) > new Date()) {
  errors.push(`${METHOD_PATH}: permit scan cannot be passed before its not_before date`);
}

const summary = coverage.coverage_summary || {};
const completion = method.completion_state || {};
if (Number(completion.unmapped_observations) !== Number(summary.unmapped_observations)) {
  errors.push(`${METHOD_PATH}: completion_state.unmapped_observations must match coverage map`);
}
if (completion.coverage_research_queue_complete !== summary.research_queue_complete) {
  errors.push(`${METHOD_PATH}: coverage_research_queue_complete must match coverage map`);
}

const actualPassedIds = scans.filter((scan) => scan.status === "passed").map((scan) => scan.id).sort();
const declaredPassedIds = Array.isArray(completion.required_scan_ids_passed)
  ? [...completion.required_scan_ids_passed].sort()
  : [];
if (JSON.stringify(actualPassedIds) !== JSON.stringify(declaredPassedIds)) {
  errors.push(`${METHOD_PATH}: required_scan_ids_passed must match scans with status=passed`);
}

const requiredForCompletion = scans
  .filter((scan) => ["required_for_completion", "supporting_required"].includes(scan.completeness_effect))
  .map((scan) => scan.id);
const expectedBlocking = requiredForCompletion.filter((id) => scanById.get(id)?.status !== "passed").sort();
const declaredBlocking = Array.isArray(completion.blocking_scan_ids) ? [...completion.blocking_scan_ids].sort() : [];
if (JSON.stringify(expectedBlocking) !== JSON.stringify(declaredBlocking)) {
  errors.push(`${METHOD_PATH}: blocking_scan_ids must match non-passed required scans`);
}

const allRequiredPassed = expectedBlocking.length === 0;
const zeroUnmapped = Number(summary.unmapped_observations) === 0;
const coverageComplete = summary.research_queue_complete === true;
const canComplete = allRequiredPassed && zeroUnmapped && coverageComplete;

if (method.rules?.inventory_complete_allowed !== canComplete) {
  errors.push(`${METHOD_PATH}: rules.inventory_complete_allowed must equal derived completion capability (${canComplete})`);
}
if (completion.inventory_complete !== canComplete) {
  errors.push(`${METHOD_PATH}: completion_state.inventory_complete must equal derived completion capability (${canComplete})`);
}
if (completion.completion_claim !== (canComplete ? "allowed" : "not_allowed")) {
  errors.push(`${METHOD_PATH}: completion_claim inconsistent with derived completion capability`);
}

if (completion.inventory_complete === true) {
  if (method.status !== "method_defined_execution_complete") {
    errors.push(`${METHOD_PATH}: complete inventory requires status=method_defined_execution_complete`);
  }
  if ((candidates.candidates || []).some((item) => item.status !== "promoted")) {
    errors.push(`${METHOD_PATH}: complete inventory cannot leave unresolved candidates`);
  }
  if ((priority.projects || []).some((item) => item.is_public_ready !== true)) {
    errors.push(`${METHOD_PATH}: complete inventory claim requires priority projects reconciled to public-ready or separately re-scoped`);
  }
}

console.log(`Inventory scans: ${scans.length}`);
console.log(`Passed required scans: ${actualPassedIds.length}`);
console.log(`Blocking scans: ${expectedBlocking.length}`);
console.log(`Coverage unmapped observations: ${Number(summary.unmapped_observations || 0)}`);
console.log(`Coverage research queue complete: ${coverageComplete}`);
console.log(`Inventory complete allowed: ${canComplete}`);

if (errors.length) {
  console.error("\nCity inventory method validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("City inventory method validation passed.");
