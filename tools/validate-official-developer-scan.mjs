import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_PATH = "data/research/official-developer-portfolio-scan.json";
const PRIORITY_PATH = "data/research/priority-projects.json";
const REFERENCE_PATH = "data/research/reference-projects.json";
const CANDIDATE_PATH = "data/research/reference-candidates.json";
const INVENTORY_PATH = "data/research/city-inventory-method.json";
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
  return /^https:\/\//i.test(String(value || ""));
}

const scan = readJson(SCAN_PATH);
const priority = readJson(PRIORITY_PATH);
const reference = readJson(REFERENCE_PATH);
const candidates = readJson(CANDIDATE_PATH);
const inventory = readJson(INVENTORY_PATH);
if (!scan || !priority || !reference || !candidates || !inventory) process.exit(1);

if (scan.schema_version !== "1.0") errors.push(`${SCAN_PATH}: schema_version must be 1.0`);
if (scan.portal_id !== "newbuilds-borisoglebsk") errors.push(`${SCAN_PATH}: invalid portal_id`);
const allowedTopStatuses = new Set(["known_entities_scan_partial", "city_developer_scan_complete"]);
if (!allowedTopStatuses.has(scan.status)) errors.push(`${SCAN_PATH}: unsupported status ${scan.status}`);

for (const key of [
  "official_portfolio_absence_is_not_city_absence",
  "unaddressed_queue_cannot_map_to_project",
  "secondary_candidate_cannot_close_official_scan",
  "public_reference_project_requires_tracked_scope",
  "priority_project_requires_tracked_or_unresolved_scope",
  "developer_scan_has_no_publication_effect",
  "completion_requires_zero_blocking_scopes",
  "new_entity_from_primary_scan_must_be_added_before_completion"
]) {
  if (scan.rules?.[key] !== true) errors.push(`${SCAN_PATH}: rules.${key} must be true`);
}

const allowedStatuses = new Set([
  "scanned_current",
  "partial_unnamed_projects",
  "current_official_access_unverified",
  "entity_unresolved"
]);
const scopes = Array.isArray(scan.tracked_scopes) ? scan.tracked_scopes : [];
if (!scopes.length) errors.push(`${SCAN_PATH}: tracked_scopes must be non-empty`);

const priorityIds = new Set((priority.projects || []).map((item) => item.id));
const referenceIds = new Set((reference.projects || []).map((item) => item.id));
const candidateIds = new Set((candidates.candidates || []).map((item) => item.id));
const expectedProjectIds = new Set([...priorityIds, ...referenceIds]);
const projectLinkCounts = new Map();
const scopeIds = new Set();

for (const scope of scopes) {
  const id = String(scope?.id || "").trim();
  if (!id) {
    errors.push(`${SCAN_PATH}: scope without id`);
    continue;
  }
  if (scopeIds.has(id)) errors.push(`${SCAN_PATH}: duplicate scope ${id}`);
  scopeIds.add(id);

  if (!allowedStatuses.has(scope.scan_status)) errors.push(`${SCAN_PATH}:${id}: invalid scan_status ${scope.scan_status}`);
  if (!String(scope.display_name || "").trim()) errors.push(`${SCAN_PATH}:${id}: display_name is required`);
  if (!Array.isArray(scope.limitations) || scope.limitations.length < 1) {
    errors.push(`${SCAN_PATH}:${id}: limitations are required`);
  }

  const officialSources = Array.isArray(scope.official_sources) ? scope.official_sources : [];
  const discoverySources = Array.isArray(scope.discovery_sources) ? scope.discovery_sources : [];
  const unresolved = Array.isArray(scope.unresolved_portfolio_items) ? scope.unresolved_portfolio_items : [];
  const links = Array.isArray(scope.canonical_project_links) ? scope.canonical_project_links : [];

  for (const [index, source] of officialSources.entries()) {
    if (!isHttps(source.url)) errors.push(`${SCAN_PATH}:${id}: official source #${index + 1} must be HTTPS`);
    if (!String(source.title || "").trim()) errors.push(`${SCAN_PATH}:${id}: official source #${index + 1} missing title`);
    if (!String(source.checked_at || "").trim()) errors.push(`${SCAN_PATH}:${id}: official source #${index + 1} missing checked_at`);
    if (!Array.isArray(source.supports) || source.supports.length < 1) {
      errors.push(`${SCAN_PATH}:${id}: official source #${index + 1} requires bounded supports`);
    }
  }

  for (const [index, source] of discoverySources.entries()) {
    if (!isHttps(source.url)) errors.push(`${SCAN_PATH}:${id}: discovery source #${index + 1} must be HTTPS`);
    if (!String(source.effect || "").trim()) errors.push(`${SCAN_PATH}:${id}: discovery source #${index + 1} requires effect`);
    if (!String(source.checked_at || "").trim()) errors.push(`${SCAN_PATH}:${id}: discovery source #${index + 1} missing checked_at`);
  }

  if (scope.scan_status === "scanned_current") {
    if (officialSources.length < 1) errors.push(`${SCAN_PATH}:${id}: scanned_current requires an official source`);
    if (unresolved.length !== 0) errors.push(`${SCAN_PATH}:${id}: scanned_current cannot retain unresolved portfolio items`);
  }
  if (scope.scan_status === "partial_unnamed_projects") {
    if (officialSources.length < 1) errors.push(`${SCAN_PATH}:${id}: partial_unnamed_projects requires an official source`);
    if (unresolved.length < 1) errors.push(`${SCAN_PATH}:${id}: partial_unnamed_projects requires unresolved items`);
  }
  if (["current_official_access_unverified", "entity_unresolved"].includes(scope.scan_status)) {
    if (unresolved.length < 1) errors.push(`${SCAN_PATH}:${id}: unresolved scan status requires unresolved items`);
    if (officialSources.length === 0 && discoverySources.length === 0) {
      errors.push(`${SCAN_PATH}:${id}: unresolved scan status requires at least discovery evidence`);
    }
  }

  for (const item of unresolved) {
    if (!String(item.id || "").trim()) errors.push(`${SCAN_PATH}:${id}: unresolved item without id`);
    if (!String(item.reason_unresolved || "").trim()) errors.push(`${SCAN_PATH}:${id}: unresolved item requires reason`);
    for (const candidateId of item.must_not_promote_candidates || []) {
      if (!candidateIds.has(candidateId)) errors.push(`${SCAN_PATH}:${id}: unknown protected candidate ${candidateId}`);
    }
    if (item.must_not_assume_project_id && !priorityIds.has(item.must_not_assume_project_id) && !referenceIds.has(item.must_not_assume_project_id)) {
      errors.push(`${SCAN_PATH}:${id}: must_not_assume_project_id points to unknown project ${item.must_not_assume_project_id}`);
    }
  }

  for (const link of links) {
    const registry = link.registry;
    const projectId = String(link.project_id || "").trim();
    if (!["priority", "reference"].includes(registry)) {
      errors.push(`${SCAN_PATH}:${id}:${projectId || "<unknown>"}: registry must be priority or reference`);
      continue;
    }
    if (registry === "priority" && !priorityIds.has(projectId)) errors.push(`${SCAN_PATH}:${id}: unknown priority project ${projectId}`);
    if (registry === "reference" && !referenceIds.has(projectId)) errors.push(`${SCAN_PATH}:${id}: unknown reference project ${projectId}`);
    if (link.publication_effect !== "none") errors.push(`${SCAN_PATH}:${id}:${projectId}: publication_effect must remain none`);
    if (!String(link.link_status || "").trim()) errors.push(`${SCAN_PATH}:${id}:${projectId}: link_status is required`);
    projectLinkCounts.set(projectId, (projectLinkCounts.get(projectId) || 0) + 1);
  }
}

for (const projectId of expectedProjectIds) {
  const count = projectLinkCounts.get(projectId) || 0;
  if (count !== 1) errors.push(`${SCAN_PATH}: project ${projectId} must appear in exactly one tracked developer scope; found ${count}`);
}
for (const projectId of projectLinkCounts.keys()) {
  if (!expectedProjectIds.has(projectId)) errors.push(`${SCAN_PATH}: unexpected canonical project link ${projectId}`);
}

const scannedCurrent = scopes.filter((item) => item.scan_status === "scanned_current").map((item) => item.id).sort();
const blocking = scopes.filter((item) => item.scan_status !== "scanned_current").map((item) => item.id).sort();
const completion = scan.completion_state || {};
const declaredScanned = Array.isArray(completion.scanned_current_scope_ids) ? [...completion.scanned_current_scope_ids].sort() : [];
const declaredBlocking = Array.isArray(completion.blocking_scope_ids) ? [...completion.blocking_scope_ids].sort() : [];
if (JSON.stringify(scannedCurrent) !== JSON.stringify(declaredScanned)) {
  errors.push(`${SCAN_PATH}: scanned_current_scope_ids must match derived scope state`);
}
if (JSON.stringify(blocking) !== JSON.stringify(declaredBlocking)) {
  errors.push(`${SCAN_PATH}: blocking_scope_ids must match derived scope state`);
}

const knownScopeComplete = blocking.length === 0;
if (completion.known_scope_scan_complete !== knownScopeComplete) {
  errors.push(`${SCAN_PATH}: known_scope_scan_complete must equal derived scope state (${knownScopeComplete})`);
}

const inventoryScans = new Map((inventory.required_scans || []).map((item) => [item.id, item]));
const upstreamDiscoveryComplete = [
  "primary_permit_and_commissioning_registry_scan",
  "eiszh_primary_project_scan",
  "municipal_planning_and_address_scan"
].every((id) => inventoryScans.get(id)?.status === "passed");
const cityDeveloperComplete = knownScopeComplete && upstreamDiscoveryComplete;
if (completion.city_developer_scan_complete !== cityDeveloperComplete) {
  errors.push(`${SCAN_PATH}: city_developer_scan_complete must equal derived state (${cityDeveloperComplete})`);
}
if (completion.completion_claim !== (cityDeveloperComplete ? "allowed" : "not_allowed")) {
  errors.push(`${SCAN_PATH}: completion_claim inconsistent with derived state`);
}
const expectedTopStatus = cityDeveloperComplete ? "city_developer_scan_complete" : "known_entities_scan_partial";
if (scan.status !== expectedTopStatus) {
  errors.push(`${SCAN_PATH}: expected status=${expectedTopStatus}, found ${scan.status}`);
}

const inventoryDeveloperScan = inventoryScans.get("official_developer_project_scan");
if (!inventoryDeveloperScan) {
  errors.push(`${INVENTORY_PATH}: official_developer_project_scan is missing`);
} else {
  const expectedInventoryStatus = cityDeveloperComplete ? "passed" : "in_progress";
  if (inventoryDeveloperScan.status !== expectedInventoryStatus) {
    errors.push(`${INVENTORY_PATH}: official_developer_project_scan expected ${expectedInventoryStatus}, found ${inventoryDeveloperScan.status}`);
  }
  if (!(inventoryDeveloperScan.evidence || []).includes(SCAN_PATH)) {
    errors.push(`${INVENTORY_PATH}: official_developer_project_scan evidence must include ${SCAN_PATH}`);
  }
}

console.log(`Developer scopes: ${scopes.length}`);
console.log(`Scanned current scopes: ${scannedCurrent.length}`);
console.log(`Blocking known scopes: ${blocking.length}`);
console.log(`Canonical priority/reference links: ${projectLinkCounts.size}/${expectedProjectIds.size}`);
console.log(`Upstream primary discovery complete: ${upstreamDiscoveryComplete}`);
console.log(`City developer scan complete: ${cityDeveloperComplete}`);

if (errors.length) {
  console.error("\nOfficial developer scan validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Official developer scan validation passed.");
