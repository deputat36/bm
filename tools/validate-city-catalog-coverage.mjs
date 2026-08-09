import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const COVERAGE_PATH = "data/research/city-catalog-coverage.json";
const PRIORITY_PATH = "data/research/priority-projects.json";
const REFERENCE_PATH = "data/research/reference-projects.json";
const CANDIDATE_PATH = "data/research/reference-candidates.json";
const CATALOG_PATH = "catalog/index.html";
const RUNTIME_PATH = "assets/js/reference-catalog.js";
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

function setEquals(actual, expected) {
  if (actual.size !== expected.size) return false;
  return [...actual].every((value) => expected.has(value));
}

function requireBooleanRule(rules, key, expected) {
  if (rules?.[key] !== expected) {
    errors.push(`${COVERAGE_PATH}: rules.${key} must be ${expected}`);
  }
}

function validateSourceUrl(value, sourceId) {
  const url = String(value || "");
  if (/^https:\/\//i.test(url)) return;
  if (url === `repo:${PRIORITY_PATH}`) return;
  errors.push(`${COVERAGE_PATH}:${sourceId}: invalid source URL ${url || "<empty>"}`);
}

const coverage = readJson(COVERAGE_PATH);
const priority = readJson(PRIORITY_PATH);
const reference = readJson(REFERENCE_PATH);
const candidates = readJson(CANDIDATE_PATH);
const catalogHtml = readText(CATALOG_PATH);
const runtimeSource = readText(RUNTIME_PATH);

if (!coverage || !priority || !reference || !candidates || !catalogHtml || !runtimeSource) {
  process.exit(1);
}

if (coverage.schema_version !== "1.0") errors.push(`${COVERAGE_PATH}: schema_version must be 1.0`);
if (coverage.portal_id !== "newbuilds-borisoglebsk") errors.push(`${COVERAGE_PATH}: invalid portal_id`);
if (coverage.status !== "coverage_snapshot_not_completeness_claim") {
  errors.push(`${COVERAGE_PATH}: status must remain coverage_snapshot_not_completeness_claim`);
}

requireBooleanRule(coverage.rules, "completeness_claim_allowed", false);
requireBooleanRule(coverage.rules, "absence_from_discovery_source_is_not_proof_of_absence", true);
requireBooleanRule(coverage.rules, "secondary_source_is_discovery_only", true);
requireBooleanRule(coverage.rules, "every_observed_object_requires_registry_mapping", true);
requireBooleanRule(coverage.rules, "unresolved_object_must_map_to_candidate", true);
requireBooleanRule(coverage.rules, "priority_and_reference_registries_remain_authoritative", true);

const priorityIds = new Set((priority.projects || []).map((item) => item.id));
const referenceIds = new Set((reference.projects || []).map((item) => item.id));
const candidateById = new Map((candidates.candidates || []).map((item) => [item.id, item]));
const unresolvedCandidateIds = new Set(
  [...candidateById.values()]
    .filter((item) => item.status !== "promoted")
    .map((item) => item.id)
);

const snapshotPriorityIds = new Set(coverage.registry_snapshot?.priority_project_ids || []);
const snapshotReferenceIds = new Set(coverage.registry_snapshot?.reference_project_ids || []);
const snapshotCandidateIds = new Set(coverage.registry_snapshot?.unresolved_candidate_ids || []);

if (!setEquals(snapshotPriorityIds, priorityIds)) {
  errors.push(`${COVERAGE_PATH}: registry_snapshot.priority_project_ids must match ${PRIORITY_PATH}`);
}
if (!setEquals(snapshotReferenceIds, referenceIds)) {
  errors.push(`${COVERAGE_PATH}: registry_snapshot.reference_project_ids must match ${REFERENCE_PATH}`);
}
if (!setEquals(snapshotCandidateIds, unresolvedCandidateIds)) {
  errors.push(`${COVERAGE_PATH}: registry_snapshot.unresolved_candidate_ids must match unresolved ${CANDIDATE_PATH}`);
}

if (!Array.isArray(coverage.discovery_sources) || coverage.discovery_sources.length < 1) {
  errors.push(`${COVERAGE_PATH}: discovery_sources must be a non-empty array`);
}

const sourceIds = new Set();
let observationCount = 0;
let unmappedCount = 0;
const observedPriority = new Set();
const observedReference = new Set();
const observedCandidates = new Set();

for (const source of coverage.discovery_sources || []) {
  const sourceId = String(source?.id || "").trim();
  if (!sourceId) {
    errors.push(`${COVERAGE_PATH}: discovery source without id`);
    continue;
  }
  if (sourceIds.has(sourceId)) errors.push(`${COVERAGE_PATH}: duplicate discovery source id ${sourceId}`);
  sourceIds.add(sourceId);

  if (!String(source.source_class || "").trim()) errors.push(`${COVERAGE_PATH}:${sourceId}: source_class is required`);
  if (!String(source.title || "").trim()) errors.push(`${COVERAGE_PATH}:${sourceId}: title is required`);
  if (!String(source.checked_at || "").trim()) errors.push(`${COVERAGE_PATH}:${sourceId}: checked_at is required`);
  validateSourceUrl(source.url, sourceId);

  if (!Array.isArray(source.observed_objects) || source.observed_objects.length < 1) {
    errors.push(`${COVERAGE_PATH}:${sourceId}: observed_objects must be non-empty`);
    continue;
  }

  for (const observation of source.observed_objects) {
    observationCount += 1;
    if (!String(observation.observed_label || "").trim()) {
      errors.push(`${COVERAGE_PATH}:${sourceId}: observation missing observed_label`);
    }
    if (!String(observation.observed_address || "").trim()) {
      errors.push(`${COVERAGE_PATH}:${sourceId}:${observation.observed_label || "<unknown>"}: observed_address is required`);
    }

    const registry = observation.mapping?.registry;
    const projectId = String(observation.mapping?.project_id || "").trim();
    if (!projectId || !["priority", "reference", "candidate"].includes(registry)) {
      unmappedCount += 1;
      errors.push(`${COVERAGE_PATH}:${sourceId}:${observation.observed_label || "<unknown>"}: valid registry mapping is required`);
      continue;
    }

    if (registry === "priority") {
      if (!priorityIds.has(projectId)) {
        errors.push(`${COVERAGE_PATH}:${sourceId}:${projectId}: unknown priority project`);
      } else {
        observedPriority.add(projectId);
      }
    }

    if (registry === "reference") {
      if (!referenceIds.has(projectId)) {
        errors.push(`${COVERAGE_PATH}:${sourceId}:${projectId}: unknown reference project`);
      } else {
        observedReference.add(projectId);
      }
    }

    if (registry === "candidate") {
      const candidate = candidateById.get(projectId);
      if (!candidate) {
        errors.push(`${COVERAGE_PATH}:${sourceId}:${projectId}: unknown candidate`);
      } else if (candidate.status === "promoted") {
        errors.push(`${COVERAGE_PATH}:${sourceId}:${projectId}: promoted candidate must map to reference instead of candidate`);
      } else {
        observedCandidates.add(projectId);
      }
    }
  }
}

const summary = coverage.coverage_summary || {};
if (Number(summary.priority_projects_accounted_for) !== priorityIds.size) {
  errors.push(`${COVERAGE_PATH}: priority_projects_accounted_for must equal current priority registry size`);
}
if (Number(summary.reference_projects_accounted_for) !== referenceIds.size) {
  errors.push(`${COVERAGE_PATH}: reference_projects_accounted_for must equal current reference registry size`);
}
if (Number(summary.unresolved_candidates_accounted_for) !== unresolvedCandidateIds.size) {
  errors.push(`${COVERAGE_PATH}: unresolved_candidates_accounted_for must equal unresolved candidate registry size`);
}
if (Number(summary.observations_mapped) !== observationCount) {
  errors.push(`${COVERAGE_PATH}: observations_mapped must equal ${observationCount}`);
}
if (Number(summary.unmapped_observations) !== unmappedCount || unmappedCount !== 0) {
  errors.push(`${COVERAGE_PATH}: unmapped_observations must remain 0`);
}
if (summary.research_queue_complete !== false) {
  errors.push(`${COVERAGE_PATH}: research_queue_complete must remain false until an explicit completeness methodology is completed`);
}
if (!Array.isArray(summary.known_limitations) || summary.known_limitations.length < 3) {
  errors.push(`${COVERAGE_PATH}: known_limitations must document discovery limitations`);
}

for (const id of priorityIds) {
  if (!observedPriority.has(id)) errors.push(`${COVERAGE_PATH}: priority project ${id} is absent from coverage observations`);
}
for (const id of referenceIds) {
  if (!observedReference.has(id)) errors.push(`${COVERAGE_PATH}: reference project ${id} is absent from coverage observations`);
}
for (const id of unresolvedCandidateIds) {
  if (!observedCandidates.has(id)) errors.push(`${COVERAGE_PATH}: unresolved candidate ${id} is absent from coverage observations`);
}

for (const publicSource of [catalogHtml, runtimeSource]) {
  if (publicSource.includes("city-catalog-coverage.json")) {
    errors.push(`${COVERAGE_PATH}: coverage map is research-only and must not be loaded by public catalog runtime`);
  }
}

console.log(`Coverage discovery sources: ${sourceIds.size}`);
console.log(`Coverage observations: ${observationCount}`);
console.log(`Priority accounted: ${observedPriority.size}/${priorityIds.size}`);
console.log(`Reference accounted: ${observedReference.size}/${referenceIds.size}`);
console.log(`Unresolved candidates accounted: ${observedCandidates.size}/${unresolvedCandidateIds.size}`);
console.log(`Unmapped observations: ${unmappedCount}`);

if (errors.length) {
  console.error("\nCity catalog coverage validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("City catalog coverage validation passed.");
