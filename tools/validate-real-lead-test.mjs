import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILE = "data/release/real-lead-test.json";
const REQUIRED_CHECKS = [
  "one_submission_only",
  "server_record_created",
  "record_locator_present",
  "form_context_matches",
  "consent_recorded",
  "no_legacy_fallback_used",
  "health_ok_before",
  "health_ok_after",
  "public_analytics_pii_absent"
];
const REQUIRED_FIELDS = new Set([
  "lead_id",
  "created_at",
  "form_id",
  "form_role",
  "lead_type",
  "object_id",
  "placement",
  "source_page",
  "consent",
  "record_locator"
]);
const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) {
    fail(`${relativePath}: file missing`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    fail(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function validDate(value) {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));
}

function validEvidence(item) {
  if (!item || typeof item !== "object") return false;
  const reference = String(item.reference || "").trim();
  const note = String(item.note || "").trim();
  return Boolean(note) && (reference.startsWith("https://") || /^(docs|data|artifacts)\//.test(reference));
}

const data = readJson(FILE);
if (!data) process.exit(1);

if (data.schema_version !== "1.0") fail("schema_version must be 1.0");
if (data.portal_id !== "newbuilds-borisoglebsk") fail("portal_id mismatch");
for (const rule of [
  "explicit_owner_consent_required",
  "secure_contact_reference_required",
  "personal_contact_in_repository_forbidden",
  "exactly_one_submission_required",
  "production_domain_required",
  "dry_run_forbidden_for_real_test",
  "before_after_health_required",
  "database_record_evidence_required",
  "technical_field_verification_required",
  "manual_gate_update_requires_completed_evidence"
]) {
  if (data.rules?.[rule] !== true) fail(`rules.${rule} must be true`);
}

const execution = data.execution || {};
if (execution.target_url !== "https://novostroyki-borisoglebsk.ru/") fail("target_url must be production portal root");
if (execution.form_id !== "homepage_quick_selection") fail("form_id must use canonical homepage quick form");
if (execution.form_role !== "primary") fail("form_role must be primary");
if (execution.lead_type !== "portal_selection") fail("lead_type must be portal_selection");
if (execution.object_id !== "all-newbuilds") fail("object_id must be all-newbuilds");
if (execution.placement !== "quick-lead") fail("placement must be quick-lead");

const expectedFields = new Set(data.expected_server_fields || []);
if (JSON.stringify([...expectedFields].sort()) !== JSON.stringify([...REQUIRED_FIELDS].sort())) {
  fail("expected_server_fields mismatch");
}

const approved = execution.approved_by_owner === true;
const enabled = data.rules?.execution_enabled === true;
const allChecks = REQUIRED_CHECKS.every((key) => data.acceptance_checks?.[key] === true);
const completed = data.status === "passed_real_lead_delivery";

if (!approved) {
  if (enabled) fail("execution cannot be enabled without explicit owner approval");
  if (execution.approved_at !== null) fail("approved_at must remain null before owner approval");
  if (execution.secure_contact_reference !== null) fail("secure_contact_reference must remain null before owner approval");
}

if (approved) {
  if (!validDate(execution.approved_at)) fail("owner approval requires approved_at");
  const secureRef = String(execution.secure_contact_reference || "").trim();
  if (!/^secure:[a-z0-9_.:-]{3,120}$/i.test(secureRef)) fail("owner approval requires non-PII secure_contact_reference");
}

if (enabled && !approved) fail("execution_enabled requires approved_by_owner=true");

if (execution.submitted_at !== null && !validDate(execution.submitted_at)) fail("submitted_at must be null or valid date");
if (execution.record_locator !== null && !/^newbuild_leads:[a-z0-9-]{8,120}$/i.test(String(execution.record_locator))) {
  fail("record_locator must be null or public-safe newbuild_leads locator");
}

if (completed) {
  if (!approved || !enabled) fail("completed status requires approved and enabled execution");
  if (!validDate(execution.submitted_at)) fail("completed status requires submitted_at");
  if (!execution.record_locator) fail("completed status requires record_locator");
  if (!allChecks) fail("completed status requires all acceptance checks=true");
  if (!validDate(data.evidence?.checked_at)) fail("completed status requires evidence.checked_at");
  if (!String(data.evidence?.reviewer_reference || "").trim()) fail("completed status requires reviewer_reference");
  for (const key of ["health_before", "health_after", "database_record", "event_log"]) {
    if (!validEvidence(data.evidence?.[key])) fail(`completed status requires evidence.${key}`);
  }
}

const serialized = JSON.stringify(data);
const lower = serialized.toLowerCase();
if (/[^\d]\+?\d[\d\s().-]{8,}\d/.test(serialized)) fail("phone-like value forbidden in repository contract");
if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(serialized)) fail("email-like value forbidden in repository contract");
for (const forbidden of ["lead_test=dry-run", "web3forms", "access_key", "client_fixation_id", "user_agent"]) {
  if (lower.includes(forbidden)) fail(`forbidden contract content: ${forbidden}`);
}

console.log(`Real lead test: approved=${approved}; enabled=${enabled}; completed=${completed}; checks=${REQUIRED_CHECKS.filter((key) => data.acceptance_checks?.[key] === true).length}/${REQUIRED_CHECKS.length}`);

if (errors.length) {
  console.error("\nReal lead test validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Real lead test contract passed structural validation.");
