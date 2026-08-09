import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_PATH = "data/research/eiszh-primary-scan.json";
const INVENTORY_PATH = "data/research/city-inventory-method.json";
const PRIORITY_PATH = "data/research/priority-projects.json";
const SOURCE_COLLECTION_PATH = "data/research/source-collection.json";
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

function isHttps(value) {
  return /^https:\/\//iu.test(String(value || ""));
}

function findSourceTask(collection, taskId) {
  for (const project of collection.projects || []) {
    const task = (project.tasks || []).find((item) => item.id === taskId);
    if (task) return task;
  }
  return null;
}

const scan = readJson(SCAN_PATH);
const inventory = readJson(INVENTORY_PATH);
const priority = readJson(PRIORITY_PATH);
const sourceCollection = readJson(SOURCE_COLLECTION_PATH);
if (!scan || !inventory || !priority || !sourceCollection) process.exit(1);

if (scan.schema_version !== "1.0") errors.push(`${SCAN_PATH}: schema_version must be 1.0`);
if (scan.portal_id !== "newbuilds-borisoglebsk") errors.push(`${SCAN_PATH}: invalid portal_id`);
if (!new Set(["partial_access_limited", "eiszh_scan_complete"]).has(scan.status)) {
  errors.push(`${SCAN_PATH}: unsupported status ${scan.status}`);
}

for (const key of [
  "route_pattern_is_not_object_identity",
  "marketplace_nash_dom_badge_is_not_primary_card",
  "search_no_result_is_not_registry_absence",
  "accepted_object_requires_primary_content_read",
  "accepted_object_requires_exact_identity_match",
  "citywide_completion_requires_primary_listing_or_equivalent_export",
  "equivalent_primary_evidence_may_resolve_non_eiszh_object",
  "scan_has_no_publication_effect"
]) {
  if (scan.rules?.[key] !== true) errors.push(`${SCAN_PATH}: rules.${key} must be true`);
}

const priorityIds = new Set((priority.projects || []).map((item) => item.id));
const routeExamples = Array.isArray(scan.official_route_examples) ? scan.official_route_examples : [];
if (routeExamples.length < 1) errors.push(`${SCAN_PATH}: at least one official route example is required`);
for (const [index, example] of routeExamples.entries()) {
  const label = `${SCAN_PATH}:route#${index + 1}`;
  if (!isHttps(example.url)) errors.push(`${label}: url must be HTTPS`);
  if (!String(example.checked_at || "").trim()) errors.push(`${label}: checked_at is required`);
  if (!Array.isArray(example.supports) || example.supports.length < 1) errors.push(`${label}: bounded supports are required`);
  if (!Array.isArray(example.does_not_support) || example.does_not_support.length < 1) errors.push(`${label}: does_not_support boundary is required`);
  if (example.project_id || example.publication_effect) errors.push(`${label}: route example must not map to a local project or carry publication effect`);
}

const allowedObservationStatuses = new Set([
  "candidate_exact_id_unread",
  "no_exact_primary_match_in_search",
  "accepted_primary",
  "equivalent_primary_resolved"
]);
const allowedEquivalentTypes = new Set([
  "official_registry",
  "official_permit_or_commissioning_record",
  "official_project_document"
]);
const observations = Array.isArray(scan.target_observations) ? scan.target_observations : [];
const observationIds = new Set();
let acceptedCount = 0;

for (const observation of observations) {
  const id = String(observation?.id || "").trim();
  if (!id) {
    errors.push(`${SCAN_PATH}: target observation without id`);
    continue;
  }
  if (observationIds.has(id)) errors.push(`${SCAN_PATH}: duplicate target observation ${id}`);
  observationIds.add(id);

  const projectId = String(observation.project_id || "").trim();
  if (!priorityIds.has(projectId)) errors.push(`${SCAN_PATH}:${id}: unknown priority project ${projectId}`);
  if (!allowedObservationStatuses.has(observation.status)) errors.push(`${SCAN_PATH}:${id}: invalid status ${observation.status}`);
  if (observation.publication_effect !== "none") errors.push(`${SCAN_PATH}:${id}: publication_effect must remain none`);
  if (!Array.isArray(observation.acceptance_gaps)) errors.push(`${SCAN_PATH}:${id}: acceptance_gaps must be an array`);
  if (observation.registry_absence_claimed === true) errors.push(`${SCAN_PATH}:${id}: web-index no-result must never become registry absence proof`);

  for (const [index, clue] of (observation.supporting_secondary_clues || []).entries()) {
    if (!isHttps(clue.url)) errors.push(`${SCAN_PATH}:${id}: secondary clue #${index + 1} must be HTTPS`);
    if (!String(clue.checked_at || "").trim()) errors.push(`${SCAN_PATH}:${id}: secondary clue #${index + 1} missing checked_at`);
    if (!Array.isArray(clue.supports) || clue.supports.length < 1) errors.push(`${SCAN_PATH}:${id}: secondary clue #${index + 1} requires supports`);
  }

  if (observation.status === "candidate_exact_id_unread") {
    if (!String(observation.expected_object_id || "").trim()) errors.push(`${SCAN_PATH}:${id}: exact-id candidate requires expected_object_id`);
    if (!isHttps(observation.candidate_url)) errors.push(`${SCAN_PATH}:${id}: exact-id candidate requires HTTPS candidate_url`);
    if (observation.primary_content_read !== false) errors.push(`${SCAN_PATH}:${id}: unread candidate must keep primary_content_read=false`);
    if (observation.object_identity_match !== false) errors.push(`${SCAN_PATH}:${id}: unread candidate cannot claim object identity match`);
    if ((observation.acceptance_gaps || []).length < 1) errors.push(`${SCAN_PATH}:${id}: unread candidate requires acceptance gaps`);
  }

  if (observation.status === "no_exact_primary_match_in_search") {
    if (observation.expected_object_id !== null || observation.candidate_url !== null) errors.push(`${SCAN_PATH}:${id}: no-match search observation must not invent object id/url`);
    if (observation.primary_content_read !== false || observation.object_identity_match !== false) errors.push(`${SCAN_PATH}:${id}: no-match search observation cannot claim primary read/identity`);
    if ((observation.acceptance_gaps || []).length < 1) errors.push(`${SCAN_PATH}:${id}: no-match observation requires acceptance gaps`);
  }

  if (observation.status === "accepted_primary") {
    acceptedCount += 1;
    if (!isHttps(observation.candidate_url)) errors.push(`${SCAN_PATH}:${id}: accepted primary requires HTTPS card URL`);
    if (!String(observation.expected_object_id || "").trim()) errors.push(`${SCAN_PATH}:${id}: accepted primary requires object id`);
    if (observation.primary_content_read !== true) errors.push(`${SCAN_PATH}:${id}: accepted primary requires primary_content_read=true`);
    if (observation.object_identity_match !== true) errors.push(`${SCAN_PATH}:${id}: accepted primary requires object_identity_match=true`);
    if ((observation.acceptance_gaps || []).length !== 0) errors.push(`${SCAN_PATH}:${id}: accepted primary must have no acceptance gaps`);
  }

  if (observation.status === "equivalent_primary_resolved") {
    acceptedCount += 1;
    if (!isHttps(observation.equivalent_primary_reference)) errors.push(`${SCAN_PATH}:${id}: equivalent primary resolution requires HTTPS equivalent_primary_reference`);
    if (!allowedEquivalentTypes.has(observation.equivalent_primary_source_type)) errors.push(`${SCAN_PATH}:${id}: equivalent primary resolution requires an allowed official source type`);
    if (observation.equivalent_primary_content_read !== true) errors.push(`${SCAN_PATH}:${id}: equivalent primary resolution requires read primary content`);
    if (observation.object_identity_match !== true) errors.push(`${SCAN_PATH}:${id}: equivalent primary resolution requires identity match`);
    if ((observation.acceptance_gaps || []).length !== 0) errors.push(`${SCAN_PATH}:${id}: equivalent primary resolution must have no acceptance gaps`);
  }
}

const expectedPriorityIds = new Set(["tellermanov-sad", "aerodromnaya-18g", "sennaya-76"]);
const observedProjectIds = new Set(observations.map((item) => item.project_id));
if (observedProjectIds.size !== expectedPriorityIds.size || [...expectedPriorityIds].some((id) => !observedProjectIds.has(id))) errors.push(`${SCAN_PATH}: target observations must cover all three priority projects`);

const tellermanov = observations.find((item) => item.project_id === "tellermanov-sad");
const sourceTask = findSourceTask(sourceCollection, "prostornaya_4a_eiszh_project_card");
if (!sourceTask) {
  errors.push(`${SOURCE_COLLECTION_PATH}: prostornaya_4a_eiszh_project_card is missing`);
} else if (tellermanov) {
  const expectedObjectId = String(sourceTask.expected_identifiers?.object_id || "");
  if (String(tellermanov.expected_object_id || "") !== expectedObjectId) errors.push(`${SCAN_PATH}: Tellermanov object id must match source collection (${expectedObjectId})`);
  const sourceAccepted = sourceTask.status === "accepted";
  const scanAccepted = tellermanov.status === "accepted_primary";
  if (sourceAccepted !== scanAccepted) errors.push(`${SCAN_PATH}: Tellermanov EISZhS acceptance must stay synchronized with source collection`);
}

const searchPasses = Array.isArray(scan.citywide_search_passes) ? scan.citywide_search_passes : [];
if (searchPasses.length < 1) errors.push(`${SCAN_PATH}: at least one citywide search pass is required`);
for (const pass of searchPasses) {
  if (!String(pass.id || "").trim()) errors.push(`${SCAN_PATH}: search pass without id`);
  if (!Array.isArray(pass.queries) || pass.queries.length < 1) errors.push(`${SCAN_PATH}:${pass.id || "<unknown>"}: queries are required`);
  if (pass.completeness_effect !== "none") errors.push(`${SCAN_PATH}:${pass.id || "<unknown>"}: web-index search cannot have completeness effect`);
  if (pass.registry_absence_proof === true) errors.push(`${SCAN_PATH}:${pass.id || "<unknown>"}: web-index search cannot prove registry absence`);
  if (!String(pass.reason || "").trim()) errors.push(`${SCAN_PATH}:${pass.id || "<unknown>"}: limitation reason is required`);
}

const gaps = Array.isArray(scan.unresolved_scan_gaps) ? scan.unresolved_scan_gaps : [];
const gapIds = new Set();
for (const gap of gaps) {
  const id = String(gap?.id || "").trim();
  if (!id) {
    errors.push(`${SCAN_PATH}: unresolved gap without id`);
    continue;
  }
  if (gapIds.has(id)) errors.push(`${SCAN_PATH}: duplicate unresolved gap ${id}`);
  gapIds.add(id);
  if (!Array.isArray(gap.blocks) || gap.blocks.length < 1) errors.push(`${SCAN_PATH}:${id}: blocks are required`);
  if (!String(gap.next_action || "").trim()) errors.push(`${SCAN_PATH}:${id}: next_action is required`);
}

const completion = scan.completion_state || {};
const declaredBlocking = new Set(completion.blocking_gap_ids || []);
if (declaredBlocking.size !== gapIds.size || [...gapIds].some((id) => !declaredBlocking.has(id))) errors.push(`${SCAN_PATH}: blocking_gap_ids must match unresolved_scan_gaps`);
if (Number(completion.accepted_target_observations) !== acceptedCount) errors.push(`${SCAN_PATH}: accepted_target_observations must equal derived accepted/resolved target count`);

const citywideComplete = completion.citywide_primary_reconciliation_complete === true;
const allTargetsResolved = observations.length === expectedPriorityIds.size && acceptedCount === observations.length;
const scanComplete = gapIds.size === 0 && citywideComplete && allTargetsResolved;
if (completion.eiszh_scan_complete !== scanComplete) errors.push(`${SCAN_PATH}: eiszh_scan_complete must equal derived state (${scanComplete})`);
if (completion.completion_claim !== (scanComplete ? "allowed" : "not_allowed")) errors.push(`${SCAN_PATH}: completion_claim inconsistent with derived state`);
const expectedTopStatus = scanComplete ? "eiszh_scan_complete" : "partial_access_limited";
if (scan.status !== expectedTopStatus) errors.push(`${SCAN_PATH}: expected status=${expectedTopStatus}, found ${scan.status}`);

const inventoryScan = (inventory.required_scans || []).find((item) => item.id === "eiszh_primary_project_scan");
if (!inventoryScan) {
  errors.push(`${INVENTORY_PATH}: eiszh_primary_project_scan is missing`);
} else {
  const expectedInventoryStatus = scanComplete ? "passed" : "partial_access_limited";
  if (inventoryScan.status !== expectedInventoryStatus) errors.push(`${INVENTORY_PATH}: EISZhS scan expected ${expectedInventoryStatus}, found ${inventoryScan.status}`);
  if (!(inventoryScan.evidence || []).includes(SCAN_PATH)) errors.push(`${INVENTORY_PATH}: EISZhS scan evidence must include ${SCAN_PATH}`);
}

console.log(`EISZhS route examples: ${routeExamples.length}`);
console.log(`Target observations: ${observations.length}`);
console.log(`Accepted/resolved targets: ${acceptedCount}`);
console.log(`All targets resolved: ${allTargetsResolved}`);
console.log(`Citywide search passes: ${searchPasses.length}`);
console.log(`Blocking EISZhS gaps: ${gapIds.size}`);
console.log(`Citywide primary reconciliation complete: ${citywideComplete}`);
console.log(`EISZhS scan complete: ${scanComplete}`);

if (errors.length) {
  console.error("\nEISZhS primary scan validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("EISZhS primary scan validation passed.");
