import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = "data/projects/index.json";
const CONTRACT_PATH = "data/verification/profile-contract.json";
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
  const content = read(relativePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function repoPath(value) {
  return String(value || "").replace(/^\/+/, "");
}

function resolvePageFile(url) {
  const clean = String(url || "").replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? `${clean}/index.html` : "index.html";
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

const index = readJson(INDEX_PATH);
const contract = readJson(CONTRACT_PATH);
if (!Array.isArray(index)) errors.push(`${INDEX_PATH}: expected an array`);
if (!contract || typeof contract !== "object") errors.push(`${CONTRACT_PATH}: expected an object`);

const activeProjects = Array.isArray(index) ? index.filter((item) => item.is_active !== false) : [];
const allowedOverall = new Set(contract?.allowed_overall_statuses || []);
const allowedSource = new Set(contract?.allowed_source_statuses || []);
const allowedClaim = new Set(contract?.allowed_claim_statuses || []);
const allowedImportance = new Set(contract?.allowed_importance || []);
const requiredProfileFields = contract?.required_profile_fields || [];
const requiredSourceFields = contract?.required_source_fields || [];
const requiredClaimFields = contract?.required_claim_fields || [];
const profileSchemaVersion = String(contract?.profile_schema_version || "");

if (activeProjects.length !== 3) {
  errors.push(`${INDEX_PATH}: expected 3 active priority projects, found ${activeProjects.length}`);
}

const summaries = [];
const profilesById = new Map();

for (const entry of activeProjects) {
  const projectId = String(entry.id || "unknown-project");
  const projectPath = repoPath(entry.data_file);
  const project = readJson(projectPath);
  if (!project) continue;

  const verificationPath = repoPath(entry.verification_file || project.verification_file);
  if (!verificationPath) {
    errors.push(`${projectId}: verification_file is required`);
    continue;
  }
  if (entry.verification_file !== project.verification_file) {
    errors.push(`${projectId}: index and project verification_file must match`);
  }

  const profile = readJson(verificationPath);
  if (!profile) continue;
  profilesById.set(projectId, profile);

  requiredProfileFields.forEach((field) => {
    if (!hasOwn(profile, field)) errors.push(`${verificationPath}: missing profile field ${field}`);
  });

  if (String(profile.schema_version || "") !== profileSchemaVersion) {
    errors.push(`${verificationPath}: schema_version must be ${profileSchemaVersion}`);
  }
  if (!isIsoDate(profile.updated_at)) errors.push(`${verificationPath}: updated_at must be an ISO date`);
  if (profile.project_id !== project.id || profile.project_id !== entry.id) {
    errors.push(`${verificationPath}: project_id must match project and index`);
  }

  const expectedSlug = entry.portal_slug || entry.slug;
  if (profile.portal_slug !== expectedSlug) errors.push(`${verificationPath}: portal_slug must be ${expectedSlug}`);

  const expectedPageUrl = entry.portal_detail_url || entry.detail_url || project.detail_url;
  if (profile.page_url !== expectedPageUrl) errors.push(`${verificationPath}: page_url must match project index`);
  if (!allowedOverall.has(profile.overall_status)) {
    errors.push(`${verificationPath}: unsupported overall_status=${profile.overall_status}`);
  }

  const policy = profile.publication_policy || {};
  for (const field of [
    "page_must_remain_noindex_until_confirmed",
    "public_ready_requires_all_critical_claims_confirmed",
    "advertising_requires_separate_current_check",
    "prices_and_availability_are_not_covered"
  ]) {
    if (policy[field] !== true) errors.push(`${verificationPath}: publication_policy.${field} must be true`);
  }

  const sources = Array.isArray(profile.sources) ? profile.sources : [];
  const sourceIds = new Set();
  if (!sources.length) errors.push(`${verificationPath}: sources must be a non-empty array`);
  for (const source of sources) {
    const label = source?.id || "unknown-source";
    requiredSourceFields.forEach((field) => {
      if (!hasOwn(source, field)) errors.push(`${verificationPath}:${label}: missing source field ${field}`);
    });
    if (!source?.id) continue;
    if (sourceIds.has(source.id)) errors.push(`${verificationPath}:${label}: duplicate source id`);
    sourceIds.add(source.id);
    if (!allowedSource.has(source.status)) errors.push(`${verificationPath}:${label}: unsupported source status=${source.status}`);
    if (!isIsoDate(source.last_checked_at)) errors.push(`${verificationPath}:${label}: last_checked_at must be an ISO date`);
    if (source.status === "verified" && !/^https:\/\//i.test(String(source.reference || ""))) {
      errors.push(`${verificationPath}:${label}: verified source requires an HTTPS reference`);
    }
  }

  const claims = Array.isArray(profile.claims) ? profile.claims : [];
  const claimFields = new Set();
  if (!claims.length) errors.push(`${verificationPath}: claims must be a non-empty array`);
  for (const claim of claims) {
    const label = claim?.field || "unknown-claim";
    requiredClaimFields.forEach((field) => {
      if (!hasOwn(claim, field)) errors.push(`${verificationPath}:${label}: missing claim field ${field}`);
    });
    if (!claim?.field) continue;
    if (claimFields.has(claim.field)) errors.push(`${verificationPath}:${label}: duplicate claim field`);
    claimFields.add(claim.field);

    if (!allowedClaim.has(claim.verification_status)) errors.push(`${verificationPath}:${label}: unsupported verification_status=${claim.verification_status}`);
    if (!allowedImportance.has(claim.importance)) errors.push(`${verificationPath}:${label}: unsupported importance=${claim.importance}`);
    if (!isIsoDate(claim.checked_at)) errors.push(`${verificationPath}:${label}: checked_at must be an ISO date`);
    if (typeof claim.publication_allowed !== "boolean") errors.push(`${verificationPath}:${label}: publication_allowed must be boolean`);
    if (!Array.isArray(claim.source_ids) || !claim.source_ids.length) {
      errors.push(`${verificationPath}:${label}: source_ids must be a non-empty array`);
      continue;
    }

    const linkedSources = claim.source_ids.map((sourceId) => sources.find((source) => source.id === sourceId));
    claim.source_ids.forEach((sourceId, index) => {
      if (!linkedSources[index]) errors.push(`${verificationPath}:${label}: unknown source_id=${sourceId}`);
    });
    const allSourcesVerified = linkedSources.length > 0 && linkedSources.every(
      (source) => source?.status === "verified" && /^https:\/\//i.test(String(source.reference || ""))
    );

    if (claim.verification_status === "confirmed" && !allSourcesVerified) {
      errors.push(`${verificationPath}:${label}: confirmed claim requires verified HTTPS sources`);
    }
    if (claim.publication_allowed && claim.verification_status !== "confirmed") {
      errors.push(`${verificationPath}:${label}: publication_allowed requires confirmed status`);
    }
    if (claim.publication_allowed && !allSourcesVerified) {
      errors.push(`${verificationPath}:${label}: publication_allowed requires verified HTTPS sources`);
    }
    if ([
      "working_copy",
      "secondary_only",
      "user_operational_information",
      "requires_document_confirmation",
      "contradicted",
      "not_found"
    ].includes(claim.verification_status) && claim.publication_allowed !== false) {
      errors.push(`${verificationPath}:${label}: non-confirmed working information must not be public`);
    }
  }

  const criticalClaims = claims.filter((claim) => claim.importance === "critical");
  const confirmedCritical = criticalClaims.filter((claim) => claim.verification_status === "confirmed");
  const publicClaims = claims.filter((claim) => claim.publication_allowed === true);
  const allCriticalConfirmed = criticalClaims.length > 0 && confirmedCritical.length === criticalClaims.length;

  if (!criticalClaims.length) errors.push(`${verificationPath}: at least one critical claim is required`);
  if (profile.overall_status === "confirmed" && !allCriticalConfirmed) {
    errors.push(`${verificationPath}: overall_status=confirmed requires all critical claims confirmed`);
  }
  if (project.is_public_ready === true && !allCriticalConfirmed) {
    errors.push(`${projectPath}: is_public_ready=true requires all critical claims confirmed`);
  }
  if (entry.is_public_ready !== project.is_public_ready) {
    errors.push(`${projectId}: is_public_ready must match between index and project`);
  }

  const pagePath = resolvePageFile(expectedPageUrl);
  const html = read(pagePath);
  const hasNoindex = html.includes('content="noindex,follow"') || html.includes("content='noindex,follow'");
  if (!project.is_public_ready && !hasNoindex) {
    errors.push(`${pagePath}: project without full readiness must remain noindex,follow`);
  }

  // Confirmed claims may be published on a noindex project page. Full readiness is a
  // separate gate for indexing, advertising, current offer data and all critical claims.
  if (!project.is_public_ready && publicClaims.length && !hasNoindex) {
    errors.push(`${pagePath}: confirmed buyer claims before full readiness require noindex`);
  }

  summaries.push({
    project_id: projectId,
    sources: sources.length,
    verified_sources: sources.filter((source) => source.status === "verified").length,
    claims: claims.length,
    public_claims: publicClaims.length,
    critical: criticalClaims.length,
    confirmed_critical: confirmedCritical.length,
    noindex: hasNoindex
  });
}

const tellermanov = profilesById.get("tellermanov-sad");
const tellermanovFields = new Set((tellermanov?.claims || []).map((claim) => claim.field));
for (const field of [
  "complex_name",
  "buildings_total",
  "complex_apartments_total",
  "ceiling_height",
  "closed_yard",
  "house_boiler",
  "studio_area_from_m2",
  "four_room_area_to_m2",
  "finish_type",
  "purchase_methods",
  "project_documents_published",
  "current_price",
  "current_availability"
]) {
  if (!tellermanovFields.has(field)) errors.push(`tellermanov-sad: required claim missing: ${field}`);
}
const tellermanovPublic = (tellermanov?.claims || []).filter((claim) => claim.publication_allowed === true);
if (tellermanovPublic.length < 21) errors.push(`tellermanov-sad: expected at least 21 confirmed public buyer claims`);
for (const field of ["current_price", "current_availability"]) {
  const claim = (tellermanov?.claims || []).find((item) => item.field === field);
  if (!claim || claim.publication_allowed !== false) errors.push(`tellermanov-sad: ${field} must remain unpublished`);
}

const aerodromnaya = profilesById.get("aerodromnaya-18g");
for (const field of [
  "sections_total",
  "commissioning_model",
  "uncommissioned_sections_probable",
  "sales_status_uncommissioned",
  "contract_type",
  "seller_identity"
]) {
  if (!aerodromnaya?.claims?.some((claim) => claim.field === field)) {
    errors.push(`aerodromnaya-18g: required claim missing: ${field}`);
  }
}

const sennaya = profilesById.get("sennaya-76");
for (const field of [
  "apartments_total",
  "area_max_conflict",
  "apartment_cadastral_numbers_available",
  "commissioning_permit",
  "developer_ogrnip"
]) {
  if (!sennaya?.claims?.some((claim) => claim.field === field)) {
    errors.push(`sennaya-76: required claim missing: ${field}`);
  }
}

console.log(`Verification profiles checked: ${summaries.length}`);
for (const summary of summaries) {
  console.log(`${summary.project_id}: sources=${summary.verified_sources}/${summary.sources}; public=${summary.public_claims}/${summary.claims}; critical=${summary.confirmed_critical}/${summary.critical}; noindex=${summary.noindex}`);
}

if (errors.length) {
  console.error("\nObject verification profile errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Object verification profile validation passed.");
