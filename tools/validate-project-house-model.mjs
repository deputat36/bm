import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROJECT_PATH = "data/projects/tellermanov-sad.json";
const INDEX_PATH = "data/projects/index.json";
const VERIFICATION_PATH = "data/verification/prostornaya-4a.json";
const EISZH_PATH = "data/research/eiszh-primary-scan.json";
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

function sameStringSet(left, right) {
  const a = [...new Set((left || []).map(String))].sort();
  const b = [...new Set((right || []).map(String))].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function findClaim(profile, field) {
  return (profile.claims || []).find((claim) => claim.field === field);
}

function findSourceTask(collection, taskId) {
  for (const project of collection.projects || []) {
    const task = (project.tasks || []).find((item) => item.id === taskId);
    if (task) return task;
  }
  return null;
}

const project = readJson(PROJECT_PATH);
const index = readJson(INDEX_PATH);
const verification = readJson(VERIFICATION_PATH);
const eiszh = readJson(EISZH_PATH);
const sourceCollection = readJson(SOURCE_PATH);
if (!project || !index || !verification || !eiszh || !sourceCollection) process.exit(1);

if (project.schema_version !== "1.1") errors.push(`${PROJECT_PATH}: schema_version must be 1.1`);
if (project.model_scope !== "residential_complex") errors.push(`${PROJECT_PATH}: model_scope must be residential_complex`);
if (project.id !== "tellermanov-sad") errors.push(`${PROJECT_PATH}: unexpected project id`);
if (project.is_public_ready !== false) errors.push(`${PROJECT_PATH}: reconciliation must not change is_public_ready=false`);

const houses = Array.isArray(project.houses) ? project.houses : [];
const houseIds = houses.map((house) => String(house.object_id || "")).filter(Boolean);
if (houses.length < 2) errors.push(`${PROJECT_PATH}: at least two house records are required`);
if (new Set(houseIds).size !== houses.length) errors.push(`${PROJECT_PATH}: house object_id values must be unique and non-empty`);
if (Number(project.buildings_total) !== houses.length) errors.push(`${PROJECT_PATH}: buildings_total must equal houses.length`);
if (!sameStringSet(project.nash_dom_rf_ids, houseIds)) errors.push(`${PROJECT_PATH}: nash_dom_rf_ids must match house object IDs exactly`);
if (Object.prototype.hasOwnProperty.call(project, "nash_dom_rf_id")) errors.push(`${PROJECT_PATH}: singular nash_dom_rf_id is ambiguous for a multi-house complex`);

const apartmentSum = houses.reduce((sum, house) => sum + Number(house.apartments_total || 0), 0);
if (apartmentSum <= 0 || Number(project.apartments_total) !== apartmentSum) {
  errors.push(`${PROJECT_PATH}: apartments_total must equal positive sum of house apartment totals`);
}

const unreadHouses = houses.filter((house) => house.exact_eiszh_card_read !== true);
for (const house of unreadHouses) {
  if (!String(house.detail_status || "").includes("working_copy")) {
    errors.push(`${PROJECT_PATH}: unread house ${house.object_id || "<unknown>"} must keep working_copy detail_status`);
  }
}

const hasHouseSpecificDetails = houses.some((house) => Array.isArray(house.apartment_types) || house.area_min != null || house.area_max != null);
if (hasHouseSpecificDetails && (project.area_min != null || project.area_max != null)) {
  errors.push(`${PROJECT_PATH}: house-specific area range must not be promoted to complex-level area_min/area_max`);
}
if (Object.prototype.hasOwnProperty.call(project, "apartment_types")) {
  errors.push(`${PROJECT_PATH}: apartment_types must live at house level until every house is reconciled`);
}

const indexItem = index.find((item) => item.id === project.id);
if (!indexItem) {
  errors.push(`${INDEX_PATH}: tellermanov-sad is missing`);
} else {
  if (Number(indexItem.buildings_total) !== Number(project.buildings_total)) errors.push(`${INDEX_PATH}: buildings_total must match canonical project`);
  if (Number(indexItem.apartments_total) !== Number(project.apartments_total)) errors.push(`${INDEX_PATH}: apartments_total must match canonical complex total`);
  if (indexItem.area_min != null || indexItem.area_max != null) errors.push(`${INDEX_PATH}: complex area range must remain null until all houses are reconciled`);
  if (indexItem.is_public_ready !== false) errors.push(`${INDEX_PATH}: is_public_ready must remain false`);
}

const buildingsClaim = findClaim(verification, "buildings_total");
const apartmentsClaim = findClaim(verification, "complex_apartments_total");
if (!buildingsClaim || buildingsClaim.verification_status !== "confirmed" || buildingsClaim.publication_allowed !== true) {
  errors.push(`${VERIFICATION_PATH}: confirmed publication-allowed buildings_total claim is required`);
} else if (Number(buildingsClaim.value) !== Number(project.buildings_total)) {
  errors.push(`${VERIFICATION_PATH}: buildings_total claim must match canonical project`);
}
if (!apartmentsClaim || apartmentsClaim.verification_status !== "confirmed" || apartmentsClaim.publication_allowed !== true) {
  errors.push(`${VERIFICATION_PATH}: confirmed publication-allowed complex_apartments_total claim is required`);
} else if (Number(apartmentsClaim.value) !== Number(project.apartments_total)) {
  errors.push(`${VERIFICATION_PATH}: complex_apartments_total claim must match canonical project`);
}

const tellermanovScan = (eiszh.target_observations || []).find((item) => item.project_id === project.id);
if (!tellermanovScan) {
  errors.push(`${EISZH_PATH}: tellermanov target observation is missing`);
} else {
  if (!sameStringSet(tellermanovScan.expected_object_ids, houseIds)) errors.push(`${EISZH_PATH}: expected_object_ids must match canonical house IDs`);
  if (Number(tellermanovScan.project_house_count) !== houses.length) errors.push(`${EISZH_PATH}: project_house_count must match canonical buildings_total`);
  if (Number(tellermanovScan.project_apartments_total) !== Number(project.apartments_total)) errors.push(`${EISZH_PATH}: project_apartments_total must match canonical project`);
  if (tellermanovScan.canonical_model_reconciled !== true) errors.push(`${EISZH_PATH}: canonical_model_reconciled must be true after this migration`);
  if (tellermanovScan.publication_effect !== "none") errors.push(`${EISZH_PATH}: project-set reconciliation must have publication_effect=none`);

  const scanHouses = tellermanovScan.house_records || [];
  for (const house of houses) {
    const scanHouse = scanHouses.find((item) => String(item.object_id) === String(house.object_id));
    if (!scanHouse) errors.push(`${EISZH_PATH}: missing scan house ${house.object_id}`);
    else if (Number(scanHouse.apartments_total) !== Number(house.apartments_total)) errors.push(`${EISZH_PATH}: apartment total mismatch for house ${house.object_id}`);
  }
}

const sourceTask = findSourceTask(sourceCollection, "prostornaya_4a_eiszh_project_card");
if (!sourceTask) {
  errors.push(`${SOURCE_PATH}: prostornaya_4a_eiszh_project_card is missing`);
} else {
  const legacyId = String(sourceTask.expected_identifiers?.object_id || "");
  const projectSetIds = Array.isArray(sourceTask.expected_identifiers?.object_ids)
    ? sourceTask.expected_identifiers.object_ids.map(String)
    : [];

  if (sourceTask.status === "accepted") {
    if (!sameStringSet(projectSetIds, houseIds)) errors.push(`${SOURCE_PATH}: accepted EISZhS task must store the complete house ID set`);
    if (tellermanovScan?.status !== "accepted_primary") errors.push(`${SOURCE_PATH}: accepted source task requires accepted_primary EISZhS scan`);
  } else {
    if (!legacyId || !houseIds.includes(legacyId)) errors.push(`${SOURCE_PATH}: unresolved legacy source object_id must still belong to the canonical house set`);
    if (tellermanovScan?.source_collection_reconciliation_required !== true) errors.push(`${EISZH_PATH}: unresolved source task must keep source_collection_reconciliation_required=true`);
  }
}

console.log(`Tellermanov houses: ${houses.length}`);
console.log(`Tellermanov house IDs: ${houseIds.join(", ")}`);
console.log(`Tellermanov apartments total: ${project.apartments_total}`);
console.log(`Unread exact EISZhS house cards: ${unreadHouses.length}`);

if (errors.length) {
  console.error("\nProject house model validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Project house model validation passed.");
