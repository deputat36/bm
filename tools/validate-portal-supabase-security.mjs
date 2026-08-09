import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = "data/security/portal-supabase-security.json";
const MIGRATIONS_DIR = "supabase/migrations";
const EDGE_PATH = "supabase/functions/newbuild-lead/index.ts";
const errors = [];
const warnings = [];

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
const edgeSource = read(EDGE_PATH);
if (!spec || !edgeSource) process.exit(1);

if (spec.schema_version !== "1.0") errors.push(`${SPEC_PATH}: schema_version must be 1.0`);
if (!isIsoDate(spec.updated_at)) errors.push(`${SPEC_PATH}: updated_at must be YYYY-MM-DD`);
if (spec.portal_id !== "newbuilds-borisoglebsk") errors.push(`${SPEC_PATH}: invalid portal_id`);
if (spec.supabase_project_id !== "ofewxuqfjhamgerwzull") errors.push(`${SPEC_PATH}: unexpected Supabase project id`);
if (!new Set(["live_advisor_checked_repository_guard_pending", "repository_guard_active_live_shared_findings_pending"]).has(spec.status)) errors.push(`${SPEC_PATH}: unsupported status ${spec.status}`);

if (spec.ownership?.out_of_scope_mutation_forbidden_from_portal_work !== true) errors.push(`${SPEC_PATH}: out-of-scope mutation must be forbidden`);
const outOfScope = new Set(spec.ownership?.shared_project_out_of_scope_prefixes || []);
for (const prefix of ["nav_", "nav_v2_", "parket_", "broker_"]) {
  if (!outOfScope.has(prefix)) errors.push(`${SPEC_PATH}: missing out-of-scope prefix ${prefix}`);
}
const portalPrefixes = new Set(spec.ownership?.portal_owned_prefixes || []);
for (const prefix of ["newbuild_", "set_newbuild_"]) {
  if (!portalPrefixes.has(prefix)) errors.push(`${SPEC_PATH}: missing portal-owned prefix ${prefix}`);
}

const snapshot = spec.live_advisor_snapshot || {};
if (snapshot.security_advisor_checked !== true || !isIsoDate(snapshot.checked_at)) errors.push(`${SPEC_PATH}: live security advisor snapshot must be dated and checked`);
if (snapshot.portal_security_definer_warn_observed !== false) errors.push(`${SPEC_PATH}: current snapshot must not claim a portal security-definer warning`);
const portalFindings = Array.isArray(snapshot.portal_findings) ? snapshot.portal_findings : [];
const expectedPortalInfoEntities = new Set([
  "public.newbuild_leads",
  "public.newbuild_lead_events",
  "public.newbuild_lead_rate_limits",
  "public.newbuild_lead_operational_policies"
]);
if (portalFindings.length !== 4) errors.push(`${SPEC_PATH}: expected four portal advisor INFO findings`);
for (const finding of portalFindings) {
  if (finding.lint !== "rls_enabled_no_policy" || finding.level !== "INFO") errors.push(`${SPEC_PATH}: portal finding must be rls_enabled_no_policy INFO`);
  if (!expectedPortalInfoEntities.has(finding.entity)) errors.push(`${SPEC_PATH}: unexpected portal advisor entity ${finding.entity}`);
  if (finding.classification !== "expected_service_role_only_pattern_verify_grants_statically") errors.push(`${SPEC_PATH}: portal INFO classification mismatch`);
}
if (!(snapshot.shared_project_findings || []).some((item) => item.lint === "authenticated_security_definer_function_executable" && item.classification === "out_of_scope_for_portal_no_automatic_mutation")) errors.push(`${SPEC_PATH}: shared CRM security-definer finding boundary missing`);
if (!(snapshot.global_project_findings || []).some((item) => item.lint === "auth_leaked_password_protection" && item.classification === "shared_project_owner_decision_not_portal_migration")) errors.push(`${SPEC_PATH}: leaked-password shared-project finding missing`);

for (const key of [
  "portal_security_definer_forbidden",
  "portal_functions_require_explicit_security_invoker",
  "portal_functions_require_fixed_search_path",
  "portal_function_public_anon_authenticated_execute_forbidden",
  "portal_tables_require_rls_enable",
  "portal_table_anon_authenticated_grants_forbidden",
  "portal_views_require_security_invoker",
  "portal_views_anon_authenticated_grants_forbidden",
  "service_role_access_may_be_explicitly_granted",
  "browser_direct_database_credentials_forbidden"
]) {
  if (spec.repository_rules?.[key] !== true) errors.push(`${SPEC_PATH}: repository_rules.${key} must be true`);
}

for (const key of [
  "rerun_security_advisor_after_portal_ddl",
  "global_auth_leaked_password_setting_requires_shared_owner",
  "shared_crm_security_definer_warnings_require_separate_crm_security_work",
  "portal_issue_must_not_claim_shared_project_warns_fixed"
]) {
  if (spec.live_follow_up?.[key] !== true) errors.push(`${SPEC_PATH}: live_follow_up.${key} must be true`);
}

const sqlFiles = listSqlFiles(MIGRATIONS_DIR);
if (!sqlFiles.length) errors.push(`${MIGRATIONS_DIR}: no SQL migrations found`);
const migrationSources = sqlFiles.map((file) => ({ file, source: read(file) }));
const portalFiles = migrationSources.filter(({ source }) => /\b(?:newbuild_|set_newbuild_)/i.test(source));
if (!portalFiles.length) errors.push(`${MIGRATIONS_DIR}: no portal-owned newbuild migrations found`);
const combined = migrationSources.map(({ source }) => source).join("\n");

let functionCount = 0;
let tableCount = 0;
let viewCount = 0;

for (const { file, source } of portalFiles) {
  const portalFunctionPattern = /create\s+(?:or\s+replace\s+)?function\s+public\.((?:newbuild_|set_newbuild_)[a-z0-9_]+)\s*\([^)]*\)[\s\S]*?\$\$\s*;/gi;
  for (const match of source.matchAll(portalFunctionPattern)) {
    functionCount += 1;
    const name = match[1];
    const block = match[0];
    if (/security\s+definer/i.test(block)) errors.push(`${file}: public.${name} must not use SECURITY DEFINER`);
    if (!/security\s+invoker/i.test(block)) errors.push(`${file}: public.${name} must explicitly use SECURITY INVOKER`);
    if (!/set\s+search_path\s*=\s*(?:public|''|"")/i.test(block)) errors.push(`${file}: public.${name} must set a fixed search_path`);

    const revokeName = escapeRegex(name);
    const revokePattern = new RegExp(`revoke\\s+(?:all|execute)\\s+on\\s+function\\s+public\\.${revokeName}\\s*\\(`, "i");
    if (!revokePattern.test(combined)) warnings.push(`public.${name}: no explicit REVOKE found in migrations; verify default privileges or later migration`);
  }

  const createTablePattern = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(newbuild_[a-z0-9_]+)/gi;
  for (const match of source.matchAll(createTablePattern)) {
    tableCount += 1;
    const name = match[1];
    const escaped = escapeRegex(name);
    const enableRls = new RegExp(`alter\\s+table\\s+public\\.${escaped}\\s+enable\\s+row\\s+level\\s+security`, "i");
    if (!enableRls.test(combined)) errors.push(`${file}: public.${name} must enable RLS`);
  }

  const viewPattern = /create\s+(?:or\s+replace\s+)?view\s+public\.(newbuild_[a-z0-9_]+)([\s\S]*?)\bas\b/gi;
  for (const match of source.matchAll(viewPattern)) {
    viewCount += 1;
    const name = match[1];
    const preamble = match[2];
    if (!/security_invoker\s*=\s*true/i.test(preamble)) errors.push(`${file}: public.${name} view must use security_invoker=true`);
  }
}

const broadTableGrant = /grant\s+[^;]+\s+on\s+(?:table\s+)?public\.(newbuild_[a-z0-9_]+)[^;]*\s+to\s+([^;]+);/gi;
for (const match of combined.matchAll(broadTableGrant)) {
  const roles = match[2].toLowerCase();
  if (/\b(?:anon|authenticated|public)\b/.test(roles)) errors.push(`public.${match[1]}: table/view grant to ${match[2].trim()} is forbidden for portal-owned server-only data`);
}

const broadFunctionGrant = /grant\s+execute\s+on\s+function\s+public\.((?:newbuild_|set_newbuild_)[a-z0-9_]+)\s*\([^;]*?\)\s+to\s+([^;]+);/gi;
for (const match of combined.matchAll(broadFunctionGrant)) {
  const roles = match[2].toLowerCase();
  if (/\b(?:anon|authenticated|public)\b/.test(roles)) errors.push(`public.${match[1]}: EXECUTE grant to ${match[2].trim()} is forbidden`);
}

for (const { file, source } of portalFiles) {
  if (/security\s+definer/i.test(source)) {
    const hasPortalDefiner = /create\s+(?:or\s+replace\s+)?function\s+public\.(?:newbuild_|set_newbuild_)[a-z0-9_]+[\s\S]*?security\s+definer/i.test(source);
    if (hasPortalDefiner) errors.push(`${file}: portal-owned SECURITY DEFINER detected`);
  }
}

if (!edgeSource.includes('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")')) errors.push(`${EDGE_PATH}: service role key must come from environment`);
if (/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/.test(edgeSource)) errors.push(`${EDGE_PATH}: JWT-like credential literal detected`);
if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'`][^"'`]+["'`]/.test(edgeSource)) errors.push(`${EDGE_PATH}: service role key must not be hardcoded`);

const docs = spec.documentation_basis || {};
for (const key of ["supabase_function_security", "supabase_view_security", "supabase_api_security", "supabase_data_api_change"]) {
  if (!String(docs[key] || "").startsWith("https://supabase.com/")) errors.push(`${SPEC_PATH}: documentation_basis.${key} must be an official Supabase URL`);
}

console.log(`Supabase migrations scanned: ${sqlFiles.length}`);
console.log(`Portal-owned migration files: ${portalFiles.length}`);
console.log(`Portal functions checked: ${functionCount}`);
console.log(`Portal tables checked: ${tableCount}`);
console.log(`Portal views checked: ${viewCount}`);
console.log(`Static warnings: ${warnings.length}`);
warnings.forEach((warning) => console.warn(`WARNING: ${warning}`));

if (errors.length) {
  console.error("\nPortal Supabase security validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Portal Supabase security validation passed.");
