import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = "data/performance/portal-supabase-performance.json";
const MIGRATIONS_DIR = "supabase/migrations";
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

function listSqlFiles(relativeDir) {
  const fullDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(fullDir)) return [];
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && entry.name.endsWith(".sql")) files.push(path.relative(ROOT, child).split(path.sep).join("/"));
    }
  };
  walk(fullDir);
  return files.sort();
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const spec = readJson(SPEC_PATH);
if (!spec) process.exit(1);

if (spec.schema_version !== "1.0") errors.push(`${SPEC_PATH}: schema_version must be 1.0`);
if (!isIsoDate(spec.updated_at)) errors.push(`${SPEC_PATH}: updated_at must be YYYY-MM-DD`);
if (spec.portal_id !== "newbuilds-borisoglebsk") errors.push(`${SPEC_PATH}: invalid portal_id`);
if (spec.supabase_project_id !== "ofewxuqfjhamgerwzull") errors.push(`${SPEC_PATH}: unexpected project id`);

const allowedStates = new Set(spec.cleanup_states || []);
const expectedStates = new Set([
  "prelaunch_observation_no_index_cleanup",
  "usage_review_due",
  "cleanup_candidate_review",
  "cleanup_approved"
]);
if (allowedStates.size !== expectedStates.size || [...expectedStates].some((value) => !allowedStates.has(value))) {
  errors.push(`${SPEC_PATH}: cleanup_states mismatch`);
}
if (!allowedStates.has(spec.status)) errors.push(`${SPEC_PATH}: unsupported status ${spec.status}`);

const snapshot = spec.live_advisor_snapshot || {};
if (!isIsoDate(snapshot.checked_at) || snapshot.performance_advisor_checked !== true) errors.push(`${SPEC_PATH}: performance advisor snapshot must be dated and checked`);
if (snapshot.portal_warn_or_error_count !== 0) errors.push(`${SPEC_PATH}: current portal snapshot must have zero WARN/ERROR`);
if (snapshot.portal_info_count !== 17) errors.push(`${SPEC_PATH}: expected 17 portal INFO findings in 2026-08-09 snapshot`);
if (snapshot.portal_info_lint !== "unused_index") errors.push(`${SPEC_PATH}: current portal INFO lint must be unused_index`);
if (snapshot.classification !== "prelaunch_usage_not_established_do_not_drop_from_info_alone") errors.push(`${SPEC_PATH}: snapshot classification mismatch`);

if (spec.ownership?.out_of_scope_mutation_forbidden_from_portal_work !== true) errors.push(`${SPEC_PATH}: out-of-scope mutation must be forbidden`);
for (const prefix of ["nav_", "nav_v2_", "parket_", "broker_", "leader_"]) {
  if (!(spec.ownership?.shared_project_out_of_scope_prefixes || []).includes(prefix)) errors.push(`${SPEC_PATH}: missing out-of-scope prefix ${prefix}`);
}

for (const key of [
  "unused_index_info_is_not_cleanup_approval",
  "prelaunch_index_drop_forbidden",
  "index_cleanup_requires_live_usage_evidence",
  "index_cleanup_requires_query_path_review",
  "index_cleanup_requires_separate_pull_request",
  "shared_project_performance_mutation_forbidden",
  "advisor_rerun_required_after_portal_index_change",
  "production_index_change_from_this_contract_forbidden"
]) {
  if (spec.rules?.[key] !== true) errors.push(`${SPEC_PATH}: rules.${key} must be true`);
}

const reviewGate = spec.usage_review_gate || {};
if (reviewGate.minimum_real_leads !== 30) errors.push(`${SPEC_PATH}: minimum_real_leads must be 30`);
if (reviewGate.minimum_live_days !== 7) errors.push(`${SPEC_PATH}: minimum_live_days must be 7`);
if (reviewGate.both_conditions_required !== true) errors.push(`${SPEC_PATH}: both_conditions_required must be true`);
const requiredEvidence = new Set(reviewGate.required_evidence || []);
for (const item of ["pg_stat_user_indexes_snapshot", "representative_query_paths", "query_plan_or_timing_for_cleanup_candidate", "live_performance_advisor_snapshot"]) {
  if (!requiredEvidence.has(item)) errors.push(`${SPEC_PATH}: missing usage review evidence ${item}`);
}

const indexes = Array.isArray(spec.prelaunch_indexes) ? spec.prelaunch_indexes : [];
if (indexes.length !== 17) errors.push(`${SPEC_PATH}: expected 17 prelaunch indexes`);
const names = new Set();
for (const item of indexes) {
  const label = `${SPEC_PATH}:${item?.name || "unknown-index"}`;
  if (!String(item?.name || "").startsWith("newbuild_")) errors.push(`${label}: portal index name must start with newbuild_`);
  if (!String(item?.table || "").startsWith("public.newbuild_")) errors.push(`${label}: table must be portal-owned public.newbuild_*`);
  if (!String(item?.purpose || "").trim()) errors.push(`${label}: purpose is required`);
  if (names.has(item.name)) errors.push(`${label}: duplicate index name`);
  names.add(item.name);
}
if (names.size !== indexes.length) errors.push(`${SPEC_PATH}: index names must be unique`);

const sqlFiles = listSqlFiles(MIGRATIONS_DIR);
if (!sqlFiles.length) errors.push(`${MIGRATIONS_DIR}: no migrations found`);
const combined = sqlFiles.map((file) => read(file)).join("\n");
let indexesPresent = 0;
for (const item of indexes) {
  const name = escapeRegex(item.name);
  const createPattern = new RegExp(`create\\s+(?:unique\\s+)?index(?:\\s+if\\s+not\\s+exists)?\\s+${name}\\b`, "i");
  const dropPattern = new RegExp(`drop\\s+index(?:\\s+if\\s+exists)?\\s+(?:public\\.)?${name}\\b`, "i");
  if (!createPattern.test(combined)) errors.push(`${MIGRATIONS_DIR}: live snapshot index ${item.name} is not represented by a CREATE INDEX migration`);
  else indexesPresent += 1;
  if (spec.status === "prelaunch_observation_no_index_cleanup" && dropPattern.test(combined)) {
    errors.push(`${MIGRATIONS_DIR}: prelaunch protected index ${item.name} has DROP INDEX while cleanup is forbidden`);
  }
}

if (!String(spec.remediation_reference || "").startsWith("https://supabase.com/")) errors.push(`${SPEC_PATH}: remediation_reference must use official Supabase URL`);

console.log(`Migrations scanned: ${sqlFiles.length}`);
console.log(`Prelaunch indexes registered: ${indexes.length}`);
console.log(`Registered indexes represented in migrations: ${indexesPresent}`);
console.log(`Performance Advisor portal WARN/ERROR: ${snapshot.portal_warn_or_error_count}`);
console.log(`Performance Advisor portal INFO unused_index: ${snapshot.portal_info_count}`);
console.log(`Cleanup status: ${spec.status}`);

if (errors.length) {
  console.error("\nPortal Supabase performance validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Portal Supabase performance validation passed.");
