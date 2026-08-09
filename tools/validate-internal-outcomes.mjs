import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = "data/analytics/internal-outcomes.json";
const LIFECYCLE_PATH = "data/operations/lead-lifecycle.json";
const EVENT_LOG_PATH = "data/operations/lead-event-log.json";
const PUBLIC_EVENTS_PATH = "data/analytics/events.json";
const RUNTIME_PATH = "supabase/functions/newbuild-lead/index.ts";
const MIGRATION_PATH = "supabase/migrations/20260724060538_newbuild_lead_operations_v2.sql";
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

const spec = readJson(SPEC_PATH);
const lifecycle = readJson(LIFECYCLE_PATH);
const eventLog = readJson(EVENT_LOG_PATH);
const publicEvents = readJson(PUBLIC_EVENTS_PATH);
const runtime = read(RUNTIME_PATH);
const migration = read(MIGRATION_PATH);
if (!spec || !lifecycle || !eventLog || !publicEvents || !runtime || !migration) process.exit(1);

if (spec.schema_version !== "1.0") errors.push(`${SPEC_PATH}: schema_version must be 1.0`);
if (!isIsoDate(spec.updated_at)) errors.push(`${SPEC_PATH}: updated_at must be YYYY-MM-DD`);
if (spec.portal_id !== "newbuilds-borisoglebsk") errors.push(`${SPEC_PATH}: invalid portal_id`);
if (spec.status !== "specification_only_no_live_outcome_export") errors.push(`${SPEC_PATH}: invalid status`);

const expectedSources = {
  lead_table: "public.newbuild_leads",
  event_table: "public.newbuild_lead_events",
  lifecycle_contract: LIFECYCLE_PATH,
  event_log_contract: EVENT_LOG_PATH,
  runtime_function: RUNTIME_PATH,
  operations_migration: MIGRATION_PATH,
  public_analytics_contract: PUBLIC_EVENTS_PATH
};
for (const [key, value] of Object.entries(expectedSources)) {
  if (spec.sources?.[key] !== value) errors.push(`${SPEC_PATH}: sources.${key} must be ${value}`);
}

for (const key of [
  "protected_server_data_only",
  "real_outcome_rows_in_repository_forbidden",
  "personal_data_in_generated_reports_forbidden",
  "lead_id_in_external_analytics_forbidden",
  "record_locator_in_external_analytics_forbidden",
  "owner_reference_in_external_analytics_forbidden",
  "missing_commercial_event_must_not_be_inferred",
  "public_and_internal_event_namespaces_separate",
  "aggregate_reports_only"
]) {
  if (spec.rules?.[key] !== true) errors.push(`${SPEC_PATH}: rules.${key} must be true`);
}
for (const key of ["live_export_enabled", "cost_data_connected"]) {
  if (spec.rules?.[key] !== false) errors.push(`${SPEC_PATH}: rules.${key} must be false in current phase`);
}

const expectedCanonical = new Set([
  "lead_received",
  "lead_assigned",
  "lead_contacted",
  "lead_qualified",
  "consultation_scheduled",
  "consultation_completed",
  "selection_sent",
  "showing_scheduled",
  "showing_completed",
  "deposit",
  "closed_won",
  "closed_lost"
]);
const canonical = Array.isArray(spec.canonical_outcome_events) ? spec.canonical_outcome_events : [];
exactSet(new Set(canonical.map((item) => item.id)), expectedCanonical, `${SPEC_PATH}: canonical outcome ids`);
const seenCanonical = new Set();
let availableCanonical = 0;
let gapCanonical = 0;
for (const event of canonical) {
  const label = `${SPEC_PATH}:${event.id || "unknown-event"}`;
  if (seenCanonical.has(event.id)) errors.push(`${label}: duplicate id`);
  seenCanonical.add(event.id);
  if (!new Set(["available", "schema_gap"]).has(event.coverage)) errors.push(`${label}: invalid coverage=${event.coverage}`);
  if (!String(event.definition || "").trim()) errors.push(`${label}: definition is required`);
  if (event.coverage === "available") {
    availableCanonical += 1;
    if (!String(event.source || "").trim()) errors.push(`${label}: available event requires source`);
  } else {
    gapCanonical += 1;
    if (event.source !== null) errors.push(`${label}: schema_gap must keep source=null`);
  }
}
if (availableCanonical !== 4 || gapCanonical !== 8) {
  errors.push(`${SPEC_PATH}: current coverage must be 4 available / 8 schema_gap`);
}

const expectedDerived = new Set([
  "contact_attempted",
  "consultation_started",
  "contact_rate",
  "qualified_rate",
  "consultation_start_rate",
  "deal_rate"
]);
const derived = Array.isArray(spec.derived_internal_metrics) ? spec.derived_internal_metrics : [];
exactSet(new Set(derived.map((item) => item.id)), expectedDerived, `${SPEC_PATH}: derived metric ids`);
for (const item of derived) {
  if (!String(item.coverage || "").trim()) errors.push(`${SPEC_PATH}:${item.id}: coverage is required`);
  if (!String(item.source || item.formula || "").trim()) errors.push(`${SPEC_PATH}:${item.id}: source or formula is required`);
}
const dealRate = derived.find((item) => item.id === "deal_rate");
if (dealRate?.coverage !== "blocked_by_schema_gap") errors.push(`${SPEC_PATH}: deal_rate must remain blocked_by_schema_gap`);

const expectedDimensions = new Set([
  "lead_source",
  "placement",
  "object_id",
  "form_id",
  "lead_type",
  "lead_class",
  "form_role",
  "result_status"
]);
const dimensions = Array.isArray(spec.dimensions) ? spec.dimensions : [];
exactSet(new Set(dimensions.map((item) => item.id)), expectedDimensions, `${SPEC_PATH}: dimensions`);
for (const dimension of dimensions) {
  if (!new Set(["server_record", "schema_gap"]).has(dimension.availability)) {
    errors.push(`${SPEC_PATH}:${dimension.id}: invalid availability`);
  }
  if (dimension.availability === "server_record" && !String(dimension.source || "").startsWith("newbuild_leads.")) {
    errors.push(`${SPEC_PATH}:${dimension.id}: server_record dimension requires newbuild_leads source`);
  }
  if (dimension.availability === "schema_gap" && dimension.source !== null) {
    errors.push(`${SPEC_PATH}:${dimension.id}: schema_gap must use source=null`);
  }
}
const formRole = dimensions.find((item) => item.id === "form_role");
if (formRole?.availability !== "schema_gap") errors.push(`${SPEC_PATH}: form_role must remain explicit schema_gap until server persistence exists`);

const forbiddenReportFields = new Set(spec.privacy?.forbidden_report_fields || []);
for (const field of [
  "lead_id",
  "event_id",
  "record_locator",
  "client_fixation_id",
  "lead_owner_ref",
  "backup_owner_ref",
  "name",
  "phone",
  "phone_normalized",
  "email",
  "comment",
  "question",
  "page_url",
  "referrer",
  "user_agent"
]) {
  if (!forbiddenReportFields.has(field)) errors.push(`${SPEC_PATH}: privacy must forbid ${field}`);
}
if (!Number.isInteger(spec.privacy?.minimum_group_size) || spec.privacy.minimum_group_size < 3) {
  errors.push(`${SPEC_PATH}: minimum_group_size must be integer >= 3`);
}
if (spec.privacy?.small_groups_must_be_suppressed !== true) errors.push(`${SPEC_PATH}: small groups must be suppressed`);

const knownGaps = new Set(spec.known_gaps || []);
for (const gap of [
  "form_role_not_persisted_as_server_dimension",
  "consultation_scheduled_event_missing",
  "consultation_completed_event_missing",
  "selection_sent_event_missing",
  "showing_scheduled_event_missing",
  "showing_completed_event_missing",
  "deposit_event_missing",
  "closed_won_event_missing",
  "closed_lost_event_missing",
  "cost_data_not_connected"
]) {
  if (!knownGaps.has(gap)) errors.push(`${SPEC_PATH}: known gap missing ${gap}`);
}

if (lifecycle.status !== "server_connected_owner_activation_pending") errors.push(`${LIFECYCLE_PATH}: unexpected lifecycle status`);
if (!Array.isArray(lifecycle.states) || !lifecycle.states.some((item) => item.id === "consultation_active")) {
  errors.push(`${LIFECYCLE_PATH}: consultation_active state is required for current derived metric`);
}
if (eventLog.status !== "server_append_only_connected" || eventLog.rules?.append_only !== true) {
  errors.push(`${EVENT_LOG_PATH}: append-only event log must remain connected`);
}

for (const fragment of [
  "lead_source: cleanText(payload.lead_source",
  "placement: cleanText(payload.placement",
  "form_id: cleanText(payload.form_id",
  "residential_complex_id: cleanText(payload.residential_complex_id",
  "lead_type: leadType",
  "lead_class: leadClass"
]) {
  if (!runtime.includes(fragment)) errors.push(`${RUNTIME_PATH}: missing server attribution fragment ${fragment}`);
}
if (runtime.includes("form_role: cleanText(payload.form_role")) {
  errors.push(`${RUNTIME_PATH}: form_role is now persisted; update internal-outcomes contract instead of keeping schema_gap`);
}
for (const fragment of [
  "contacted_at timestamptz",
  "qualified_at timestamptz",
  "assigned_at timestamptz",
  "first_action_at timestamptz",
  "public.newbuild_lead_events"
]) {
  if (!migration.includes(fragment)) errors.push(`${MIGRATION_PATH}: missing protected outcome source fragment ${fragment}`);
}

const publicIds = new Set((publicEvents.events || []).map((item) => item.id));
for (const eventId of expectedCanonical) {
  if (publicIds.has(eventId)) errors.push(`${PUBLIC_EVENTS_PATH}: protected internal event ${eventId} must not be a public analytics event`);
}
if (publicEvents.rules?.personal_data_in_analytics_forbidden !== true) {
  errors.push(`${PUBLIC_EVENTS_PATH}: public analytics PII guard must remain enabled`);
}
if (publicEvents.rules?.restricted_field_external_channels_forbidden !== true) {
  errors.push(`${PUBLIC_EVENTS_PATH}: restricted internal IDs must remain forbidden externally`);
}

console.log(`Canonical internal outcomes: ${canonical.length}`);
console.log(`Current canonical coverage: available=${availableCanonical}; schema_gap=${gapCanonical}`);
console.log(`Derived internal metrics: ${derived.length}`);
console.log(`Reporting dimensions: ${dimensions.length}; schema gaps=${dimensions.filter((item) => item.availability === "schema_gap").length}`);
console.log(`Live outcome export enabled: ${spec.rules.live_export_enabled === true}`);

if (errors.length) {
  console.error("\nInternal outcome analytics validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Internal outcome analytics validation passed.");
