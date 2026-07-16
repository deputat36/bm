import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PATHS = {
  contract: "data/content/guide-review-contract.json",
  registry: "data/content/guides.json",
  results: "data/content/guide-review-results.json"
};
const errors = [];
const FORBIDDEN_KEYS = new Set([
  "name",
  "phone",
  "phone_normalized",
  "email",
  "user_agent",
  "form_payload",
  "access_key"
]);

function readJson(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${relativePath}: file does not exist`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
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
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isEvidenceReference(value) {
  const reference = String(value || "").trim();
  return reference.startsWith("https://") || /^(docs|data|issues|pulls|artifacts)\//.test(reference);
}

function isReviewerReference(value) {
  const reference = String(value || "").trim();
  return /^(role|secure_reference):[a-z0-9_./-]+$/i.test(reference);
}

function scanForbiddenKeys(value, label) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenKeys(item, `${label}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, nested]) => {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`${label}: forbidden field ${key}`);
    scanForbiddenKeys(nested, `${label}.${key}`);
  });
}

const contract = readJson(PATHS.contract);
const registry = readJson(PATHS.registry);
const resultsRegistry = readJson(PATHS.results);
if (!contract || !registry || !resultsRegistry) process.exit(1);

if (contract.schema_version !== "1.0") errors.push(`${PATHS.contract}: schema_version must be 1.0`);
if (contract.portal_id !== "newbuilds-borisoglebsk") errors.push(`${PATHS.contract}: invalid portal_id`);
if (contract.status !== "review_pack_only_no_implied_approval") errors.push(`${PATHS.contract}: invalid status`);
if (!isIsoDate(contract.updated_at)) errors.push(`${PATHS.contract}: updated_at must be YYYY-MM-DD`);
if (contract.registry_path !== PATHS.registry) errors.push(`${PATHS.contract}: registry_path mismatch`);
if (contract.results_path !== PATHS.results) errors.push(`${PATHS.contract}: results_path mismatch`);

[
  "reviewer_must_be_role_or_secure_reference",
  "personal_data_in_repository_forbidden",
  "passed_requires_all_checks",
  "passed_requires_evidence",
  "passed_requires_checked_at",
  "passed_requires_reviewer_reference",
  "failed_or_blocked_requires_notes",
  "automatic_status_mutation_forbidden",
  "noindex_removal_forbidden",
  "sitemap_mutation_forbidden",
  "article_schema_mutation_forbidden"
].forEach((rule) => {
  if (contract.rules?.[rule] !== true) errors.push(`${PATHS.contract}: rules.${rule} must be true`);
});

exactSet(new Set(contract.rules?.allowed_result_statuses || []), new Set(["passed", "failed", "blocked"]), `${PATHS.contract}: result statuses`);
exactSet(new Set(contract.rules?.allowed_review_types || []), new Set(["editorial", "legal"]), `${PATHS.contract}: review types`);
exactSet(
  new Set(contract.rules?.allowed_evidence_types || []),
  new Set(["repository_file", "pull_request", "issue", "report", "external_url"]),
  `${PATHS.contract}: evidence types`
);

const editorialChecks = Array.isArray(contract.editorial_checks) ? contract.editorial_checks : [];
const legalChecks = Array.isArray(contract.legal_checks) ? contract.legal_checks : [];
if (editorialChecks.length !== 8) errors.push(`${PATHS.contract}: expected 8 editorial checks`);
if (legalChecks.length !== 10) errors.push(`${PATHS.contract}: expected 10 legal checks`);
const editorialCheckIds = new Set(editorialChecks.map((item) => item.id));
const legalCheckIds = new Set(legalChecks.map((item) => item.id));
if (editorialCheckIds.size !== editorialChecks.length) errors.push(`${PATHS.contract}: duplicate editorial check id`);
if (legalCheckIds.size !== legalChecks.length) errors.push(`${PATHS.contract}: duplicate legal check id`);
editorialChecks.concat(legalChecks).forEach((item) => {
  if (!String(item.id || "").trim()) errors.push(`${PATHS.contract}: check id is required`);
  if (!String(item.title || "").trim()) errors.push(`${PATHS.contract}: check title is required for ${item.id || "unknown"}`);
});

const guides = Array.isArray(registry.guides) ? registry.guides : [];
const guideIds = new Set(guides.map((item) => item.id));
const requiredGuideIds = new Set(contract.required_guide_ids || []);
exactSet(guideIds, requiredGuideIds, `${PATHS.contract}: required guide ids`);
if (guideIds.size !== 7) errors.push(`${PATHS.registry}: expected 7 guides`);

const legalNotApplicable = new Set(contract.legal_review_not_applicable_guide_ids || []);
exactSet(legalNotApplicable, new Set(["guide-layout-choice"]), `${PATHS.contract}: legal not applicable guides`);
guides.forEach((guide) => {
  if (guide.editorial_review !== "requires_review" && guide.editorial_review !== "passed") {
    errors.push(`${PATHS.registry}:${guide.id}: invalid editorial_review=${guide.editorial_review}`);
  }
  if (legalNotApplicable.has(guide.id)) {
    if (guide.legal_review !== "not_applicable") errors.push(`${PATHS.registry}:${guide.id}: legal_review must be not_applicable`);
  } else if (!["requires_review", "passed"].includes(guide.legal_review)) {
    errors.push(`${PATHS.registry}:${guide.id}: invalid legal_review=${guide.legal_review}`);
  }
  if (guide.indexing_status !== "blocked") errors.push(`${PATHS.registry}:${guide.id}: current review pack requires indexing_status=blocked`);
});

if (resultsRegistry.schema_version !== "1.0") errors.push(`${PATHS.results}: schema_version must be 1.0`);
if (resultsRegistry.portal_id !== "newbuilds-borisoglebsk") errors.push(`${PATHS.results}: invalid portal_id`);
if (resultsRegistry.status !== "not_reviewed") errors.push(`${PATHS.results}: current status must be not_reviewed`);
if (!isIsoDate(resultsRegistry.updated_at)) errors.push(`${PATHS.results}: updated_at must be YYYY-MM-DD`);
[
  "empty_results_mean_not_reviewed",
  "generated_checklist_is_not_evidence",
  "personal_data_forbidden",
  "registry_status_changes_require_separate_pull_request"
].forEach((rule) => {
  if (resultsRegistry.rules?.[rule] !== true) errors.push(`${PATHS.results}: rules.${rule} must be true`);
});

const results = Array.isArray(resultsRegistry.results) ? resultsRegistry.results : [];
const allowedStatuses = new Set(contract.rules?.allowed_result_statuses || []);
const allowedReviewTypes = new Set(contract.rules?.allowed_review_types || []);
const allowedEvidenceTypes = new Set(contract.rules?.allowed_evidence_types || []);
const seenResultKeys = new Set();

for (const result of results) {
  const guideId = String(result?.guide_id || "").trim();
  const reviewType = String(result?.review_type || "").trim();
  const status = String(result?.status || "").trim();
  const key = `${guideId}:${reviewType}`;
  const label = `${PATHS.results}:${key}`;
  if (!guideIds.has(guideId)) errors.push(`${label}: unknown guide_id`);
  if (!allowedReviewTypes.has(reviewType)) errors.push(`${label}: invalid review_type`);
  if (reviewType === "legal" && legalNotApplicable.has(guideId)) errors.push(`${label}: legal review is not applicable`);
  if (seenResultKeys.has(key)) errors.push(`${label}: duplicate result`);
  seenResultKeys.add(key);
  if (!allowedStatuses.has(status)) errors.push(`${label}: invalid status=${status}`);
  if (!isReviewerReference(result.reviewer_reference)) errors.push(`${label}: reviewer_reference must use role: or secure_reference:`);
  if (!isIsoDate(result.checked_at)) errors.push(`${label}: checked_at must be YYYY-MM-DD`);

  const expectedChecks = reviewType === "editorial" ? editorialCheckIds : legalCheckIds;
  const checkResults = result?.check_results && typeof result.check_results === "object" && !Array.isArray(result.check_results)
    ? result.check_results
    : {};
  exactSet(new Set(Object.keys(checkResults)), expectedChecks, `${label}: check result ids`);
  Object.entries(checkResults).forEach(([checkId, value]) => {
    if (typeof value !== "boolean") errors.push(`${label}: check_results.${checkId} must be boolean`);
  });

  const evidence = Array.isArray(result.evidence) ? result.evidence : [];
  evidence.forEach((item, index) => {
    const evidenceLabel = `${label}:evidence#${index + 1}`;
    if (!allowedEvidenceTypes.has(item?.type)) errors.push(`${evidenceLabel}: invalid type`);
    if (!isEvidenceReference(item?.reference)) errors.push(`${evidenceLabel}: invalid reference`);
    if (!String(item?.note || "").trim()) errors.push(`${evidenceLabel}: note is required`);
  });

  if (status === "passed") {
    if (![...expectedChecks].every((checkId) => checkResults[checkId] === true)) errors.push(`${label}: passed requires all checks=true`);
    if (!evidence.length) errors.push(`${label}: passed requires evidence`);
  } else if (!String(result.notes || "").trim()) {
    errors.push(`${label}: ${status} requires notes`);
  }
}

const resultMap = new Map(results.map((item) => [`${item.guide_id}:${item.review_type}`, item]));
guides.forEach((guide) => {
  const editorialPassed = resultMap.get(`${guide.id}:editorial`)?.status === "passed";
  if (guide.editorial_review === "passed" && !editorialPassed) {
    errors.push(`${PATHS.registry}:${guide.id}: editorial passed requires matching review result`);
  }
  if (!legalNotApplicable.has(guide.id)) {
    const legalPassed = resultMap.get(`${guide.id}:legal`)?.status === "passed";
    if (guide.legal_review === "passed" && !legalPassed) {
      errors.push(`${PATHS.registry}:${guide.id}: legal passed requires matching review result`);
    }
  }
});

scanForbiddenKeys(contract, PATHS.contract);
scanForbiddenKeys(resultsRegistry, PATHS.results);

const expectedEditorialTasks = guides.length;
const expectedLegalTasks = guides.filter((guide) => !legalNotApplicable.has(guide.id)).length;
const expectedTotalTasks = expectedEditorialTasks + expectedLegalTasks;

console.log(`Guide review tasks: editorial=${expectedEditorialTasks}; legal=${expectedLegalTasks}; total=${expectedTotalTasks}`);
console.log(`Recorded review results: ${results.length}`);
console.log(`Passed review results: ${results.filter((item) => item.status === "passed").length}`);

if (errors.length) {
  console.error("\nGuide review pack validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Guide review pack validation passed.");
