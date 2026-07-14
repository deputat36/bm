import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CAMPAIGNS_PATH = "data/marketing/utm-campaigns.json";
const RELEASE_PATH = "data/marketing/campaign-release.json";
const PUBLICATIONS_PATH = "data/marketing/campaign-publications.json";
const ALLOWED_STATUSES = new Set(["published", "paused", "archived"]);
const FORBIDDEN_FIELDS = new Set([
  "name",
  "phone",
  "email",
  "client_fixation_id",
  "realtor",
  "realtor_id",
  "manager",
  "lead_payload",
  "user_agent"
]);
const FORBIDDEN_QUERY_KEYS = new Set(["lead_test", "analytics_test", "test_ack"]);
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: файл не найден`);
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
    errors.push(`${relativePath}: некорректный JSON: ${error.message}`);
    return null;
  }
}

function isIsoDateTime(value) {
  const text = String(value || "").trim();
  return Boolean(text && !Number.isNaN(Date.parse(text)) && /T\d{2}:\d{2}/.test(text));
}

function isHttpsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function requireText(item, field, label) {
  const value = String(item?.[field] || "").trim();
  if (!value) errors.push(`${label}: отсутствует ${field}`);
  return value;
}

const campaignsRegistry = readJson(CAMPAIGNS_PATH);
const release = readJson(RELEASE_PATH);
const tracker = readJson(PUBLICATIONS_PATH);
const campaigns = Array.isArray(campaignsRegistry?.campaigns) ? campaignsRegistry.campaigns : [];
const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active");
const campaignMap = new Map(activeCampaigns.map((campaign) => [campaign.id, campaign]));
const releaseIds = new Set(Array.isArray(release?.campaign_ids) ? release.campaign_ids : []);
const publications = Array.isArray(tracker?.publications) ? tracker.publications : [];
const seenPublicationIds = new Set();

if (tracker?.portal_id !== "newbuilds-borisoglebsk") {
  errors.push(`${PUBLICATIONS_PATH}: неверный portal_id`);
}
if (tracker?.release_id !== release?.release_id) {
  errors.push(`${PUBLICATIONS_PATH}: release_id должен совпадать с ${RELEASE_PATH}`);
}
if (tracker?.rules?.store_only_actual_publications !== true) {
  errors.push(`${PUBLICATIONS_PATH}: store_only_actual_publications должен быть true`);
}
if (tracker?.rules?.missing_record_means_not_published !== true) {
  errors.push(`${PUBLICATIONS_PATH}: missing_record_means_not_published должен быть true`);
}
if (!Array.isArray(tracker?.publications)) {
  errors.push(`${PUBLICATIONS_PATH}: publications должен быть массивом`);
}

for (const [index, publication] of publications.entries()) {
  const label = `${PUBLICATIONS_PATH}#${index + 1}:${publication?.publication_id || "unknown"}`;
  const publicationId = requireText(publication, "publication_id", label);
  const campaignId = requireText(publication, "campaign_id", label);
  const status = requireText(publication, "status", label);
  const channel = requireText(publication, "channel", label);
  const externalUrl = requireText(publication, "external_url", label);
  const publishedAt = requireText(publication, "published_at", label);
  const evidence = requireText(publication, "evidence", label);
  requireText(publication, "owner", label);

  if (publicationId && seenPublicationIds.has(publicationId)) {
    errors.push(`${label}: дублирующий publication_id`);
  }
  seenPublicationIds.add(publicationId);

  if (!ALLOWED_STATUSES.has(status)) {
    errors.push(`${label}: status должен быть published, paused или archived`);
  }
  if (!releaseIds.has(campaignId)) {
    errors.push(`${label}: campaign_id отсутствует в release pack`);
  }

  const campaign = campaignMap.get(campaignId);
  if (!campaign) {
    errors.push(`${label}: campaign_id отсутствует среди активных кампаний`);
  } else if (campaign.utm_source !== channel) {
    errors.push(`${label}: channel=${channel} не совпадает с utm_source=${campaign.utm_source}`);
  }

  if (!isHttpsUrl(externalUrl)) {
    errors.push(`${label}: external_url должен быть корректным HTTPS URL`);
  } else {
    const url = new URL(externalUrl);
    for (const key of url.searchParams.keys()) {
      if (FORBIDDEN_QUERY_KEYS.has(key)) {
        errors.push(`${label}: external_url содержит тестовый параметр ${key}`);
      }
    }
  }

  if (!isIsoDateTime(publishedAt)) {
    errors.push(`${label}: published_at должен быть ISO datetime`);
  }
  if (!evidence.startsWith("https://") && !evidence.startsWith("docs/") && !evidence.startsWith("issue:")) {
    errors.push(`${label}: evidence должен быть HTTPS-ссылкой, docs/... или issue:<номер>`);
  }

  Object.keys(publication || {}).forEach((field) => {
    if (FORBIDDEN_FIELDS.has(field)) {
      errors.push(`${label}: запрещено хранить поле ${field}`);
    }
  });
}

const campaignsWithPublications = new Set(publications.map((publication) => publication.campaign_id));
const unpublishedCampaigns = [...releaseIds].filter((id) => !campaignsWithPublications.has(id));

console.log(`Release campaigns: ${releaseIds.size}`);
console.log(`Recorded publications: ${publications.length}`);
console.log(`Campaigns with publications: ${campaignsWithPublications.size}`);
console.log(`Campaigns without publications: ${unpublishedCampaigns.length}`);

if (errors.length) {
  console.error("\nCampaign publication validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nCampaign publication validation passed.");
