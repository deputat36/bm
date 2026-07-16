import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = "data/content/guides.json";
const GUIDE_INDEX_PATH = "guides/index.html";
const SITEMAP_PATH = "sitemap.xml";
const errors = [];

const EXPECTED_IDS = new Set([
  "guide-documents-check",
  "guide-project-declaration",
  "guide-layout-choice",
  "guide-permit-commissioning",
  "guide-uncommissioned-section"
]);
const OBJECT_SPECIFIC_FRAGMENTS = [
  "Просторная 4А",
  "Аэродромная 18Г",
  "Сенная 76",
  "Теллерманов сад",
  "BM Group",
  "БМ Групп"
];

function read(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
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
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

const registry = readJson(REGISTRY_PATH);
const guideIndex = read(GUIDE_INDEX_PATH);
const sitemap = read(SITEMAP_PATH);
if (!registry || !guideIndex || !sitemap) process.exit(1);

if (registry.schema_version !== "1.0") errors.push(`${REGISTRY_PATH}: schema_version must be 1.0`);
if (registry.portal_id !== "newbuilds-borisoglebsk") errors.push(`${REGISTRY_PATH}: invalid portal_id`);
if (registry.status !== "editorial_registry_not_publication_approval") errors.push(`${REGISTRY_PATH}: invalid status`);
if (!isIsoDate(registry.updated_at)) errors.push(`${REGISTRY_PATH}: updated_at must be YYYY-MM-DD`);

[
  "all_entries_require_noindex",
  "sitemap_forbidden_until_index_ready",
  "standalone_forms_forbidden",
  "contact_fields_forbidden",
  "object_specific_claims_forbidden",
  "article_schema_deferred_until_index_ready",
  "index_ready_requires_editorial_review",
  "index_ready_requires_legal_review_when_applicable",
  "index_ready_requires_source_review"
].forEach((rule) => {
  if (registry.rules?.[rule] !== true) errors.push(`${REGISTRY_PATH}: rules.${rule} must be true`);
});

const reviewStatuses = new Set(registry.rules?.allowed_review_statuses || []);
const sourceStatuses = new Set(registry.rules?.allowed_source_statuses || []);
const indexingStatuses = new Set(registry.rules?.allowed_indexing_statuses || []);
exactSet(reviewStatuses, new Set(["requires_review", "passed", "not_applicable"]), `${REGISTRY_PATH}: review statuses`);
exactSet(sourceStatuses, new Set(["requires_source_review", "verified_on_date", "not_applicable"]), `${REGISTRY_PATH}: source statuses`);
exactSet(indexingStatuses, new Set(["blocked", "ready"]), `${REGISTRY_PATH}: indexing statuses`);

const guides = Array.isArray(registry.guides) ? registry.guides : [];
if (guides.length !== EXPECTED_IDS.size) errors.push(`${REGISTRY_PATH}: expected ${EXPECTED_IDS.size} guides, found ${guides.length}`);

const seenIds = new Set();
const seenPaths = new Set();
const seenCanonicals = new Set();
const seenIntents = new Set();
let blockedCount = 0;
let readyCount = 0;
let verifiedSourceCount = 0;
let sourceReviewCount = 0;
let sourceNotApplicableCount = 0;
let editorialPassedCount = 0;
let legalPassedCount = 0;

for (const guide of guides) {
  const id = String(guide?.id || "").trim();
  const label = `${REGISTRY_PATH}:${id || "unknown"}`;
  const filePath = String(guide?.path || "").trim();
  const canonical = String(guide?.canonical || "").trim();
  const intent = String(guide?.intent || "").trim();
  const topic = String(guide?.topic || "").trim();
  const sourceStatus = String(guide?.source_status || "").trim();
  const editorialReview = String(guide?.editorial_review || "").trim();
  const legalReview = String(guide?.legal_review || "").trim();
  const indexingStatus = String(guide?.indexing_status || "").trim();
  const sourceUrls = Array.isArray(guide?.source_urls) ? guide.source_urls : [];
  const allowedPlacements = new Set(Array.isArray(guide?.allowed_placements) ? guide.allowed_placements : []);
  const expectedTrackedCtaCount = Number(guide?.expected_tracked_cta_count);

  if (!id) errors.push(`${label}: id is required`);
  if (seenIds.has(id)) errors.push(`${label}: duplicate id`);
  seenIds.add(id);
  if (!EXPECTED_IDS.has(id)) errors.push(`${label}: unexpected guide id`);

  if (!filePath.startsWith("guides/") || !filePath.endsWith("/index.html")) errors.push(`${label}: invalid path`);
  if (seenPaths.has(filePath)) errors.push(`${label}: duplicate path`);
  seenPaths.add(filePath);
  if (!canonical.startsWith("https://novostroyki-borisoglebsk.ru/guides/") || !canonical.endsWith("/")) errors.push(`${label}: invalid canonical`);
  if (seenCanonicals.has(canonical)) errors.push(`${label}: duplicate canonical`);
  seenCanonicals.add(canonical);
  if (!intent) errors.push(`${label}: intent is required`);
  if (seenIntents.has(intent)) errors.push(`${label}: duplicate intent`);
  seenIntents.add(intent);
  if (!topic) errors.push(`${label}: topic is required`);

  if (!sourceStatuses.has(sourceStatus)) errors.push(`${label}: invalid source_status=${sourceStatus}`);
  if (!reviewStatuses.has(editorialReview)) errors.push(`${label}: invalid editorial_review=${editorialReview}`);
  if (!reviewStatuses.has(legalReview)) errors.push(`${label}: invalid legal_review=${legalReview}`);
  if (!indexingStatuses.has(indexingStatus)) errors.push(`${label}: invalid indexing_status=${indexingStatus}`);
  if (!Number.isInteger(expectedTrackedCtaCount) || expectedTrackedCtaCount < 1 || expectedTrackedCtaCount > 3) {
    errors.push(`${label}: expected_tracked_cta_count must be 1..3`);
  }
  if (!allowedPlacements.size) errors.push(`${label}: allowed_placements is required`);

  if (sourceStatus === "verified_on_date") {
    verifiedSourceCount += 1;
    if (!isIsoDate(guide.content_checked_at)) errors.push(`${label}: verified source requires content_checked_at`);
    if (!sourceUrls.length) errors.push(`${label}: verified source requires source_urls`);
  } else if (sourceStatus === "requires_source_review") {
    sourceReviewCount += 1;
    if (guide.content_checked_at !== null) errors.push(`${label}: source review pending requires content_checked_at=null`);
    if (sourceUrls.length) errors.push(`${label}: source review pending must not claim accepted source_urls`);
  } else if (sourceStatus === "not_applicable") {
    sourceNotApplicableCount += 1;
    if (sourceUrls.length) errors.push(`${label}: not_applicable must not contain source_urls`);
  }
  sourceUrls.forEach((url) => {
    if (!String(url).startsWith("https://")) errors.push(`${label}: source URL must use HTTPS`);
  });

  if (editorialReview === "passed") editorialPassedCount += 1;
  if (legalReview === "passed") legalPassedCount += 1;
  if (indexingStatus === "blocked") blockedCount += 1;
  if (indexingStatus === "ready") {
    readyCount += 1;
    if (editorialReview !== "passed") errors.push(`${label}: ready requires editorial_review=passed`);
    if (!new Set(["passed", "not_applicable"]).has(legalReview)) errors.push(`${label}: ready requires legal review`);
    if (!new Set(["verified_on_date", "not_applicable"]).has(sourceStatus)) errors.push(`${label}: ready requires source review`);
  }

  const article = read(filePath);
  if (!article) continue;
  if (!article.includes('<meta name="robots" content="noindex,follow">')) errors.push(`${label}: noindex,follow is required`);
  if (!article.includes(`<link rel="canonical" href="${canonical}">`)) errors.push(`${label}: canonical mismatch`);
  if (/<form\b/i.test(article)) errors.push(`${label}: standalone form is forbidden`);
  if (/<(?:input|textarea|select)\b/i.test(article)) errors.push(`${label}: contact fields are forbidden`);
  if (/application\/ld\+json/i.test(article) && indexingStatus !== "ready") errors.push(`${label}: Article schema is deferred`);
  if (!article.includes('../../assets/js/analytics-debug.js')) errors.push(`${label}: analytics debug runtime is missing`);
  if (!article.includes('../../assets/js/conversion-tracking.js')) errors.push(`${label}: conversion tracking runtime is missing`);
  if (!article.includes('../../assets/js/schema.js')) errors.push(`${label}: schema runtime is missing`);

  OBJECT_SPECIFIC_FRAGMENTS.forEach((fragment) => {
    if (article.includes(fragment)) errors.push(`${label}: object-specific fragment is forbidden: ${fragment}`);
  });

  sourceUrls.forEach((url) => {
    if (!article.includes(url)) errors.push(`${label}: accepted source URL is missing from article: ${url}`);
  });

  const placements = Array.from(article.matchAll(/data-track-placement="([^"]+)"/g), (match) => match[1]);
  if (placements.length !== expectedTrackedCtaCount) {
    errors.push(`${label}: expected ${expectedTrackedCtaCount} tracked CTA, found ${placements.length}`);
  }
  placements.forEach((placement) => {
    if (!allowedPlacements.has(placement)) errors.push(`${label}: unexpected placement ${placement}`);
  });

  const relativeSlug = filePath.slice("guides/".length, -"index.html".length);
  if (!guideIndex.includes(`href="${relativeSlug}"`)) errors.push(`${label}: card is missing from guides index`);
  if (indexingStatus !== "ready" && sitemap.includes(canonical)) errors.push(`${label}: blocked guide must not be in sitemap`);
}

exactSet(seenIds, EXPECTED_IDS, `${REGISTRY_PATH}: guide ids`);

console.log(`Registered guides: ${guides.length}`);
console.log(`Index ready: ${readyCount}`);
console.log(`Index blocked: ${blockedCount}`);
console.log(`Verified source sets: ${verifiedSourceCount}`);
console.log(`Source review required: ${sourceReviewCount}`);
console.log(`Source not applicable: ${sourceNotApplicableCount}`);
console.log(`Editorial passed: ${editorialPassedCount}`);
console.log(`Legal passed: ${legalPassedCount}`);

if (errors.length) {
  console.error("\nGuide content registry validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Guide content registry validation passed.");
