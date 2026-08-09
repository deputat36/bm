import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_PATH = "data/research/municipal-planning-scan.json";
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
const inventory = readJson(INVENTORY_PATH);
if (!scan || !inventory) process.exit(1);

if (scan.schema_version !== "1.0") errors.push(`${SCAN_PATH}: schema_version must be 1.0`);
if (scan.portal_id !== "newbuilds-borisoglebsk") errors.push(`${SCAN_PATH}: invalid portal_id`);
if (!new Set(["partial_access_limited", "municipal_scan_complete"]).has(scan.status)) {
  errors.push(`${SCAN_PATH}: unsupported status ${scan.status}`);
}

for (const key of [
  "planning_change_is_not_project_confirmation",
  "exact_address_or_land_plot_required_for_candidate",
  "residential_project_intent_required_for_candidate",
  "missing_map_attachment_blocks_project_inference",
  "secondary_legal_mirror_cannot_replace_missing_map_content",
  "scan_has_no_publication_effect",
  "absence_in_search_is_not_proof_of_absence"
]) {
  if (scan.rules?.[key] !== true) errors.push(`${SCAN_PATH}: rules.${key} must be true`);
}

const documents = Array.isArray(scan.documents) ? scan.documents : [];
if (documents.length < 1) errors.push(`${SCAN_PATH}: at least one planning document is required`);
const documentIds = new Set();
for (const doc of documents) {
  const id = String(doc?.id || "").trim();
  if (!id) {
    errors.push(`${SCAN_PATH}: document without id`);
    continue;
  }
  if (documentIds.has(id)) errors.push(`${SCAN_PATH}: duplicate document ${id}`);
  documentIds.add(id);
  if (!String(doc.document_type || "").trim()) errors.push(`${SCAN_PATH}:${id}: document_type is required`);
  if (!String(doc.authority || "").trim()) errors.push(`${SCAN_PATH}:${id}: authority is required`);
  if (!String(doc.number || "").trim()) errors.push(`${SCAN_PATH}:${id}: number is required`);
  if (!String(doc.document_date || "").trim()) errors.push(`${SCAN_PATH}:${id}: document_date is required`);
  if (!String(doc.checked_at || "").trim()) errors.push(`${SCAN_PATH}:${id}: checked_at is required`);
  if (!isHttps(doc.official_reference)) errors.push(`${SCAN_PATH}:${id}: official_reference must be HTTPS`);
  if (!isHttps(doc.readable_legal_mirror)) errors.push(`${SCAN_PATH}:${id}: readable_legal_mirror must be HTTPS`);
  if (!Array.isArray(doc.supports) || doc.supports.length < 1) errors.push(`${SCAN_PATH}:${id}: bounded supports are required`);
  if (!Array.isArray(doc.missing_content)) errors.push(`${SCAN_PATH}:${id}: missing_content must be an array`);
  if (doc.missing_content?.length > 0) {
    if (doc.project_inference_allowed !== false) errors.push(`${SCAN_PATH}:${id}: missing content requires project_inference_allowed=false`);
    if (!String(doc.reason_project_inference_blocked || "").trim()) {
      errors.push(`${SCAN_PATH}:${id}: missing content requires reason_project_inference_blocked`);
    }
  }
}

const candidates = Array.isArray(scan.candidate_project_observations) ? scan.candidate_project_observations : [];
for (const [index, candidate] of candidates.entries()) {
  const label = `${SCAN_PATH}:candidate#${index + 1}`;
  if (!String(candidate.id || "").trim()) errors.push(`${label}: id is required`);
  const hasAddress = Boolean(String(candidate.exact_address || "").trim());
  const hasLandPlot = Boolean(String(candidate.land_plot_identifier || "").trim());
  if (!hasAddress && !hasLandPlot) errors.push(`${label}: exact_address or land_plot_identifier is required`);
  if (candidate.residential_project_intent_confirmed !== true) {
    errors.push(`${label}: residential_project_intent_confirmed must be true`);
  }
  if (!isHttps(candidate.source_reference)) errors.push(`${label}: source_reference must be HTTPS`);
  if (candidate.publication_effect !== "none") errors.push(`${label}: publication_effect must remain none`);
}

const gaps = Array.isArray(scan.unresolved_scan_gaps) ? scan.unresolved_scan_gaps : [];
const gapIds = new Set();
for (const gap of gaps) {
  const id = String(gap?.id || "").trim();
  if (!id) {
    errors.push(`${SCAN_PATH}: gap without id`);
    continue;
  }
  if (gapIds.has(id)) errors.push(`${SCAN_PATH}: duplicate gap ${id}`);
  gapIds.add(id);
  if (!String(gap.type || "").trim()) errors.push(`${SCAN_PATH}:${id}: type is required`);
  if (!Array.isArray(gap.blocks) || gap.blocks.length < 1) errors.push(`${SCAN_PATH}:${id}: blocks are required`);
  if (!String(gap.next_action || "").trim()) errors.push(`${SCAN_PATH}:${id}: next_action is required`);
}

const completion = scan.completion_state || {};
const declaredBlocking = new Set(completion.blocking_gap_ids || []);
if (declaredBlocking.size !== gapIds.size || [...gapIds].some((id) => !declaredBlocking.has(id))) {
  errors.push(`${SCAN_PATH}: blocking_gap_ids must match unresolved_scan_gaps`);
}
if (Number(completion.exact_candidate_projects_found) !== candidates.length) {
  errors.push(`${SCAN_PATH}: exact_candidate_projects_found must equal candidate_project_observations length`);
}
const complete = gapIds.size === 0;
if (completion.municipal_scan_complete !== complete) {
  errors.push(`${SCAN_PATH}: municipal_scan_complete must equal derived state (${complete})`);
}
if (completion.completion_claim !== (complete ? "allowed" : "not_allowed")) {
  errors.push(`${SCAN_PATH}: completion_claim inconsistent with derived state`);
}
const expectedStatus = complete ? "municipal_scan_complete" : "partial_access_limited";
if (scan.status !== expectedStatus) errors.push(`${SCAN_PATH}: expected status=${expectedStatus}, found ${scan.status}`);

const inventoryScan = (inventory.required_scans || []).find((item) => item.id === "municipal_planning_and_address_scan");
if (!inventoryScan) {
  errors.push(`${INVENTORY_PATH}: municipal_planning_and_address_scan is missing`);
} else {
  const expectedInventoryStatus = complete ? "passed" : "partial_access_limited";
  if (inventoryScan.status !== expectedInventoryStatus) {
    errors.push(`${INVENTORY_PATH}: municipal scan expected ${expectedInventoryStatus}, found ${inventoryScan.status}`);
  }
  if (!(inventoryScan.evidence || []).includes(SCAN_PATH)) {
    errors.push(`${INVENTORY_PATH}: municipal scan evidence must include ${SCAN_PATH}`);
  }
}

console.log(`Planning documents: ${documents.length}`);
console.log(`Exact candidate observations: ${candidates.length}`);
console.log(`Blocking municipal gaps: ${gapIds.size}`);
console.log(`Municipal scan complete: ${complete}`);

if (errors.length) {
  console.error("\nMunicipal planning scan validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Municipal planning scan validation passed.");
