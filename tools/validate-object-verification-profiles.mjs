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

  for (const field of requiredProfileFields) {
    if (!hasOwn(profile, field)) errors.push(`${verificationPath}: missing profile field ${field}`);
  }

  if (String(profile.schema_version || "") !== profileSchemaVersion) {
    errors.push(`${verificationPath}: schema_version must be ${profileSchemaVersion}`);
  }
  if (!isIsoDate(profile.updated_at)) errors.push(`${verificationPath}: updated_at must be an ISO date`);
  if (profile.project_id !== project.id || profile.project_id !== entry.id) {
    errors.push(`${verificationPath}: project_id must match project and index`);
  }

  const expectedSlug = entry.portal_slug || entry.slug;
  if (profile.portal_slug !== expectedSlug) {
    errors.push(`${verificationPath}: portal_slug must be ${expectedSlug}`);
  }

  const expectedPageUrl = entry.portal_detail_url || entry.detail_url || project.detail_url;
  if (profile.page_url !== expectedPageUrl) {
    errors.push(`${verificationPath}: page_url must match project index`);
  }
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
    for (const field of requiredSourceFields) {
      if (!hasOwn(source, field)) errors.push(`${verificationPath}:${label}: missing source field ${field}`);
    }
    if (!source?.id) continue;
    if (sourceIds.has(source.id)) errors.push(`${verificationPath}:${label}: duplicate source id`);
    sourceIds.add(source.id);
    if (!allowedSource.has(source.status)) {
      errors.push(`${verificationPath}:${label}: unsupported source status=${source.status}`);
    }
    if (!isIsoDate(source.last_checked_at)) {
      errors.push(`${verificationPath}:${label}: last_checked_at must be an ISO date`);
    }
    if (source.status === "verified" && !/^https:\/\//i.test(String(source.reference || ""))) {
      errors.push(`${verificationPath}:${label}: verified source requires an HTTPS reference`);
    }
  }

  const claims = Array.isArray(profile.claims) ? profile.claims : [];
  const claimFields = new Set();
  if (!claims.length) errors.push(`${verificationPath}: claims must be a non-empty array`);

  for (const claim of claims) {
    const label = claim?.field || "unknown-claim";
    for (const field of requiredClaimFields) {
      if (!hasOwn(claim, field)) errors.push(`${verificationPath}:${label}: missing claim field ${field}`);
    }
    if (!claim?.field) continue;
    if (claimFields.has(claim.field)) errors.push(`${verificationPath}:${label}: duplicate claim field`);
    claimFields.add(claim.field);

    if (!allowedClaim.has(claim.verification_status)) {
      errors.push(`${verificationPath}:${label}: unsupported verification_status=${claim.verification_status}`);
    }
    if (!allowedImportance.has(claim.importance)) {
      errors.push(`${verificationPath}:${label}: unsupported importance=${claim.importance}`);
    }
    if (!isIsoDate(claim.checked_at)) {
      errors.push(`${verificationPath}:${label}: checked_at must be an ISO date`);
    }
    if (typeof claim.publication_allowed !== "boolean") {
      errors.push(`${verificationPath}:${label}: publication_allowed must be boolean`);
    }
    if (!Array.isArray(claim.source_ids) || !claim.source_ids.length) {
      errors.push(`${verificationPath}:${label}: source_ids must be a non-empty array`);
    } else {
      for (const sourceId of claim.source_ids) {
        if (!sourceIds.has(sourceId)) {
          errors.push(`${verificationPath}:${label}: unknown source_id=${sourceId}`);
        }
      }
    }

    const allSourcesVerified = Array.isArray(claim.source_ids) && claim.source_ids.length > 0
      && claim.source_ids.every((sourceId) => {
        const source = sources.find((item) => item.id === sourceId);
        return source?.status === "verified" && /^https:\/\//i.test(String(source.reference || ""));
      });

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
  if (!allCriticalConfirmed && !hasNoindex) {
    errors.push(`${pagePath}: unconfirmed project page must remain noindex,follow`);
  }
  if (!project.is_public_ready && claims.some((claim) => claim.publication_allowed)) {
    errors.push(`${verificationPath}: no claim may be publication_allowed while project is not public ready`);
  }

  summaries.push({
    project_id: projectId,
    sources: sources.length,
    claims: claims.length,
    critical: criticalClaims.length,
    confirmed_critical: confirmedCritical.length,
    noindex: hasNoindex
  });
}

const byId = new Map(summaries.map((item) => [item.project_id, item]));
if (byId.get("tellermanov-sad")?.claims !== 23 || byId.get("tellermanov-sad")?.critical !== 14) {
  errors.push("tellermanov-sad: expected 23 claims and 14 critical claims");
}

for (const field of [
  "sections_total",
  "commissioning_model",
  "uncommissioned_sections_probable",
  "sales_status_uncommissioned",
  "contract_type",
  "seller_identity"
]) {
  const profile = readJson("data/verification/aerodromnaya-18g.json");
  if (!profile?.claims?.some((claim) => claim.field === field)) {
    errors.push(`aerodromnaya-18g: required claim missing: ${field}`);
  }
}

for (const field of [
  "apartments_total",
  "area_max_conflict",
  "apartment_cadastral_numbers_available",
  "commissioning_permit",
  "developer_ogrnip"
]) {
  const profile = readJson("data/verification/sennaya-76.json");
  if (!profile?.claims?.some((claim) => claim.field === field)) {
    errors.push(`sennaya-76: required claim missing: ${field}`);
  }
}

console.log(`Verification profiles checked: ${summaries.length}`);
for (const summary of summaries) {
  console.log(`${summary.project_id}: sources=${summary.sources}; claims=${summary.claims}; critical=${summary.confirmed_critical}/${summary.critical}; noindex=${summary.noindex}`);
}

if (errors.length) {
  console.error("\nObject verification profile errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Object verification profile validation passed.");