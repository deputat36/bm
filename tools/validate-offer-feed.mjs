import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = "data/offers/contract.json";
const FEED_PATH = "data/offers/feed.json";
const PROJECT_INDEX_PATH = "data/projects/index.json";
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

function isIsoDateTime(value) {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Date.parse(value));
}

function exactSet(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    errors.push(`${label}: expected ${right.join(", ")}; got ${left.join(", ")}`);
  }
}

function scanForbiddenKeys(value, forbidden, label) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenKeys(item, forbidden, `${label}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (forbidden.has(key)) errors.push(`${label}: forbidden key ${key}`);
    scanForbiddenKeys(nested, forbidden, `${label}.${key}`);
  }
}

function hoursOld(timestamp) {
  return (Date.now() - Date.parse(timestamp)) / 3600000;
}

function walkPublicFiles(relativeDir, output = []) {
  const fullDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(fullDir)) return output;
  const stat = fs.statSync(fullDir);
  if (stat.isFile()) {
    if (/\.(html|js)$/i.test(relativeDir)) output.push(relativeDir);
    return output;
  }
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const child = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) walkPublicFiles(child, output);
    else if (/\.(html|js)$/i.test(entry.name)) output.push(child);
  }
  return output;
}

const contract = readJson(CONTRACT_PATH);
const feed = readJson(FEED_PATH);
const projectIndex = readJson(PROJECT_INDEX_PATH);
if (!contract || !feed || !Array.isArray(projectIndex)) process.exit(1);

if (contract.schema_version !== "1.0") errors.push(`${CONTRACT_PATH}: schema_version must be 1.0`);
if (!isIsoDate(contract.updated_at)) errors.push(`${CONTRACT_PATH}: updated_at must be YYYY-MM-DD`);
if (contract.portal_id !== "newbuilds-borisoglebsk") errors.push(`${CONTRACT_PATH}: invalid portal_id`);
if (contract.status !== "schema_only_no_live_source") errors.push(`${CONTRACT_PATH}: status must remain schema_only_no_live_source before source activation`);

const requiredRules = [
  "public_render_enabled",
  "internal_preview_only",
  "live_source_connected",
  "raw_inventory_in_repository_forbidden",
  "personal_data_forbidden",
  "direct_browser_source_fetch_forbidden",
  "publication_requires_project_public_ready",
  "publication_requires_accepted_source",
  "publication_requires_current_price",
  "publication_requires_current_availability",
  "publication_requires_confirmed_seller_basis",
  "publication_requires_contract_type",
  "history_separate_from_current_feed"
];
for (const key of requiredRules) {
  if (typeof contract.rules?.[key] !== "boolean") errors.push(`${CONTRACT_PATH}: rules.${key} must be boolean`);
}
for (const key of ["raw_inventory_in_repository_forbidden", "personal_data_forbidden", "direct_browser_source_fetch_forbidden", "publication_requires_project_public_ready", "publication_requires_accepted_source", "publication_requires_current_price", "publication_requires_current_availability", "publication_requires_confirmed_seller_basis", "publication_requires_contract_type", "history_separate_from_current_feed"]) {
  if (contract.rules?.[key] !== true) errors.push(`${CONTRACT_PATH}: rules.${key} must be true`);
}
if (contract.rules?.public_render_enabled !== false) errors.push(`${CONTRACT_PATH}: public_render_enabled must stay false in this phase`);
if (contract.rules?.internal_preview_only !== true) errors.push(`${CONTRACT_PATH}: internal_preview_only must be true`);
if (contract.rules?.live_source_connected !== false) errors.push(`${CONTRACT_PATH}: live_source_connected must stay false in this phase`);
if (contract.planned_live_source !== null) errors.push(`${CONTRACT_PATH}: planned_live_source must remain null until a source is explicitly approved`);

const requiredFields = new Set(contract.required_offer_fields || []);
exactSet(requiredFields, new Set([
  "object_id",
  "section_or_entrance",
  "apartment_number_public",
  "rooms",
  "area_m2",
  "floor",
  "price",
  "price_checked_at",
  "availability_status",
  "availability_checked_at",
  "seller_type",
  "contract_type",
  "mortgage_status",
  "source_id",
  "publication_allowed"
]), `${CONTRACT_PATH}: required_offer_fields`);

const availabilityStatuses = new Set(contract.allowed_values?.availability_status || []);
const sellerTypes = new Set(contract.allowed_values?.seller_type || []);
const contractTypes = new Set(contract.allowed_values?.contract_type || []);
const mortgageStatuses = new Set(contract.allowed_values?.mortgage_status || []);
exactSet(availabilityStatuses, new Set(["available", "reserved", "unavailable", "sold", "unknown"]), `${CONTRACT_PATH}: availability values`);
exactSet(sellerTypes, new Set(["developer", "legal_entity", "individual", "unknown"]), `${CONTRACT_PATH}: seller values`);
exactSet(contractTypes, new Set(["ddu", "dkp", "assignment", "preliminary", "investment", "other", "unknown"]), `${CONTRACT_PATH}: contract values`);
exactSet(mortgageStatuses, new Set(["available_verified", "unavailable", "requires_check", "unknown"]), `${CONTRACT_PATH}: mortgage values`);

const priceMaxAge = Number(contract.freshness_policy?.price_max_age_hours);
const availabilityMaxAge = Number(contract.freshness_policy?.availability_max_age_hours);
if (!Number.isFinite(priceMaxAge) || priceMaxAge <= 0 || priceMaxAge > 168) errors.push(`${CONTRACT_PATH}: invalid price freshness window`);
if (!Number.isFinite(availabilityMaxAge) || availabilityMaxAge <= 0 || availabilityMaxAge > 168) errors.push(`${CONTRACT_PATH}: invalid availability freshness window`);
if (contract.freshness_policy?.stale_rows_must_not_be_public !== true) errors.push(`${CONTRACT_PATH}: stale rows must be blocked`);
if (contract.freshness_policy?.missing_timestamp_must_not_be_public !== true) errors.push(`${CONTRACT_PATH}: missing timestamps must be blocked`);

if (feed.schema_version !== "1.0") errors.push(`${FEED_PATH}: schema_version must be 1.0`);
if (!isIsoDate(feed.updated_at)) errors.push(`${FEED_PATH}: updated_at must be YYYY-MM-DD`);
if (feed.portal_id !== "newbuilds-borisoglebsk") errors.push(`${FEED_PATH}: invalid portal_id`);
if (!Array.isArray(feed.offers)) errors.push(`${FEED_PATH}: offers must be an array`);
const offers = Array.isArray(feed.offers) ? feed.offers : [];

if (offers.length === 0) {
  if (feed.status !== "not_connected_no_live_offers") errors.push(`${FEED_PATH}: empty feed must remain not_connected_no_live_offers`);
  if (feed.generated_at !== null) errors.push(`${FEED_PATH}: empty feed must keep generated_at=null`);
  if (feed.source !== null) errors.push(`${FEED_PATH}: empty feed must keep source=null`);
} else {
  if (feed.status !== "internal_preview_not_public") errors.push(`${FEED_PATH}: non-empty prelaunch feed must use internal_preview_not_public`);
  if (!isIsoDateTime(feed.generated_at)) errors.push(`${FEED_PATH}: non-empty feed requires generated_at`);
  if (!feed.source || typeof feed.source !== "object") errors.push(`${FEED_PATH}: non-empty feed requires source metadata`);
}

const forbiddenKeys = new Set(contract.forbidden_offer_keys || []);
scanForbiddenKeys(feed, forbiddenKeys, FEED_PATH);

const activeProjects = projectIndex.filter((item) => item.is_active !== false);
const projectMap = new Map(activeProjects.map((item) => [item.id, item]));
const identities = new Set();
let publishableRows = 0;
let staleRows = 0;

for (const [index, offer] of offers.entries()) {
  const label = `${FEED_PATH}:offers[${index}]`;
  for (const field of requiredFields) {
    if (!Object.prototype.hasOwnProperty.call(offer, field)) errors.push(`${label}: missing field ${field}`);
  }
  const extraKeys = Object.keys(offer).filter((key) => !requiredFields.has(key));
  if (extraKeys.length) errors.push(`${label}: unsupported fields: ${extraKeys.join(", ")}`);

  const objectId = String(offer.object_id || "").trim();
  const projectEntry = projectMap.get(objectId);
  if (!objectId || !projectEntry) errors.push(`${label}: object_id must resolve to an active registered project`);
  if (!String(offer.section_or_entrance ?? "").trim()) errors.push(`${label}: section_or_entrance is required`);
  if (!String(offer.apartment_number_public ?? "").trim()) errors.push(`${label}: apartment_number_public is required`);
  if (!Number.isInteger(offer.rooms) || offer.rooms < 0 || offer.rooms > 10) errors.push(`${label}: rooms must be integer 0..10`);
  if (!Number.isFinite(offer.area_m2) || offer.area_m2 <= 0) errors.push(`${label}: area_m2 must be positive`);
  if (!Number.isInteger(offer.floor) || offer.floor <= 0) errors.push(`${label}: floor must be positive integer`);
  if (offer.price !== null && (!Number.isFinite(offer.price) || offer.price <= 0)) errors.push(`${label}: price must be null or positive number`);
  if (offer.price_checked_at !== null && !isIsoDateTime(offer.price_checked_at)) errors.push(`${label}: invalid price_checked_at`);
  if (!availabilityStatuses.has(offer.availability_status)) errors.push(`${label}: invalid availability_status`);
  if (offer.availability_checked_at !== null && !isIsoDateTime(offer.availability_checked_at)) errors.push(`${label}: invalid availability_checked_at`);
  if (!sellerTypes.has(offer.seller_type)) errors.push(`${label}: invalid seller_type`);
  if (!contractTypes.has(offer.contract_type)) errors.push(`${label}: invalid contract_type`);
  if (!mortgageStatuses.has(offer.mortgage_status)) errors.push(`${label}: invalid mortgage_status`);
  if (!String(offer.source_id || "").trim()) errors.push(`${label}: source_id is required`);
  if (typeof offer.publication_allowed !== "boolean") errors.push(`${label}: publication_allowed must be boolean`);

  const identity = `${objectId}|${offer.section_or_entrance}|${offer.apartment_number_public}`;
  if (identities.has(identity)) errors.push(`${label}: duplicate public apartment identity`);
  identities.add(identity);

  if (offer.price_checked_at && hoursOld(offer.price_checked_at) > priceMaxAge) staleRows += 1;
  if (offer.availability_checked_at && hoursOld(offer.availability_checked_at) > availabilityMaxAge) staleRows += 1;

  if (offer.publication_allowed === true) {
    publishableRows += 1;
    if (contract.rules.public_render_enabled !== true) {
      // Individual rows may be pre-approved internally, but the global renderer remains disabled.
    }
    if (offer.availability_status !== "available") errors.push(`${label}: public row must be available`);
    if (!Number.isFinite(offer.price) || offer.price <= 0) errors.push(`${label}: public row requires positive price`);
    if (!isIsoDateTime(offer.price_checked_at)) errors.push(`${label}: public row requires price_checked_at`);
    if (!isIsoDateTime(offer.availability_checked_at)) errors.push(`${label}: public row requires availability_checked_at`);
    if (isIsoDateTime(offer.price_checked_at) && hoursOld(offer.price_checked_at) > priceMaxAge) errors.push(`${label}: public price is stale`);
    if (isIsoDateTime(offer.availability_checked_at) && hoursOld(offer.availability_checked_at) > availabilityMaxAge) errors.push(`${label}: public availability is stale`);
    if (offer.seller_type === "unknown") errors.push(`${label}: public row cannot use seller_type=unknown`);
    if (offer.contract_type === "unknown") errors.push(`${label}: public row cannot use contract_type=unknown`);
    if (!projectEntry?.is_public_ready) errors.push(`${label}: public row requires project is_public_ready=true`);
    if (!feed.source || feed.source.status !== "accepted") errors.push(`${label}: public row requires accepted feed source`);
    if (feed.source?.seller_basis_confirmed !== true) errors.push(`${label}: public row requires confirmed seller basis`);
    if (String(feed.source?.id || "") !== String(offer.source_id || "")) errors.push(`${label}: source_id must match accepted feed source`);
  }
}

const publicFiles = [
  "index.html",
  ...walkPublicFiles("catalog"),
  ...walkPublicFiles("assets/js"),
  ...walkPublicFiles("guides"),
  ...walkPublicFiles("ipoteka"),
  ...walkPublicFiles("contacts")
];
for (const relativePath of [...new Set(publicFiles)]) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) continue;
  const text = fs.readFileSync(fullPath, "utf8");
  if (text.includes("data/offers/feed.json") || text.includes("/data/offers/feed.json")) {
    errors.push(`${relativePath}: direct public offer-feed consumption is forbidden before activation`);
  }
}

console.log(`Offer rows checked: ${offers.length}`);
console.log(`Internally publication-allowed rows: ${publishableRows}`);
console.log(`Stale timestamp observations: ${staleRows}`);
console.log(`Global public render enabled: ${contract.rules.public_render_enabled === true}`);
console.log(`Live source connected: ${contract.rules.live_source_connected === true}`);

if (errors.length) {
  console.error("\nOffer feed validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Offer feed validation passed.");
