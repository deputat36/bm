import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STORAGE_PATH = "data/offers/history-storage.json";
const HISTORY_PATH = "data/offers/history-contract.json";
const OFFER_PATH = "data/offers/contract.json";
const SECURITY_PATH = "data/security/portal-supabase-security.json";
const errors = [];

function read(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(full, "utf8");
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
  if (JSON.stringify(left) !== JSON.stringify(right)) errors.push(`${label}: expected ${right.join(", ")}; got ${left.join(", ")}`);
}

const storage = readJson(STORAGE_PATH);
const history = readJson(HISTORY_PATH);
const offer = readJson(OFFER_PATH);
const security = readJson(SECURITY_PATH);
if (!storage || !history || !offer || !security) process.exit(1);

if (storage.schema_version !== "1.0") errors.push(`${STORAGE_PATH}: schema_version must be 1.0`);
if (storage.portal_id !== "newbuilds-borisoglebsk") errors.push(`${STORAGE_PATH}: invalid portal_id`);
if (storage.status !== "store_design_selected_not_deployed") errors.push(`${STORAGE_PATH}: status must remain store_design_selected_not_deployed`);

if (storage.store?.kind !== "dedicated_postgres_table") errors.push(`${STORAGE_PATH}: store.kind must be dedicated_postgres_table`);
if (storage.store?.schema !== "public" || storage.store?.table !== "newbuild_offer_history_events") errors.push(`${STORAGE_PATH}: unexpected store identity`);
for (const key of ["append_only", "rls_enabled", "rls_forced"]) {
  if (storage.store?.[key] !== true) errors.push(`${STORAGE_PATH}: store.${key} must be true`);
}
if (storage.store?.anon_access !== "none" || storage.store?.authenticated_access !== "none") errors.push(`${STORAGE_PATH}: anon/authenticated access must remain none`);
if (storage.store?.browser_direct_access !== false) errors.push(`${STORAGE_PATH}: browser direct access must remain false`);
exactSet(new Set(storage.store?.service_role_access || []), new Set(["select", "insert"]), `${STORAGE_PATH}: service_role_access`);

for (const key of ["migration_file_created", "production_ddl_applied", "history_writer_deployed", "history_write_enabled"]) {
  if (storage.deployment?.[key] !== false) errors.push(`${STORAGE_PATH}: deployment.${key} must remain false in design-only phase`);
}
if (storage.deployment?.sql_preview_only !== true) errors.push(`${STORAGE_PATH}: sql_preview_only must be true`);

const canonicalFields = new Set(history.required_event_fields || []);
const expectedColumns = new Set([...canonicalFields, "idempotency_key", "created_at"]);
const columns = Array.isArray(storage.columns) ? storage.columns : [];
exactSet(new Set(columns.map((column) => column.name)), expectedColumns, `${STORAGE_PATH}: columns`);
for (const column of columns) {
  if (!String(column.type || "").trim()) errors.push(`${STORAGE_PATH}:${column.name}: type is required`);
  if (typeof column.nullable !== "boolean") errors.push(`${STORAGE_PATH}:${column.name}: nullable must be boolean`);
  if (!String(column.source || "").trim()) errors.push(`${STORAGE_PATH}:${column.name}: source is required`);
}
for (const field of ["event_id", "offer_identity", "object_id", "section_or_entrance", "apartment_number_public", "event_type", "observed_at", "source_id", "source_checked_at", "event_hash", "idempotency_key", "created_at"]) {
  if (columns.find((column) => column.name === field)?.nullable !== false) errors.push(`${STORAGE_PATH}:${field}: must be non-null`);
}

if (storage.constraints?.event_types_source !== `${HISTORY_PATH}#event_types`) errors.push(`${STORAGE_PATH}: event_types_source mismatch`);
if (storage.constraints?.availability_status_source !== `${OFFER_PATH}#allowed_availability_statuses`) errors.push(`${STORAGE_PATH}: availability_status_source mismatch`);
for (const key of ["event_hash_unique", "forbid_update", "forbid_delete", "price_observed_requires_price", "availability_observed_requires_status", "generic_json_payload_forbidden"]) {
  if (storage.constraints?.[key] !== true) errors.push(`${STORAGE_PATH}: constraints.${key} must be true`);
}
exactSet(new Set(storage.constraints?.idempotency_unique || []), new Set(["offer_identity", "idempotency_key"]), `${STORAGE_PATH}: idempotency_unique`);
if (columns.some((column) => ["metadata", "payload", "data", "context"].includes(column.name) && /jsonb?/i.test(column.type))) errors.push(`${STORAGE_PATH}: generic JSON payload/metadata column is forbidden`);

if (storage.hash_chain?.algorithm !== history.hash_chain?.algorithm) errors.push(`${STORAGE_PATH}: hash algorithm must match history contract`);
if (storage.hash_chain?.canonical_field_order_source !== `${HISTORY_PATH}#hash_chain.canonical_field_order`) errors.push(`${STORAGE_PATH}: canonical_field_order_source mismatch`);
if (storage.hash_chain?.first_event_previous_hash !== null) errors.push(`${STORAGE_PATH}: first event previous hash must remain null`);
for (const key of ["same_offer_chain_only", "writer_must_verify_previous_hash_before_append", "writer_must_compute_hash_server_side"]) {
  if (storage.hash_chain?.[key] !== true) errors.push(`${STORAGE_PATH}: hash_chain.${key} must be true`);
}
if (storage.hash_chain?.writer_design_status !== "not_implemented_until_live_source_and_store_review") errors.push(`${STORAGE_PATH}: writer design must remain not implemented`);

if (storage.retention?.status !== "requires_policy_before_deployment") errors.push(`${STORAGE_PATH}: retention status must remain requires_policy_before_deployment`);
if (storage.retention?.retention_days !== null) errors.push(`${STORAGE_PATH}: retention_days must remain null until policy is approved`);
if (storage.retention?.automatic_delete_enabled !== false) errors.push(`${STORAGE_PATH}: automatic delete must remain disabled`);
if (storage.backup_export?.status !== "requires_policy_before_deployment") errors.push(`${STORAGE_PATH}: backup/export status must remain requires_policy_before_deployment`);
if (storage.backup_export?.managed_backup_verified !== false || storage.backup_export?.restore_test_verified !== false) errors.push(`${STORAGE_PATH}: backup/restore must not be claimed verified`);
if (storage.backup_export?.export_schedule !== null) errors.push(`${STORAGE_PATH}: export schedule must remain null until policy is selected`);

for (const key of ["pii_forbidden", "client_identity_forbidden", "internal_seller_identity_forbidden", "browser_context_forbidden"]) {
  if (storage.privacy?.[key] !== true) errors.push(`${STORAGE_PATH}: privacy.${key} must be true`);
}
const forbiddenColumns = new Set(storage.privacy?.forbidden_columns || []);
for (const key of ["name", "phone", "email", "client_fixation_id", "seller_internal_id", "page_url", "referrer", "user_agent"]) {
  if (!forbiddenColumns.has(key)) errors.push(`${STORAGE_PATH}: privacy denylist missing ${key}`);
  if (columns.some((column) => column.name === key)) errors.push(`${STORAGE_PATH}: forbidden column present: ${key}`);
}

if (storage.sql_preview?.generator !== "tools/build-offer-history-storage-sql.mjs") errors.push(`${STORAGE_PATH}: unexpected SQL preview generator`);
if (storage.sql_preview?.must_not_write_migration !== true || storage.sql_preview?.must_not_execute_sql !== true) errors.push(`${STORAGE_PATH}: SQL preview must remain non-deploying`);
if (storage.sql_preview?.preview_requires_banner !== "PREVIEW ONLY - NOT DEPLOYED") errors.push(`${STORAGE_PATH}: preview banner mismatch`);

if (history.rules?.storage_connected !== false || history.rules?.history_write_enabled !== false || history.rules?.public_history_api_enabled !== false) errors.push(`${HISTORY_PATH}: history contract must remain disconnected/write-disabled/private`);
if (history.history_store?.status !== "not_selected") errors.push(`${HISTORY_PATH}: history_store status must not claim deployment before contract sync`);
if (offer.live_source_connected !== false || offer.public_render_enabled !== false) errors.push(`${OFFER_PATH}: live source and public renderer must remain disabled`);
if ((offer.offers || []).length !== 0) errors.push(`${OFFER_PATH}: design-only phase expects empty current offer feed`);

const prefixes = new Set(security.ownership?.portal_owned_prefixes || []);
if (!prefixes.has("newbuild_")) errors.push(`${SECURITY_PATH}: newbuild_ portal security scope is required`);
if (security.repository_rules?.portal_security_definer_forbidden !== true) errors.push(`${SECURITY_PATH}: portal SECURITY DEFINER prohibition must remain active`);
if (security.repository_rules?.portal_tables_require_rls_enable !== true) errors.push(`${SECURITY_PATH}: portal tables must require RLS`);

const completion = storage.completion_state || {};
if (completion.store_selected !== true) errors.push(`${STORAGE_PATH}: store_selected must be true`);
for (const key of ["retention_policy_selected", "backup_export_policy_selected", "server_history_store_available", "hash_chain_writer_available", "production_history_write_enabled"]) {
  if (completion[key] !== false) errors.push(`${STORAGE_PATH}: completion_state.${key} must remain false`);
}

console.log(`Offer history store: ${storage.store.schema}.${storage.store.table}`);
console.log(`Canonical history fields: ${canonicalFields.size}; physical columns: ${columns.length}`);
console.log(`Migration created: ${storage.deployment.migration_file_created}`);
console.log(`Production DDL applied: ${storage.deployment.production_ddl_applied}`);
console.log(`History writer deployed: ${storage.deployment.history_writer_deployed}`);
console.log(`Retention policy selected: ${completion.retention_policy_selected}`);
console.log(`Backup/export policy selected: ${completion.backup_export_policy_selected}`);

if (errors.length) {
  console.error("\nOffer history storage validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Offer history storage design validation passed.");
