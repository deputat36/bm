import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const PLAN_PATH = "data/marketing/first-wave.json";
const CAMPAIGNS_PATH = "data/marketing/utm-campaigns.json";
const RELEASE_PATH = "data/marketing/campaign-release.json";
const PUBLICATIONS_PATH = "data/marketing/campaign-publications.json";
const READINESS_SCRIPT = "tools/build-launch-readiness-report.mjs";
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

function buildReadiness() {
  try {
    return JSON.parse(execFileSync(process.execPath, [READINESS_SCRIPT, "--format=json"], { cwd: ROOT, encoding: "utf8" }));
  } catch (error) {
    errors.push(`${READINESS_SCRIPT}: cannot build launch readiness: ${error.message}`);
    return null;
  }
}

function exactSet(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) errors.push(`${label}: expected ${right.join(", ")}; got ${left.join(", ")}`);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function isIsoDateTime(value) {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(Date.parse(value));
}

function isHttpsUrl(value) {
  try {
    return new URL(String(value || "")).protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function buildCampaignUrl(campaign, placement) {
  const url = new URL(campaign.landing_path, "https://novostroyki-borisoglebsk.ru");
  url.searchParams.set("utm_source", campaign.utm_source);
  url.searchParams.set("utm_medium", campaign.utm_medium);
  url.searchParams.set("utm_campaign", campaign.utm_campaign);
  url.searchParams.set("utm_content", campaign.utm_content);
  url.searchParams.set("placement", placement);
  return url.toString();
}

const plan = readJson(PLAN_PATH);
const campaignRegistry = readJson(CAMPAIGNS_PATH);
const release = readJson(RELEASE_PATH);
const publicationRegistry = readJson(PUBLICATIONS_PATH);
const readiness = buildReadiness();
if (!plan || !campaignRegistry || !release || !publicationRegistry || !readiness) process.exit(1);

if (plan.schema_version !== "1.0") errors.push(`${PLAN_PATH}: schema_version must be 1.0`);
if (!isIsoDate(plan.updated_at)) errors.push(`${PLAN_PATH}: updated_at must be YYYY-MM-DD`);
if (plan.portal_id !== "newbuilds-borisoglebsk") errors.push(`${PLAN_PATH}: invalid portal_id`);
if (plan.status !== "prepared_blocked_by_launch_gates") errors.push(`${PLAN_PATH}: status must remain prepared_blocked_by_launch_gates until all launch gates pass`);

const rules = plan.rules || {};
if (rules.planned_placements_min !== 3 || rules.planned_placements_max !== 5) errors.push(`${PLAN_PATH}: placement bounds must be 3..5`);
if (rules.maximum_offer_variants !== 2) errors.push(`${PLAN_PATH}: maximum_offer_variants must be 2`);
for (const key of [
  "unique_placement_required",
  "unique_generated_url_required",
  "priority_object_campaigns_forbidden_until_public_ready",
  "actual_publication_requires_all_campaign_launch_gates",
  "actual_publication_requires_external_target",
  "actual_publication_requires_owner_ref",
  "actual_publication_requires_publish_time",
  "actual_publication_requires_cost",
  "publication_records_stored_separately",
  "test_parameters_forbidden",
  "personal_data_forbidden"
]) {
  if (rules[key] !== true) errors.push(`${PLAN_PATH}: rules.${key} must be true`);
}

const expectedGates = new Set([
  "form_manual_qa",
  "lead_operations_approval",
  "real_lead_delivery",
  "live_analytics_debug",
  "legal_owner_review",
  "campaign_links_prepared",
  "campaign_publication_approval"
]);
exactSet(new Set(plan.required_launch_gates || []), expectedGates, `${PLAN_PATH}: required launch gates`);

const campaignLaunch = (readiness.profiles || []).find((item) => item.id === "campaign_launch");
if (!campaignLaunch) errors.push(`${READINESS_SCRIPT}: campaign_launch profile missing`);
else exactSet(new Set(campaignLaunch.required_gates || []), expectedGates, `${READINESS_SCRIPT}: campaign_launch required gates`);
const launchReady = campaignLaunch?.ready === true;
const blockers = new Set(campaignLaunch?.blocked_gates || []);
if (!launchReady && blockers.size === 0) errors.push(`${READINESS_SCRIPT}: campaign launch is not ready but blockers are empty`);

const activeCampaigns = new Map((campaignRegistry.campaigns || []).filter((item) => item.status === "active").map((item) => [item.id, item]));
const releaseIds = new Set(release.campaign_ids || []);
if (release.status !== "prepared_not_published" && release.status !== "published") errors.push(`${RELEASE_PATH}: unexpected release status`);
if (release.publication?.links_published !== false) errors.push(`${RELEASE_PATH}: current first-wave preparation expects links_published=false`);

const offerVariants = Array.isArray(plan.offer_variants) ? plan.offer_variants : [];
if (offerVariants.length < 1 || offerVariants.length > rules.maximum_offer_variants) errors.push(`${PLAN_PATH}: offer variant count out of bounds`);
const offerMap = new Map();
for (const offer of offerVariants) {
  const id = String(offer.id || "").trim();
  if (!id) errors.push(`${PLAN_PATH}: offer variant id required`);
  if (offerMap.has(id)) errors.push(`${PLAN_PATH}: duplicate offer variant ${id}`);
  offerMap.set(id, offer);
  if (!String(offer.title || "").trim()) errors.push(`${PLAN_PATH}:${id}: title required`);
  if (!Array.isArray(offer.allowed_campaign_ids) || !offer.allowed_campaign_ids.length) errors.push(`${PLAN_PATH}:${id}: allowed_campaign_ids required`);
}

const placements = Array.isArray(plan.placements) ? plan.placements : [];
if (placements.length < rules.planned_placements_min || placements.length > rules.planned_placements_max) errors.push(`${PLAN_PATH}: expected 3..5 placements`);
const placementIds = new Set();
const placementValues = new Set();
const generatedUrls = new Set();
const allowedPlanStatuses = new Set(["prepared_not_approved", "approved_to_publish", "published", "paused", "cancelled"]);
const allowedTargetClasses = new Set(["vk_city_community", "vk_realtor_page", "telegram_city_channel", "offline_office_qr"]);
const publicationByCampaign = new Map();
for (const publication of publicationRegistry.publications || []) {
  if (!publicationByCampaign.has(publication.campaign_id)) publicationByCampaign.set(publication.campaign_id, []);
  publicationByCampaign.get(publication.campaign_id).push(publication);
}

let approvedCount = 0;
let publishedCount = 0;
for (const item of placements) {
  const id = String(item.id || "").trim();
  const label = `${PLAN_PATH}:${id || "unknown-placement"}`;
  const placement = String(item.placement || "").trim();
  if (!id) errors.push(`${label}: id required`);
  if (placementIds.has(id)) errors.push(`${label}: duplicate id`);
  placementIds.add(id);
  if (!/^[a-z0-9_]+$/.test(placement)) errors.push(`${label}: placement must use lowercase snake_case`);
  if (placementValues.has(placement)) errors.push(`${label}: duplicate placement ${placement}`);
  placementValues.add(placement);
  if (!allowedPlanStatuses.has(item.status)) errors.push(`${label}: unsupported status ${item.status}`);
  if (!allowedTargetClasses.has(item.target_class)) errors.push(`${label}: unsupported target_class ${item.target_class}`);

  const campaign = activeCampaigns.get(item.campaign_id);
  if (!campaign) {
    errors.push(`${label}: campaign must exist and be active`);
    continue;
  }
  if (!releaseIds.has(item.campaign_id)) errors.push(`${label}: campaign must be in release`);
  if (rules.priority_object_campaigns_forbidden_until_public_ready && campaign.object_id !== "all-newbuilds") {
    errors.push(`${label}: first wave may not use priority object campaign ${campaign.object_id}`);
  }
  const offer = offerMap.get(item.offer_variant);
  if (!offer) errors.push(`${label}: unknown offer_variant ${item.offer_variant}`);
  else if (!offer.allowed_campaign_ids.includes(item.campaign_id)) errors.push(`${label}: campaign not allowed for offer variant`);

  const generatedUrl = buildCampaignUrl(campaign, placement);
  if (generatedUrls.has(generatedUrl)) errors.push(`${label}: generated URL must be unique`);
  generatedUrls.add(generatedUrl);
  const url = new URL(generatedUrl);
  for (const forbiddenKey of ["lead_test", "analytics_test", "test_ack", "realtor", "realtor_id", "manager", "name", "phone", "email"]) {
    if (url.searchParams.has(forbiddenKey)) errors.push(`${label}: generated URL contains forbidden parameter ${forbiddenKey}`);
  }
  if (url.searchParams.get("placement") !== placement) errors.push(`${label}: generated URL placement mismatch`);

  const approvalLike = ["approved_to_publish", "published", "paused"].includes(item.status);
  if (!approvalLike) {
    if (item.external_target_url !== null) errors.push(`${label}: unapproved placement must keep external_target_url=null`);
    if (item.owner_ref !== null) errors.push(`${label}: unapproved placement must keep owner_ref=null`);
    if (item.planned_publish_at !== null) errors.push(`${label}: unapproved placement must keep planned_publish_at=null`);
    if (item.planned_cost_rub !== null) errors.push(`${label}: unapproved placement must keep planned_cost_rub=null`);
  } else {
    approvedCount += 1;
    if (!launchReady) errors.push(`${label}: cannot approve publication while campaign_launch is blocked`);
    if (!isHttpsUrl(item.external_target_url)) errors.push(`${label}: approved placement requires HTTPS external_target_url`);
    if (!/^(role|secure_reference):[a-z0-9_./-]+$/i.test(String(item.owner_ref || ""))) errors.push(`${label}: approved placement requires role:/secure_reference: owner_ref`);
    if (!isIsoDateTime(item.planned_publish_at)) errors.push(`${label}: approved placement requires planned_publish_at`);
    if (!Number.isFinite(item.planned_cost_rub) || item.planned_cost_rub < 0) errors.push(`${label}: approved placement requires non-negative planned_cost_rub`);
  }
  if (item.status === "published") {
    publishedCount += 1;
    const matching = (publicationByCampaign.get(item.campaign_id) || []).filter((record) => record.status === "published");
    if (!matching.length) errors.push(`${label}: published plan requires actual campaign-publications evidence`);
  }
}

if (!launchReady && plan.status !== "prepared_blocked_by_launch_gates") errors.push(`${PLAN_PATH}: blocked launch requires prepared_blocked_by_launch_gates`);
if (!launchReady && approvedCount > 0) errors.push(`${PLAN_PATH}: no placements may be approved while launch blockers exist`);
if ((publicationRegistry.publications || []).length === 0 && publishedCount !== 0) errors.push(`${PLAN_PATH}: no published plan items allowed without publication records`);

const monitoring = plan.monitoring_plan || {};
if (monitoring.first_quality_review_after_leads !== 10) errors.push(`${PLAN_PATH}: first quality review must be after 10 leads`);
if (monitoring.first_rate_review_after_leads !== 30) errors.push(`${PLAN_PATH}: first rate review must be after 30 leads`);
exactSet(new Set(monitoring.metrics || []), new Set(["received", "contacted", "qualified", "consultation_started"]), `${PLAN_PATH}: monitoring metrics`);
if (!Array.isArray(monitoring.stop_conditions) || monitoring.stop_conditions.length < 4) errors.push(`${PLAN_PATH}: stop conditions incomplete`);

console.log(`First-wave placements: ${placements.length}`);
console.log(`Offer variants: ${offerVariants.length}`);
console.log(`Unique generated URLs: ${generatedUrls.size}`);
console.log(`Campaign launch ready: ${launchReady}`);
console.log(`Campaign launch blockers: ${[...blockers].join(", ") || "none"}`);
console.log(`Approved placements: ${approvedCount}; published placements: ${publishedCount}`);

if (errors.length) {
  console.error("\nFirst-wave validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("First-wave validation passed.");
