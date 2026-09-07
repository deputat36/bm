import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_PATH = "data/research/eiszh-primary-scan.json";
const INVENTORY_PATH = "data/research/city-inventory-method.json";
const PRIORITY_PATH = "data/research/priority-projects.json";
const REFERENCE_PATH = "data/research/reference-projects.json";
const CANDIDATE_PATH = "data/research/reference-candidates.json";
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

function validateRegistryMapping(mapping, label, registrySets) {
  const registry = String(mapping?.registry || "");
  const projectId = String(mapping?.project_id || "").trim();
  if (!projectId || !["priority", "reference", "candidate"].includes(registry)) {
    errors.push(`${label}: valid registry mapping is required`);
    return;
  }
  if (!registrySets[registry].has(projectId)) {
    errors.push(`${label}: unknown ${registry} project ${projectId}`);
  }
}

const scan = readJson(SCAN_PATH);
const inventory = readJson(INVENTORY_PATH);
const priority = readJson(PRIORITY_PATH);
const reference = readJson(REFERENCE_PATH);
const candidates = readJson(CANDIDATE_PATH);
const sourceCollection = readJson(SOURCE_COLLECTION_PATH);
if (!scan || !inventory || !priority || !reference || !candidates || !sourceCollection) process.exit(1);

if (!new Set(["1.0", "1.1"]).has(scan.schema_version)) {
  errors.push(`${SCAN_PATH}: schema_version must be 1.0 or 1.1`);
}
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

if (scan.schema_version === "1.1") {
  for (const key of [
    "primary_project_listing_may_identify_multi_house_set",
    "multi_house_project_requires_all_house_ids_recorded",
    "project_set_discovery_does_not_auto_change_public_project_claims"
  ]) {
    if (scan.rules?.[key] !== true) errors.push(`${SCAN_PATH}: rules.${key} must be true for schema 1.1`);
  }
}

const priorityIds = new Set((priority.projects || []).map((item) => item.id));
const referenceIds = new Set((reference.projects || []).map((item) => item.id));
const candidateIds = new Set((candidates.candidates || []).filter((item) => item.status !== "promoted").map((item) => item.id));
const registrySets = {
  priority: priorityIds,
  reference: referenceIds,
  candidate: candidateIds
};

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
  "primary_project_set_read_reconciliation_required",
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
let primaryIdentityResolvedCount = 0;

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

  if (observation.status === "primary_project_set_read_reconciliation_required") {
    primaryIdentityResolvedCount += 1;
    const expectedIds = Array.isArray(observation.expected_object_ids)
      ? observation.expected_object_ids.map((value) => String(value)).filter(Boolean)
      : [];
    if (expectedIds.length < 2 || new Set(expectedIds).size !== expectedIds.length) {
      errors.push(`${SCAN_PATH}:${id}: multi-house project requires at least two unique expected_object_ids`);
    }
    if (observation.primary_content_read !== true) errors.push(`${SCAN_PATH}:${id}: project set requires primary_content_read=true`);
    if (observation.object_identity_match !== true) errors.push(`${SCAN_PATH}:${id}: project set requires object_identity_match=true`);
    if (!Array.isArray(observation.primary_references) || observation.primary_references.length < 2) {
      errors.push(`${SCAN_PATH}:${id}: project set requires multiple primary_references`);
    } else {
      for (const [index, source] of observation.primary_references.entries()) {
        if (!isHttps(source.url)) errors.push(`${SCAN_PATH}:${id}: primary reference #${index + 1} must be HTTPS`);
        if (!String(source.checked_at || "").trim()) errors.push(`${SCAN_PATH}:${id}: primary reference #${index + 1} missing checked_at`);
        if (!Array.isArray(source.supports) || source.supports.length < 1) errors.push(`${SCAN_PATH}:${id}: primary reference #${index + 1} requires supports`);
      }
    }

    const houses = Array.isArray(observation.house_records) ? observation.house_records : [];
    const houseIds = houses.map((item) => String(item.object_id || "")).filter(Boolean);
    if (houses.length !== expectedIds.length || new Set(houseIds).size !== expectedIds.length || expectedIds.some((objectId) => !houseIds.includes(objectId))) {
      errors.push(`${SCAN_PATH}:${id}: house_records must cover every expected_object_id exactly once`);
    }
    const declaredHouseCount = Number(observation.project_house_count);
    if (declaredHouseCount !== expectedIds.length) errors.push(`${SCAN_PATH}:${id}: project_house_count must equal expected object count`);
    const apartmentSum = houses.reduce((sum, item) => sum + Number(item.apartments_total || 0), 0);
    if (Number(observation.project_apartments_total) !== apartmentSum || apartmentSum <= 0) {
      errors.push(`${SCAN_PATH}:${id}: project_apartments_total must equal positive sum of house apartment totals`);
    }

    const canonicalReconciled = observation.canonical_model_reconciled === true;
    const hasCurrentModelConflict = Boolean(observation.current_model_conflict && String(observation.current_model_conflict.description || "").trim());
    if (!canonicalReconciled && !hasCurrentModelConflict) {
      errors.push(`${SCAN_PATH}:${id}: unresolved project-set status requires current_model_conflict until canonical reconciliation`);
    }
    if (canonicalReconciled && hasCurrentModelConflict) {
      errors.push(`${SCAN_PATH}:${id}: reconciled canonical model must not retain current_model_conflict`);
    }
    if (canonicalReconciled && observation.source_collection_reconciliation_required !== true) {
      errors.push(`${SCAN_PATH}:${id}: canonical reconciliation with unresolved project-set status must explicitly require source collection reconciliation`);
    }
    if ((observation.acceptance_gaps || []).length < 1) errors.push(`${SCAN_PATH}:${id}: project set reconciliation status requires acceptance gaps`);
  }

  if (observation.status === "no_exact_primary_match_in_search") {
    if (observation.expected_object_id !== null || observation.candidate_url !== null) errors.push(`${SCAN_PATH}:${id}: no-match search observation must not invent object id/url`);
    if (observation.primary_content_read !== false || observation.object_identity_match !== false) errors.push(`${SCAN_PATH}:${id}: no-match search observation cannot claim primary read/identity`);
    if ((observation.acceptance_gaps || []).length < 1) errors.push(`${SCAN_PATH}:${id}: no-match observation requires acceptance gaps`);
  }

  if (observation.status === "accepted_primary") {
    acceptedCount += 1;
    primaryIdentityResolvedCount += 1;
    const hasSingleId = String(observation.expected_object_id || "").trim() && isHttps(observation.candidate_url);
    const hasProjectSet = Array.isArray(observation.expected_object_ids)
      && observation.expected_object_ids.length > 0
      && Array.isArray(observation.primary_references)
      && observation.primary_references.some((item) => isHttps(item.url));
    if (!hasSingleId && !hasProjectSet) errors.push(`${SCAN_PATH}:${id}: accepted primary requires exact object id/url or a validated project set`);
    if (observation.primary_content_read !== true) errors.push(`${SCAN_PATH}:${id}: accepted primary requires primary_content_read=true`);
    if (observation.object_identity_match !== true) errors.push(`${SCAN_PATH}:${id}: accepted primary requires object_identity_match=true`);
    if ((observation.acceptance_gaps || []).length !== 0) errors.push(`${SCAN_PATH}:${id}: accepted primary must have no acceptance gaps`);
  }

  if (observation.status === "equivalent_primary_resolved") {
    acceptedCount += 1;
    primaryIdentityResolvedCount += 1;
    if (!isHttps(observation.equivalent_primary_reference)) errors.push(`${SCAN_PATH}:${id}: equivalent primary resolution requires HTTPS equivalent_primary_reference`);
    if (!allowedEquivalentTypes.has(observation.equivalent_primary_source_type)) errors.push(`${SCAN_PATH}:${id}: equivalent primary resolution requires an allowed official source type`);
    if (observation.equivalent_primary_content_read !== true) errors.push(`${SCAN_PATH}:${id}: equivalent primary resolution requires read primary content`);
    if (observation.object_identity_match !== true) errors.push(`${SCAN_PATH}:${id}: equivalent primary resolution requires identity match`);
    if ((observation.acceptance_gaps || []).length !== 0) errors.push(`${SCAN_PATH}:${id}: equivalent primary resolution must have no acceptance gaps`);
  }
}

const expectedPriorityIds = new Set(["tellermanov-sad", "aerodromnaya-18g", "sennaya-76"]);
const observedProjectIds = new Set(observations.map((item) => item.project_id));
if (observedProjectIds.size !== expectedPriorityIds.size || [...expectedPriorityIds].some((id) => !observedProjectIds.has(id))) {
  errors.push(`${SCAN_PATH}: target observations must cover all three priority projects`);
}

const tellermanov = observations.find((item) => item.project_id === "tellermanov-sad");
const sourceTask = findSourceTask(sourceCollection, "prostornaya_4a_eiszh_project_card");
if (!sourceTask) {
  errors.push(`${SOURCE_COLLECTION_PATH}: prostornaya_4a_eiszh_project_card is missing`);
} else if (tellermanov) {
  const sourceObjectId = String(sourceTask.expected_identifiers?.object_id || "");
  if (tellermanov.status === "primary_project_set_read_reconciliation_required") {
    const projectSetIds = new Set((tellermanov.expected_object_ids || []).map(String));
    if (!sourceObjectId || !projectSetIds.has(sourceObjectId)) {
      errors.push(`${SCAN_PATH}: legacy source task object id ${sourceObjectId || "<empty>"} must be included in discovered Tellermanov house set`);
    }
    if (sourceTask.status === "accepted") {
      errors.push(`${SCAN_PATH}: source collection cannot be accepted while Tellermanov source-collection project-set reconciliation is still required`);
    }
  } else {
    const sourceObjectIds = Array.isArray(sourceTask.expected_identifiers?.object_ids)
      ? sourceTask.expected_identifiers.object_ids.map(String)
      : [];
    const sourceAccepted = sourceTask.status === "accepted";
    const scanAccepted = tellermanov.status === "accepted_primary";
    if (scanAccepted && sourceObjectIds.length > 0) {
      const scanIds = new Set((tellermanov.expected_object_ids || []).map(String));
      if (sourceObjectIds.length !== scanIds.size || sourceObjectIds.some((id) => !scanIds.has(id))) {
        errors.push(`${SCAN_PATH}: accepted Tellermanov source object_ids must match scan project set`);
      }
    } else if (String(tellermanov.expected_object_id || "") !== String(sourceTask.expected_identifiers?.object_id || "")) {
      errors.push(`${SCAN_PATH}: Tellermanov object id must match source collection`);
    }
    if (sourceAccepted !== scanAccepted) errors.push(`${SCAN_PATH}: Tellermanov EISZhS acceptance must stay synchronized with source collection`);
  }
}

const primaryListings = Array.isArray(scan.citywide_primary_listings) ? scan.citywide_primary_listings : [];
let reconciledListingCount = 0;
for (const listing of primaryListings) {
  const label = `${SCAN_PATH}:${listing.id || "<citywide-primary-listing>"}`;
  if (!String(listing.id || "").trim()) errors.push(`${SCAN_PATH}: citywide primary listing without id`);
  if (!isHttps(listing.url)) errors.push(`${label}: url must be HTTPS`);
  if (!String(listing.checked_at || "").trim()) errors.push(`${label}: checked_at is required`);
  const reportedEntries = Number(listing.reported_project_entries);
  if (!Number.isInteger(reportedEntries) || reportedEntries < 1) {
    errors.push(`${label}: reported_project_entries must be a positive integer`);
  }
  if (!Array.isArray(listing.limitations) || listing.limitations.length < 1) errors.push(`${label}: limitations are required`);

  if (listing.reconciliation_complete === true) {
    reconciledListingCount += 1;
    if (listing.completeness_effect !== "primary_reconciled") {
      errors.push(`${label}: reconciled listing requires completeness_effect=primary_reconciled`);
    }
    const entries = Array.isArray(listing.entries) ? listing.entries : [];
    if (entries.length !== reportedEntries) {
      errors.push(`${label}: reconciled listing entries must equal reported_project_entries (${reportedEntries})`);
    }
    const seenObjectIds = new Set();
    for (const [index, entry] of entries.entries()) {
      const entryLabel = `${label}:entry#${index + 1}`;
      const objectId = String(entry.object_id || "").trim();
      if (!objectId) errors.push(`${entryLabel}: object_id is required`);
      if (seenObjectIds.has(objectId)) errors.push(`${entryLabel}: duplicate object_id ${objectId}`);
      seenObjectIds.add(objectId);
      for (const field of ["observed_label", "observed_address", "developer", "status", "mapping_basis"]) {
        if (!String(entry[field] || "").trim()) errors.push(`${entryLabel}: ${field} is required`);
      }
      if (!Number.isInteger(Number(entry.apartments_total)) || Number(entry.apartments_total) < 1) {
        errors.push(`${entryLabel}: apartments_total must be a positive integer`);
      }
      validateRegistryMapping(entry.mapping, entryLabel, registrySets);
    }

    if (listing.id === "eiszh_borisoglebsk_city_listing_2026-09-07") {
      const expectedIds = new Set(["34882", "25033", "32931", "72480", "72481", "39663", "33426"]);
      if (reportedEntries !== expectedIds.size || seenObjectIds.size !== expectedIds.size || [...expectedIds].some((id) => !seenObjectIds.has(id))) {
        errors.push(`${label}: dated reconciliation must contain exact object set 34882,25033,32931,72480,72481,39663,33426`);
      }
    }
  } else if (listing.completeness_effect === "primary_reconciled") {
    errors.push(`${label}: unreconciled listing cannot claim completeness_effect=primary_reconciled`);
  }
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
if (declaredBlocking.size !== gapIds.size || [...gapIds].some((id) => !declaredBlocking.has(id))) {
  errors.push(`${SCAN_PATH}: blocking_gap_ids must match unresolved_scan_gaps`);
}
if (Number(completion.accepted_target_observations) !== acceptedCount) {
  errors.push(`${SCAN_PATH}: accepted_target_observations must equal derived accepted/resolved target count`);
}
if (completion.primary_identity_resolved_target_observations !== undefined
  && Number(completion.primary_identity_resolved_target_observations) !== primaryIdentityResolvedCount) {
  errors.push(`${SCAN_PATH}: primary_identity_resolved_target_observations must equal derived primary identity count`);
}

const derivedCitywideComplete = primaryListings.length > 0 && reconciledListingCount === primaryListings.length;
const citywideComplete = completion.citywide_primary_reconciliation_complete === true;
if (citywideComplete !== derivedCitywideComplete) {
  errors.push(`${SCAN_PATH}: citywide_primary_reconciliation_complete must equal derived listing state (${derivedCitywideComplete})`);
}
if (completion.citywide_primary_listing_available === true && primaryListings.length < 1) {
  errors.push(`${SCAN_PATH}: citywide_primary_listing_available requires at least one primary listing`);
}
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
console.log(`Primary identity resolved targets: ${primaryIdentityResolvedCount}`);
console.log(`Accepted/resolved targets: ${acceptedCount}`);
console.log(`All targets resolved: ${allTargetsResolved}`);
console.log(`Citywide primary listings: ${primaryListings.length}`);
console.log(`Reconciled citywide listings: ${reconciledListingCount}`);
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
