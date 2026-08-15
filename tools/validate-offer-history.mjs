import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HISTORY_PATH = "data/offers/history-contract.json";
const STORAGE_PATH = "data/offers/history-storage.json";
const OFFER_PATH = "data/offers/contract.json";
const FEED_PATH = "data/offers/feed.json";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const source = read(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function exactSet(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    errors.push(`${label}: expected ${right.join(", ")}; got ${left.join(", ")}`);
  }
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function walkFiles(relativeDir, output = []) {
  const fullDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(fullDir)) return output;
  const stat = fs.statSync(fullDir);
  if (stat.isFile()) {
    if (/\.(html|js)$/i.test(relativeDir)) output.push(relativeDir);
    return output;
  }
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const child = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) walkFiles(child, output);
    else if (/\.(html|js)$/i.test(entry.name)) output.push(child);
  }
  return output;
}

const history = readJson(HISTORY_PATH);
const storage = readJson(STORAGE_PATH);
const offers = readJson(OFFER_PATH);
const feed = readJson(FEED_PATH);
if (!history || !storage || !offers || !feed) process.exit(1);

if (history.schema_version !== "1.1") errors.push(`${HISTORY_PATH}: schema_version must be 1.1`);
if (!isIsoDate(history.updated_at)) errors.push(`${HISTORY_PATH}: updated_at must be YYYY-MM-DD`);
if (history.portal_id !== "newbuilds-borisoglebsk") errors.push(`${HISTORY_PATH}: invalid portal_id`);
if (history.status !== "store_design_selected_not_connected") errors.push(`${HISTORY_PATH}: invalid status`);
if (history.sources?.current_offer_contract !== OFFER_PATH) errors.push(`${HISTORY_PATH}: current_offer_contract mismatch`);
if (history.sources?.current_feed !== FEED_PATH) errors.push(`${HISTORY_PATH}: current_feed mismatch`);
if (history.sources?.storage_design !== STORAGE_PATH) errors.push(`${HISTORY_PATH}: storage_design mismatch`);

for (const key of [
  "append_only",
  "event_update_forbidden",
  "event_delete_forbidden",
  "current_feed_must_not_embed_history",
  "real_history_events_in_repository_forbidden",
  "personal_data_forbidden",
  "secrets_in_repository_forbidden",
  "direct_browser_history_access_forbidden",
  "source_id_required",
  "observed_at_required",
  "hash_chain_required"
]) {
  if (history.rules?.[key] !== true) errors.push(`${HISTORY_PATH}: rules.${key} must be true`);
}
for (const key of ["history_write_enabled", "history_store_connected", "public_history_api_enabled"]) {
  if (history.rules?.[key] !== false) errors.push(`${HISTORY_PATH}: rules.${key} must remain false before activation`);
}

if (history.store?.status !== "design_selected_not_deployed") errors.push(`${HISTORY_PATH}: store.status must be design_selected_not_deployed`);
if (history.store?.type !== "supabase_private_table") errors.push(`${HISTORY_PATH}: selected store type must be supabase_private_table`);
if (history.store?.design_reference !== STORAGE_PATH) errors.push(`${HISTORY_PATH}: store.design_reference mismatch`);
if (history.store?.secure_reference !== null) errors.push(`${HISTORY_PATH}: store.secure_reference must remain null before deployment`);
if (history.store?.retention_days !== null) errors.push(`${HISTORY_PATH}: store.retention_days must remain null before retention decision`);
exactSet(new Set(history.store?.allowed_types || []), new Set(["supabase_private_table", "managed_backend"]), `${HISTORY_PATH}: allowed store types`);
exactSet(new Set(history.store?.activation_requires || []), new Set([
  "managed_store_selected",
  "secure_reference_resolved",
  "retention_policy_defined",
  "append_only_enforced_server_side",
  "service_role_only_write_access",
  "backup_or_export_policy_defined"
]), `${HISTORY_PATH}: activation requirements`);

if (storage.status !== "store_design_selected_not_deployed") errors.push(`${STORAGE_PATH}: selected storage design must remain not deployed`);
if (storage.store?.schema !== "public" || storage.store?.table !== "newbuild_offer_history_events") errors.push(`${STORAGE_PATH}: unexpected selected history store`);
if (storage.deployment?.production_ddl_applied !== false || storage.deployment?.history_writer_deployed !== false || storage.deployment?.history_write_enabled !== false) errors.push(`${STORAGE_PATH}: selected history store must remain undeployed/write-disabled`);
if (storage.completion_state?.store_selected !== true || storage.completion_state?.server_history_store_available !== false || storage.completion_state?.hash_chain_writer_available !== false) errors.push(`${STORAGE_PATH}: storage completion state mismatch`);

exactSet(new Set(history.offer_identity_fields || []), new Set([
  "object_id",
  "section_or_entrance",
  "apartment_number_public"
]), `${HISTORY_PATH}: offer identity fields`);
exactSet(new Set(history.event_types || []), new Set(["price_observed", "availability_observed"]), `${HISTORY_PATH}: event types`);
exactSet(new Set(history.required_event_fields || []), new Set([
  "event_id",
  "event_type",
  "observed_at",
  "object_id",
  "section_or_entrance",
  "apartment_number_public",
  "source_id",
  "value",
  "previous_event_hash",
  "event_hash"
]), `${HISTORY_PATH}: required event fields`);

const priceRule = history.event_value_rules?.price_observed;
if (priceRule?.type !== "number_or_null" || priceRule?.positive_when_number !== true) errors.push(`${HISTORY_PATH}: invalid price_observed rule`);
const availabilityRule = history.event_value_rules?.availability_observed;
if (availabilityRule?.type !== "enum") errors.push(`${HISTORY_PATH}: invalid availability_observed rule`);
exactSet(new Set(availabilityRule?.values || []), new Set(["available", "reserved", "unavailable", "sold", "unknown"]), `${HISTORY_PATH}: availability history values`);
exactSet(new Set(offers.allowed_values?.availability_status || []), new Set(availabilityRule?.values || []), `${HISTORY_PATH}: availability enum must match current offer contract`);

if (history.hash_chain?.algorithm !== "sha256") errors.push(`${HISTORY_PATH}: hash chain algorithm must be sha256`);
if (history.hash_chain?.first_event_previous_hash !== null) errors.push(`${HISTORY_PATH}: first event previous hash must be null`);
if (history.hash_chain?.same_offer_events_must_chain !== true) errors.push(`${HISTORY_PATH}: same offer events must chain`);
exactSet(new Set(history.hash_chain?.event_hash_input_fields || []), new Set([
  "event_type",
  "observed_at",
  "object_id",
  "section_or_entrance",
  "apartment_number_public",
  "source_id",
  "value",
  "previous_event_hash"
]), `${HISTORY_PATH}: hash input fields`);

const forbidden = new Set(history.forbidden_event_keys || []);
for (const key of [
  "seller_name", "seller_phone", "seller_email", "client_name", "client_phone", "client_email",
  "comment", "internal_comment", "user_agent", "page_url", "referrer", "access_token", "api_key", "raw_sheet_url"
]) {
  if (!forbidden.has(key)) errors.push(`${HISTORY_PATH}: forbidden event key missing ${key}`);
}

if (offers.rules?.history_separate_from_current_feed !== true) errors.push(`${OFFER_PATH}: history_separate_from_current_feed must remain true`);
if (offers.rules?.live_source_connected !== false || offers.rules?.public_render_enabled !== false) errors.push(`${OFFER_PATH}: current feed must remain disconnected and private`);
const offerFields = new Set(offers.required_offer_fields || []);
for (const embeddedHistoryField of ["history", "events", "price_history", "availability_history", "status_history"]) {
  if (offerFields.has(embeddedHistoryField)) errors.push(`${OFFER_PATH}: current feed must not embed ${embeddedHistoryField}`);
}
if (!Array.isArray(feed.offers)) errors.push(`${FEED_PATH}: offers must be an array`);
for (const [index, offer] of (Array.isArray(feed.offers) ? feed.offers : []).entries()) {
  for (const embeddedHistoryField of ["history", "events", "price_history", "availability_history", "status_history"]) {
    if (Object.prototype.hasOwnProperty.call(offer, embeddedHistoryField)) errors.push(`${FEED_PATH}:offers[${index}] must not embed ${embeddedHistoryField}`);
  }
}

for (const relativePath of [...new Set([
  "index.html",
  ...walkFiles("catalog"),
  ...walkFiles("assets/js"),
  ...walkFiles("guides"),
  ...walkFiles("contacts"),
  ...walkFiles("ipoteka")
])]) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) continue;
  const text = fs.readFileSync(fullPath, "utf8");
  if (/offer[-_/]?history|history[-_/]?offers/i.test(text)) errors.push(`${relativePath}: direct browser offer-history access/reference is forbidden before activation`);
}

console.log(`Offer history event types: ${(history.event_types || []).length}`);
console.log(`Offer history store selected: ${storage.completion_state?.store_selected === true}`);
console.log(`Offer history store connected: ${history.rules.history_store_connected === true}`);
console.log(`Offer history writes enabled: ${history.rules.history_write_enabled === true}`);
console.log(`Current feed rows checked for embedded history: ${(feed.offers || []).length}`);

if (errors.length) {
  console.error("\nOffer history validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Offer history validation passed.");
