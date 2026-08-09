import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PERSISTENCE_PATH = "data/operations/commercial-outcome-persistence.json";
const EVENTS_PATH = "data/operations/commercial-outcome-events.json";
const INTERNAL_OUTCOMES_PATH = "data/analytics/internal-outcomes.json";
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
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    errors.push(`${label}: expected ${right.join(", ")}; got ${left.join(", ")}`);
  }
}

const persistence = readJson(PERSISTENCE_PATH);
const events = readJson(EVENTS_PATH);
const internal = readJson(INTERNAL_OUTCOMES_PATH);
const security = readJson(SECURITY_PATH);
if (!persistence || !events || !internal || !security) process.exit(1);

if (persistence.schema_version !== "1.0") errors.push(`${PERSISTENCE_PATH}: schema_version must be 1.0`);
if (persistence.portal_id !== "newbuilds-borisoglebsk") errors.push(`${PERSISTENCE_PATH}: invalid portal_id`);
if (persistence.status !== "store_design_selected_not_deployed") {
  errors.push(`${PERSISTENCE_PATH}: status must remain store_design_selected_not_deployed before explicit migration approval`);
}

if (persistence.store?.kind !== "dedicated_postgres_table") errors.push(`${PERSISTENCE_PATH}: store.kind must be dedicated_postgres_table`);
if (persistence.store?.schema !== "public") errors.push(`${PERSISTENCE_PATH}: store.schema must be public`);
if (persistence.store?.table !== "newbuild_commercial_events") errors.push(`${PERSISTENCE_PATH}: unexpected table name`);
if (persistence.store?.table === "newbuild_lead_events") errors.push(`${PERSISTENCE_PATH}: commercial store must not overload operational event log`);
if (persistence.store?.lead_fk !== "public.newbuild_leads(id)") errors.push(`${PERSISTENCE_PATH}: lead_fk must reference newbuild_leads`);
if (persistence.store?.on_delete !== "restrict") errors.push(`${PERSISTENCE_PATH}: lead FK deletion must be restrict`);
for (const key of ["append_only", "rls_enabled", "rls_forced"]) {
  if (persistence.store?.[key] !== true) errors.push(`${PERSISTENCE_PATH}: store.${key} must be true`);
}
if (persistence.store?.anon_access !== "none" || persistence.store?.authenticated_access !== "none") {
  errors.push(`${PERSISTENCE_PATH}: anon/authenticated access must remain none`);
}
if (persistence.store?.browser_direct_access !== false) errors.push(`${PERSISTENCE_PATH}: browser direct access must be false`);
exactSet(new Set(persistence.store?.service_role_access || []), new Set(["select", "insert"]), `${PERSISTENCE_PATH}: service_role_access`);

for (const key of ["migration_file_created", "production_ddl_applied", "write_api_deployed", "event_write_enabled"]) {
  if (persistence.deployment?.[key] !== false) errors.push(`${PERSISTENCE_PATH}: deployment.${key} must remain false in design-only phase`);
}
if (persistence.deployment?.sql_preview_only !== true) errors.push(`${PERSISTENCE_PATH}: sql_preview_only must be true`);
if (persistence.deployment?.activation_requires_owner_operations_decisions !== true) errors.push(`${PERSISTENCE_PATH}: owner operations gate must remain required`);

const api = persistence.write_api_design || {};
if (api.function !== "public.newbuild_record_commercial_event") errors.push(`${PERSISTENCE_PATH}: unexpected write function name`);
if (api.security_mode !== "invoker") errors.push(`${PERSISTENCE_PATH}: write API must use security invoker`);
if (api.fixed_search_path !== "public") errors.push(`${PERSISTENCE_PATH}: write API must fix search_path=public`);
for (const key of ["public_execute", "anon_execute", "authenticated_execute"]) {
  if (api[key] !== false) errors.push(`${PERSISTENCE_PATH}: ${key} must remain false`);
}
for (const key of ["service_role_execute", "idempotency_required", "server_timestamp_authoritative", "closure_reason_owner_policy_required_for_closed_lost"]) {
  if (api[key] !== true) errors.push(`${PERSISTENCE_PATH}: ${key} must be true`);
}

const canonicalFields = new Set(events.required_event_fields || []);
const expectedColumns = new Set([...canonicalFields, "idempotency_key", "created_at"]);
const columns = Array.isArray(persistence.columns) ? persistence.columns : [];
exactSet(new Set(columns.map((column) => column.name)), expectedColumns, `${PERSISTENCE_PATH}: columns`);
for (const column of columns) {
  if (!String(column.type || "").trim()) errors.push(`${PERSISTENCE_PATH}:${column.name}: type is required`);
  if (typeof column.nullable !== "boolean") errors.push(`${PERSISTENCE_PATH}:${column.name}: nullable must be boolean`);
  if (!String(column.source || "").trim()) errors.push(`${PERSISTENCE_PATH}:${column.name}: source is required`);
}
for (const nonNull of ["event_id", "lead_id", "event_type", "occurred_at", "actor_ref", "source_system", "idempotency_key", "created_at"]) {
  if (columns.find((column) => column.name === nonNull)?.nullable !== false) errors.push(`${PERSISTENCE_PATH}:${nonNull}: must be non-null`);
}

if (persistence.constraints?.event_type_values_source !== `${EVENTS_PATH}#events[].id`) errors.push(`${PERSISTENCE_PATH}: event type source must be canonical event contract`);
exactSet(new Set(persistence.constraints?.unique_idempotency || []), new Set(["lead_id", "idempotency_key"]), `${PERSISTENCE_PATH}: unique_idempotency`);
for (const key of ["lead_fk_required", "forbid_update", "forbid_delete", "closed_lost_reason_enforced_only_after_owner_policy_activation", "event_required_fields_enforced_by_write_api", "generic_json_metadata_column_forbidden"]) {
  if (persistence.constraints?.[key] !== true) errors.push(`${PERSISTENCE_PATH}: constraints.${key} must be true`);
}
if (columns.some((column) => ["metadata", "payload", "data", "context"].includes(column.name) && /jsonb?/i.test(column.type))) {
  errors.push(`${PERSISTENCE_PATH}: generic JSON metadata/payload column is forbidden`);
}

const eventIds = new Set((events.events || []).map((event) => event.id));
exactSet(eventIds, new Set([
  "consultation_scheduled", "consultation_completed", "selection_sent", "showing_scheduled",
  "showing_completed", "deposit", "closed_won", "closed_lost"
]), `${EVENTS_PATH}: canonical event ids`);
if (events.rules?.persistence_connected !== false || events.rules?.event_write_enabled !== false) {
  errors.push(`${EVENTS_PATH}: event contract must remain persistence/write disabled during design-only phase`);
}

const internalEvents = new Map((internal.canonical_outcome_events || []).map((event) => [event.id, event]));
for (const eventId of eventIds) {
  const outcome = internalEvents.get(eventId);
  if (!outcome || outcome.coverage !== "schema_gap" || outcome.source !== null) {
    errors.push(`${INTERNAL_OUTCOMES_PATH}:${eventId}: must remain schema_gap until deployed persistence is verified`);
  }
}

const forbidden = new Set(persistence.privacy?.pii_columns_forbidden || []);
for (const key of events.forbidden_payload_keys || []) {
  if (!forbidden.has(key)) errors.push(`${PERSISTENCE_PATH}: privacy denylist missing ${key}`);
  if (columns.some((column) => column.name === key)) errors.push(`${PERSISTENCE_PATH}: forbidden PII/attribution column present: ${key}`);
}
if (persistence.privacy?.protected_note_external_export_forbidden !== true) errors.push(`${PERSISTENCE_PATH}: protected_note external export must be forbidden`);
if (persistence.privacy?.lead_id_external_export_forbidden !== true) errors.push(`${PERSISTENCE_PATH}: lead_id external export must be forbidden`);
if (Number(persistence.privacy?.aggregate_reporting_min_group_size) !== 3) errors.push(`${PERSISTENCE_PATH}: minimum aggregate group size must remain 3`);

if (persistence.sql_preview?.generator !== "tools/build-commercial-outcome-persistence-sql.mjs") errors.push(`${PERSISTENCE_PATH}: unexpected SQL preview generator`);
if (persistence.sql_preview?.must_not_write_migration !== true || persistence.sql_preview?.must_not_execute_sql !== true) errors.push(`${PERSISTENCE_PATH}: SQL preview must remain non-deploying`);
if (persistence.sql_preview?.preview_requires_banner !== "PREVIEW ONLY - NOT DEPLOYED") errors.push(`${PERSISTENCE_PATH}: preview banner contract mismatch`);

const completion = persistence.completion_state || {};
if (completion.store_selected !== true) errors.push(`${PERSISTENCE_PATH}: store_selected must be true`);
for (const key of ["server_persistence_available", "protected_write_api_available", "production_write_enabled", "commercial_events_available_in_internal_outcomes"]) {
  if (completion[key] !== false) errors.push(`${PERSISTENCE_PATH}: completion_state.${key} must remain false before deployment evidence`);
}

const prefixes = new Set(security.ownership?.portal_owned_prefixes || []);
if (!prefixes.has("newbuild_")) errors.push(`${SECURITY_PATH}: portal security scope must include newbuild_ prefix`);
if (security.repository_rules?.portal_security_definer_forbidden !== true) errors.push(`${SECURITY_PATH}: SECURITY DEFINER must remain forbidden for portal objects`);
if (security.repository_rules?.portal_functions_require_explicit_security_invoker !== true) errors.push(`${SECURITY_PATH}: SECURITY INVOKER rule must remain active`);
if (security.repository_rules?.portal_tables_require_rls_enable !== true) errors.push(`${SECURITY_PATH}: portal tables must require RLS`);

console.log(`Commercial store: ${persistence.store.schema}.${persistence.store.table}`);
console.log(`Canonical event fields: ${canonicalFields.size}; physical columns: ${columns.length}`);
console.log(`Migration created: ${persistence.deployment.migration_file_created}`);
console.log(`Production DDL applied: ${persistence.deployment.production_ddl_applied}`);
console.log(`Write API deployed: ${persistence.deployment.write_api_deployed}`);
console.log(`Internal outcome events still schema_gap: ${[...eventIds].filter((id) => internalEvents.get(id)?.coverage === "schema_gap").length}`);

if (errors.length) {
  console.error("\nCommercial outcome persistence validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Commercial outcome persistence design validation passed.");
