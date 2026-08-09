import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = "data/legal/bm-group-advertising-contract.json";
const CAMPAIGNS_PATH = "data/marketing/utm-campaigns.json";
const PUBLICATIONS_PATH = "data/marketing/campaign-publications.json";
const MANUAL_GATES_PATH = "data/release/manual-gates.json";
const SITEMAP_PATH = "sitemap.xml";
const COVERED_PAGE = "catalog/prostornaya-4a/index.html";
const PUBLIC_ROOTS = [
  "index.html",
  "catalog",
  "developers",
  "guides",
  "news",
  "contacts",
  "ipoteka",
  "about",
  "sources",
  "legal",
  "privacy",
  "personal-data-consent",
  "advertising",
  "karta-sayta",
  "spasibo"
];
const LEGACY_FORBIDDEN_FRAGMENTS = [
  "теллерманов сад",
  "просторная 4а",
  "bm group",
  "бм групп",
  "наш.дом",
  "70 квартир",
  "27,71",
  "63,76",
  "ранний список",
  "лист ожидания",
  "семейная ипотека",
  "материнский капитал",
  "молодая семья"
];
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

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function isIsoDateTimeOrDate(value) {
  const text = String(value || "").trim();
  return Boolean(text && Number.isFinite(Date.parse(text)));
}

function isEvidenceReference(value) {
  const text = String(value || "").trim();
  return text.startsWith("https://") || text.startsWith("docs/") || text.startsWith("issue:") || text.startsWith("secure_reference:");
}

function listHtmlFiles(entryPath, output = []) {
  const fullPath = path.join(ROOT, entryPath);
  if (!fs.existsSync(fullPath)) return output;
  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    if (/\.html$/i.test(entryPath)) output.push(entryPath);
    return output;
  }
  for (const entry of fs.readdirSync(fullPath, { withFileTypes: true })) {
    const child = path.posix.join(entryPath, entry.name);
    if (entry.isDirectory()) listHtmlFiles(child, output);
    else if (entry.isFile() && /\.html$/i.test(entry.name)) output.push(child);
  }
  return output;
}

function exactSet(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) errors.push(`${label}: expected ${right.join(", ")}; got ${left.join(", ")}`);
}

function hasNoindexFollow(html) {
  return /<meta\s+name=["']robots["']\s+content=["']noindex\s*,\s*follow["'][^>]*>/i.test(html)
    || /<meta\s+content=["']noindex\s*,\s*follow["']\s+name=["']robots["'][^>]*>/i.test(html);
}

const contract = readJson(CONTRACT_PATH);
const campaignRegistry = readJson(CAMPAIGNS_PATH);
const publicationRegistry = readJson(PUBLICATIONS_PATH);
const manualGates = readJson(MANUAL_GATES_PATH);
const sitemap = read(SITEMAP_PATH);
const coveredPage = read(COVERED_PAGE);
if (!contract || !campaignRegistry || !publicationRegistry || !manualGates || !sitemap || !coveredPage) process.exit(1);

if (contract.schema_version !== "1.1") errors.push(`${CONTRACT_PATH}: schema_version must be 1.1`);
if (!isIsoDate(contract.updated_at)) errors.push(`${CONTRACT_PATH}: updated_at must be YYYY-MM-DD`);
if (contract.portal_id !== "newbuilds-borisoglebsk") errors.push(`${CONTRACT_PATH}: invalid portal_id`);
if (contract.source_audit !== "CONTRACT_AD_AUDIT_2026-07-01.md") errors.push(`${CONTRACT_PATH}: source_audit mismatch`);
if (contract.status !== contract.approval?.status) errors.push(`${CONTRACT_PATH}: top-level status must mirror approval.status`);
if (!new Set(["requires_external_written_approval", "passed", "superseded"]).has(contract.status)) errors.push(`${CONTRACT_PATH}: unsupported status ${contract.status}`);

exactSet(new Set(contract.covered_object_ids || []), new Set(["prostornaya-4a"]), `${CONTRACT_PATH}: covered_object_ids`);
for (const key of [
  "old_single_project_domain_forbidden",
  "official_site_impression_forbidden",
  "developer_direct_wording_forbidden",
  "legacy_problem_routes_may_exist_only_as_safe_transition_stubs",
  "brand_or_geo_paid_search_without_written_approval_forbidden",
  "object_specific_publication_without_written_approval_forbidden",
  "object_specific_offline_material_without_written_approval_forbidden",
  "official_social_identity_forbidden",
  "campaign_definition_without_publication_is_allowed",
  "general_portal_campaigns_are_not_bm_object_campaigns"
]) {
  if (contract.rules?.[key] !== true) errors.push(`${CONTRACT_PATH}: rules.${key} must be true`);
}
if (contract.rules?.old_single_project_domain !== "tellermanovsad.ru") errors.push(`${CONTRACT_PATH}: old domain mismatch`);

const forbiddenPhrases = contract.rules?.forbidden_public_phrases || [];
if (!forbiddenPhrases.includes("квартиры от застройщика")) errors.push(`${CONTRACT_PATH}: exact prohibited phrase must be registered`);

const legacyRoutes = Array.isArray(contract.legacy_transition_routes) ? contract.legacy_transition_routes : [];
if (legacyRoutes.length !== 2) errors.push(`${CONTRACT_PATH}: expected two BM legacy transition routes`);
exactSet(
  new Set(legacyRoutes.map((item) => item.source_url)),
  new Set(["/kvartiry-ot-zastroyschika-borisoglebsk/", "/spisok-ozhidaniya/"]),
  `${CONTRACT_PATH}: legacy transition source URLs`
);
const legacyRequirements = contract.legacy_transition_requirements || {};
for (const key of [
  "old_domain_forbidden",
  "old_branding_forbidden",
  "lead_form_forbidden",
  "automatic_redirect_forbidden_until_server_release",
  "object_specific_claims_forbidden",
  "explicit_target_link_required",
  "sitemap_inclusion_forbidden"
]) {
  if (legacyRequirements[key] !== true) errors.push(`${CONTRACT_PATH}: legacy_transition_requirements.${key} must be true`);
}
if (legacyRequirements.robots !== "noindex,follow") errors.push(`${CONTRACT_PATH}: legacy transition robots must be noindex,follow`);
if (legacyRequirements.migration_marker !== 'data-legacy-migration-stub="bm-contract"') errors.push(`${CONTRACT_PATH}: legacy transition marker mismatch`);

const approval = contract.approval || {};
const allowedScopes = new Set(approval.allowed_scopes || []);
const expectedScopes = new Set([
  "portal_object_page_promotion",
  "vk_object_publication",
  "telegram_object_publication",
  "paid_brand_or_geo_search",
  "offline_object_material",
  "object_specific_qr",
  "object_specific_banner_or_cover"
]);
exactSet(allowedScopes, expectedScopes, `${CONTRACT_PATH}: allowed approval scopes`);
for (const scope of approval.approved_scopes || []) {
  if (!allowedScopes.has(scope)) errors.push(`${CONTRACT_PATH}: unsupported approved scope ${scope}`);
}

if (approval.status === "requires_external_written_approval") {
  if ((approval.evidence || []).length !== 0) errors.push(`${CONTRACT_PATH}: pending approval must not contain evidence`);
  if (approval.checked_at !== null) errors.push(`${CONTRACT_PATH}: pending approval must keep checked_at=null`);
  if (approval.reviewer_reference !== null) errors.push(`${CONTRACT_PATH}: pending approval must keep reviewer_reference=null`);
  if ((approval.approved_scopes || []).length !== 0) errors.push(`${CONTRACT_PATH}: pending approval must keep approved_scopes empty`);
}
if (approval.status === "passed") {
  if (!(approval.evidence || []).length) errors.push(`${CONTRACT_PATH}: passed approval requires evidence`);
  (approval.evidence || []).forEach((item, index) => {
    if (!isEvidenceReference(item)) errors.push(`${CONTRACT_PATH}: approval evidence #${index + 1} has unsupported reference`);
  });
  if (!isIsoDateTimeOrDate(approval.checked_at)) errors.push(`${CONTRACT_PATH}: passed approval requires checked_at`);
  if (!/^(role|secure_reference):[a-z0-9_./-]+$/i.test(String(approval.reviewer_reference || ""))) errors.push(`${CONTRACT_PATH}: passed approval requires role:/secure_reference: reviewer`);
  if (!(approval.approved_scopes || []).length) errors.push(`${CONTRACT_PATH}: passed approval requires at least one approved scope`);
}

const oldDomain = String(contract.rules.old_single_project_domain || "").toLowerCase();
const publicFiles = [...new Set(PUBLIC_ROOTS.flatMap((entry) => listHtmlFiles(entry)))];
for (const relativePath of publicFiles) {
  const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8").toLowerCase();
  if (oldDomain && text.includes(oldDomain)) errors.push(`${relativePath}: old single-project domain ${oldDomain} is forbidden in public HTML`);
  for (const phrase of forbiddenPhrases) {
    if (text.includes(String(phrase).toLowerCase())) errors.push(`${relativePath}: prohibited BM advertising phrase found: ${phrase}`);
  }
}

for (const route of legacyRoutes) {
  const label = `${CONTRACT_PATH}:${route.source_url || "unknown-route"}`;
  const sourceFile = String(route.source_file || "").trim();
  const sourceUrl = String(route.source_url || "").trim();
  const targetHref = String(route.target_href || "").trim();
  const canonical = String(route.canonical || "").trim();
  if (!sourceFile || !fs.existsSync(path.join(ROOT, sourceFile))) {
    errors.push(`${label}: transition source file must exist until server redirect release`);
    continue;
  }
  if (route.status !== "transition_page") errors.push(`${label}: status must be transition_page`);
  if (route.server_redirect_status !== "blocked_by_hosting_redirect_format") errors.push(`${label}: server redirect must remain blocked_by_hosting_redirect_format in current phase`);
  if (route.target_url !== "/catalog/" || targetHref !== "../catalog/") errors.push(`${label}: transition target must be neutral city catalog`);
  if (canonical !== "https://novostroyki-borisoglebsk.ru/catalog/") errors.push(`${label}: canonical must point to neutral city catalog`);
  if (sitemap.includes(sourceUrl)) errors.push(`${SITEMAP_PATH}: transition source must not be indexed ${sourceUrl}`);

  const html = fs.readFileSync(path.join(ROOT, sourceFile), "utf8");
  const lower = html.toLowerCase();
  if (!hasNoindexFollow(html)) errors.push(`${sourceFile}: safe transition stub requires noindex,follow`);
  if (!html.includes('data-legacy-migration-stub="bm-contract"')) errors.push(`${sourceFile}: BM transition marker missing`);
  if (!html.includes(`<link rel="canonical" href="${canonical}">`)) errors.push(`${sourceFile}: neutral canonical mismatch`);
  if (!html.includes(`href="${targetHref}"`)) errors.push(`${sourceFile}: explicit neutral target link missing`);
  if (oldDomain && lower.includes(oldDomain)) errors.push(`${sourceFile}: old single-project domain is forbidden in transition stub`);
  if (/<form\b/i.test(html) || /data-lead-form/i.test(html) || /<input\b|<textarea\b|<select\b/i.test(html)) errors.push(`${sourceFile}: legacy lead form/contact fields are forbidden`);
  if (/http-equiv=["']refresh["']/i.test(html) || /location\.(?:href|replace|assign)\s*\(/i.test(html) || /window\.location\s*=/i.test(html)) errors.push(`${sourceFile}: automatic client redirect forbidden before server redirect release`);
  for (const fragment of LEGACY_FORBIDDEN_FRAGMENTS) {
    if (lower.includes(fragment)) errors.push(`${sourceFile}: object-specific/old-brand fragment forbidden in transition stub: ${fragment}`);
  }
  for (const phrase of forbiddenPhrases) {
    if (lower.includes(String(phrase).toLowerCase())) errors.push(`${sourceFile}: prohibited advertising phrase forbidden in transition stub: ${phrase}`);
  }
}

if (sitemap.toLowerCase().includes(oldDomain)) errors.push(`${SITEMAP_PATH}: old single-project domain is forbidden`);
if (!coveredPage.includes('<meta name="robots" content="noindex,follow">')) errors.push(`${COVERED_PAGE}: covered object page must remain noindex,follow until other gates pass`);

const campaigns = Array.isArray(campaignRegistry.campaigns) ? campaignRegistry.campaigns : [];
const campaignMap = new Map(campaigns.map((item) => [item.id, item]));
const coveredObjects = new Set(contract.covered_object_ids || []);
for (const campaign of campaigns) {
  if (!coveredObjects.has(campaign.object_id)) continue;
  const source = String(campaign.utm_source || "").toLowerCase();
  const medium = String(campaign.utm_medium || "").toLowerCase();
  const campaignText = `${campaign.utm_campaign || ""} ${campaign.utm_content || ""}`.toLowerCase();
  const paidSearch = new Set(["yandex", "google", "google_ads", "direct"]).has(source) || new Set(["cpc", "ppc", "paid_search", "search"]).has(medium);
  if (paidSearch && approval.status !== "passed") errors.push(`${CAMPAIGNS_PATH}:${campaign.id}: covered-object paid search requires written approval before campaign configuration`);
  if (paidSearch) {
    const hasBrandTerm = (contract.paid_search_brand_terms || []).some((term) => campaignText.includes(String(term).toLowerCase().replace(/\s+/g, "_")) || campaignText.includes(String(term).toLowerCase()));
    if (hasBrandTerm && !(approval.approved_scopes || []).includes("paid_brand_or_geo_search")) errors.push(`${CAMPAIGNS_PATH}:${campaign.id}: brand/geo paid search requires paid_brand_or_geo_search scope`);
  }
}

const gateMap = new Map((manualGates.gates || []).map((item) => [item.id, item]));
const legalGate = gateMap.get("legal_owner_review");
const campaignGate = gateMap.get("campaign_publication_approval");
if (!legalGate || !campaignGate) errors.push(`${MANUAL_GATES_PATH}: required legal/campaign manual gates missing`);

function requiredScopeForCampaign(campaign) {
  const source = String(campaign?.utm_source || "").toLowerCase();
  const medium = String(campaign?.utm_medium || "").toLowerCase();
  if (source === "vk") return "vk_object_publication";
  if (source === "telegram") return "telegram_object_publication";
  if (medium === "qr" || source === "offline") return "object_specific_qr";
  if (new Set(["yandex", "google", "google_ads", "direct"]).has(source) || new Set(["cpc", "ppc", "paid_search", "search"]).has(medium)) return "paid_brand_or_geo_search";
  return "portal_object_page_promotion";
}

const publications = Array.isArray(publicationRegistry.publications) ? publicationRegistry.publications : [];
let coveredPublicationCount = 0;
for (const publication of publications) {
  const campaign = campaignMap.get(publication.campaign_id);
  if (!campaign || !coveredObjects.has(campaign.object_id)) continue;
  coveredPublicationCount += 1;
  const scope = requiredScopeForCampaign(campaign);
  if (approval.status !== "passed") errors.push(`${PUBLICATIONS_PATH}:${publication.publication_id}: covered-object publication requires external written approval`);
  if (!(approval.approved_scopes || []).includes(scope)) errors.push(`${PUBLICATIONS_PATH}:${publication.publication_id}: external approval does not include required scope ${scope}`);
  if (legalGate?.status !== "passed") errors.push(`${PUBLICATIONS_PATH}:${publication.publication_id}: legal_owner_review must be passed`);
  if (campaignGate?.status !== "passed") errors.push(`${PUBLICATIONS_PATH}:${publication.publication_id}: campaign_publication_approval must be passed`);
}

if (contract.publication_policy?.covered_object_campaign_requires_approval !== true) errors.push(`${CONTRACT_PATH}: covered publication approval rule must stay enabled`);
if (contract.publication_policy?.approval_must_include_matching_scope !== true) errors.push(`${CONTRACT_PATH}: matching approval scope must stay enabled`);
if (contract.publication_policy?.manual_campaign_publication_gate_still_required !== true) errors.push(`${CONTRACT_PATH}: campaign manual gate must stay required`);
if (contract.publication_policy?.legal_owner_review_still_required !== true) errors.push(`${CONTRACT_PATH}: legal owner gate must stay required`);
if (contract.current_migration_state?.neutral_portal_domain !== "novostroyki-borisoglebsk.ru") errors.push(`${CONTRACT_PATH}: neutral portal domain mismatch`);
if (contract.current_migration_state?.legacy_problem_routes_neutralized_as_transition_stubs !== true) errors.push(`${CONTRACT_PATH}: legacy problem routes must be marked neutralized`);
if (contract.current_migration_state?.server_redirect_release_still_blocked !== true) errors.push(`${CONTRACT_PATH}: server redirect release must remain blocked in current phase`);

console.log(`Public core HTML files checked: ${publicFiles.length}`);
console.log(`Safe BM legacy transition stubs checked: ${legacyRoutes.length}`);
console.log(`Covered object campaigns defined: ${campaigns.filter((item) => coveredObjects.has(item.object_id)).length}`);
console.log(`Covered object publications recorded: ${coveredPublicationCount}`);
console.log(`External written approval status: ${approval.status}`);
console.log(`Approved scopes: ${(approval.approved_scopes || []).length}`);

if (errors.length) {
  console.error("\nBM contract advertising validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("BM contract advertising validation passed.");
