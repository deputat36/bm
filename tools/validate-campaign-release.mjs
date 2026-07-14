import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CAMPAIGNS_PATH = "data/marketing/utm-campaigns.json";
const RELEASE_PATH = "data/marketing/campaign-release.json";
const DOC_PATH = "docs/portal/CAMPAIGN_RELEASE_PACK.md";
const EXPECTED_ACTIVE_CAMPAIGNS = 11;
const BASE_URL = "https://novostroyki-borisoglebsk.ru";
const FORBIDDEN_QUERY_KEYS = new Set([
  "lead_test",
  "analytics_test",
  "test_ack",
  "name",
  "phone",
  "email",
  "client_fixation_id",
  "realtor",
  "realtor_id",
  "manager"
]);
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

function buildUrl(campaign) {
  const url = new URL(campaign.landing_path, BASE_URL);
  url.searchParams.set("utm_source", campaign.utm_source);
  url.searchParams.set("utm_medium", campaign.utm_medium);
  url.searchParams.set("utm_campaign", campaign.utm_campaign);
  url.searchParams.set("utm_content", campaign.utm_content);
  return url.toString();
}

const registry = readJson(CAMPAIGNS_PATH);
const release = readJson(RELEASE_PATH);
const documentation = read(DOC_PATH);
const campaigns = Array.isArray(registry?.campaigns) ? registry.campaigns : [];
const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active");
const releaseIds = Array.isArray(release?.campaign_ids) ? release.campaign_ids : [];
const activeIds = activeCampaigns.map((campaign) => campaign.id);
const campaignMap = new Map(campaigns.map((campaign) => [campaign.id, campaign]));

if (activeCampaigns.length !== EXPECTED_ACTIVE_CAMPAIGNS) {
  errors.push(`${CAMPAIGNS_PATH}: ожидалось ${EXPECTED_ACTIVE_CAMPAIGNS} активных кампаний, найдено ${activeCampaigns.length}`);
}

if (release?.release_id !== "portal_campaign_links_2026_07_14") {
  errors.push(`${RELEASE_PATH}: неверный release_id`);
}
if (release?.portal_id !== "newbuilds-borisoglebsk") {
  errors.push(`${RELEASE_PATH}: неверный portal_id`);
}
if (release?.base_url !== BASE_URL) {
  errors.push(`${RELEASE_PATH}: base_url должен быть ${BASE_URL}`);
}
if (release?.status !== "prepared_not_published") {
  errors.push(`${RELEASE_PATH}: выпуск должен оставаться prepared_not_published до ручного решения`);
}
if (release?.rules?.include_all_active_campaigns !== true) {
  errors.push(`${RELEASE_PATH}: include_all_active_campaigns должен быть true`);
}
if (release?.rules?.test_parameters_forbidden !== true || release?.rules?.personal_parameters_forbidden !== true) {
  errors.push(`${RELEASE_PATH}: должны быть включены запреты тестовых и персональных параметров`);
}
if (release?.publication?.links_published !== false) {
  errors.push(`${RELEASE_PATH}: links_published должен оставаться false`);
}
if (release?.publication?.qr_images_generated !== false) {
  errors.push(`${RELEASE_PATH}: QR-изображения не должны считаться выпущенными до выбора носителя`);
}
if (release?.publication?.external_shortener_used !== false) {
  errors.push(`${RELEASE_PATH}: внешний сокращатель ссылок не должен использоваться`);
}

const duplicateReleaseIds = releaseIds.filter((id, index) => releaseIds.indexOf(id) !== index);
if (duplicateReleaseIds.length) {
  errors.push(`${RELEASE_PATH}: дублирующиеся campaign_ids: ${[...new Set(duplicateReleaseIds)].join(", ")}`);
}

const missingActive = activeIds.filter((id) => !releaseIds.includes(id));
const extraRelease = releaseIds.filter((id) => !activeIds.includes(id));
if (missingActive.length) {
  errors.push(`${RELEASE_PATH}: отсутствуют активные кампании: ${missingActive.join(", ")}`);
}
if (extraRelease.length) {
  errors.push(`${RELEASE_PATH}: включены неактивные или неизвестные кампании: ${extraRelease.join(", ")}`);
}
if (releaseIds.length !== EXPECTED_ACTIVE_CAMPAIGNS) {
  errors.push(`${RELEASE_PATH}: ожидалось ${EXPECTED_ACTIVE_CAMPAIGNS} campaign_ids, найдено ${releaseIds.length}`);
}

const requiredChannelPairs = [
  ["portal_catalog", "vk"],
  ["portal_catalog", "telegram"],
  ["prostornaya_4a_launch", "vk"],
  ["prostornaya_4a_launch", "telegram"],
  ["aerodromnaya_18g_interest", "vk"],
  ["aerodromnaya_18g_interest", "telegram"],
  ["sennaya_76_interest", "vk"],
  ["sennaya_76_interest", "telegram"],
  ["portal_mortgage", "vk"],
  ["portal_mortgage", "telegram"]
];

for (const [utmCampaign, source] of requiredChannelPairs) {
  const found = activeCampaigns.some((campaign) => campaign.utm_campaign === utmCampaign && campaign.utm_source === source);
  if (!found) errors.push(`${CAMPAIGNS_PATH}: отсутствует пара ${utmCampaign}/${source}`);
}

const offlineQr = activeCampaigns.filter((campaign) => campaign.utm_source === "offline" && campaign.utm_medium === "qr");
if (offlineQr.length !== 1) {
  errors.push(`${CAMPAIGNS_PATH}: должна быть ровно одна активная offline/qr кампания`);
}

for (const id of releaseIds) {
  const campaign = campaignMap.get(id);
  if (!campaign) continue;
  const urlText = buildUrl(campaign);
  const url = new URL(urlText);

  if (url.origin !== BASE_URL) {
    errors.push(`${id}: ссылка должна использовать основной домен`);
  }
  if (url.protocol !== "https:") {
    errors.push(`${id}: ссылка должна использовать HTTPS`);
  }
  for (const key of url.searchParams.keys()) {
    if (FORBIDDEN_QUERY_KEYS.has(key)) {
      errors.push(`${id}: запрещён query-параметр ${key}`);
    }
  }
  ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach((key) => {
    if (!url.searchParams.get(key)) errors.push(`${id}: отсутствует ${key}`);
  });
  if (url.hash) {
    errors.push(`${id}: release-ссылка не должна зависеть от hash-якоря`);
  }
  if (!documentation.includes(id)) {
    errors.push(`${DOC_PATH}: отсутствует campaign_id ${id}`);
  }
  if (!documentation.includes(urlText)) {
    errors.push(`${DOC_PATH}: отсутствует готовая ссылка ${urlText}`);
  }
}

if (documentation.includes("lead_test=dry-run") || documentation.includes("analytics_test=debug") || documentation.includes("test_ack=1")) {
  errors.push(`${DOC_PATH}: release pack не должен содержать тестовые URL`);
}
if (!documentation.includes("Подготовлено, но не опубликовано")) {
  errors.push(`${DOC_PATH}: должен быть явно указан статус «Подготовлено, но не опубликовано»`);
}
if (!documentation.includes("QR-изображение не создано")) {
  errors.push(`${DOC_PATH}: должен быть явно указан невыпущенный статус QR-изображения`);
}

console.log(`Active campaigns checked: ${activeCampaigns.length}`);
console.log(`Release campaign IDs checked: ${releaseIds.length}`);
console.log(`Prepared links checked: ${releaseIds.filter((id) => campaignMap.has(id)).length}`);

if (errors.length) {
  console.error("\nCampaign release validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nCampaign release validation passed.");
