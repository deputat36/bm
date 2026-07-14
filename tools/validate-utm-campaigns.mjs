import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = "data/marketing/utm-campaigns.json";
const PAGE_INDEX_PATH = "data/pages/index.json";
const ACTIVE_PAGE_STATUSES = new Set(["ready", "published"]);
const ALLOWED_CAMPAIGN_STATUSES = new Set(["active", "draft", "archived"]);
const ALLOWED_OBJECT_IDS = new Set([
  "all-newbuilds",
  "prostornaya-4a",
  "aerodromnaya-18g",
  "sennaya-76"
]);
const SAFE_UTM_VALUE = /^[a-z0-9][a-z0-9_-]*$/;
const LEGACY_PATTERN = /tellermanov|теллерманов|tellermanovsad\.ru/i;
const NEUTRAL_COMPLEX = "Общий подбор новостройки";
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

function normalizePath(value) {
  const clean = String(value || "").trim();
  if (!clean.startsWith("/")) return clean;
  return clean === "/" ? clean : `${clean.replace(/\/+$/, "")}/`;
}

function resolvePageFile(url) {
  const clean = normalizePath(url).replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? `${clean}/index.html` : "index.html";
}

function requireText(item, field, label) {
  const value = String(item?.[field] || "").trim();
  if (!value) errors.push(`${label}: отсутствует ${field}`);
  return value;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFormTag(html, formId) {
  const pattern = new RegExp(`<form\\b[^>]*data-form-id=["']${escapeRegExp(formId)}["'][^>]*>`, "i");
  return html.match(pattern)?.[0] || "";
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`${escapeRegExp(name)}=["']([^"']*)["']`, "i");
  return tag.match(pattern)?.[1]?.trim() || "";
}

function findPrimaryLeadBlock(html) {
  const markerIndex = html.indexOf("data-primary-lead");
  if (markerIndex < 0) return "";

  const tagStart = html.lastIndexOf("<", markerIndex);
  if (tagStart < 0) return "";

  const openingMatch = html.slice(tagStart).match(/^<([a-z0-9-]+)\b[^>]*>/i);
  if (!openingMatch) return "";

  const tagName = openingMatch[1];
  const contentStart = tagStart + openingMatch[0].length;
  const closeTag = `</${tagName}>`;
  const closeIndex = html.indexOf(closeTag, contentStart);
  if (closeIndex < 0) return "";

  return html.slice(tagStart, closeIndex + closeTag.length);
}

const registry = readJson(REGISTRY_PATH);
const pages = readJson(PAGE_INDEX_PATH);
const activePages = new Map();
const seenIds = new Set();
const seenSignatures = new Set();
let activeCampaigns = 0;
let primaryCampaigns = 0;

if (Array.isArray(pages)) {
  for (const page of pages) {
    const url = normalizePath(page?.url);
    if (url && ACTIVE_PAGE_STATUSES.has(page?.status)) {
      activePages.set(url, page);
    }
  }
} else {
  errors.push(`${PAGE_INDEX_PATH}: ожидается массив страниц`);
}

if (!registry || !Array.isArray(registry.campaigns) || registry.campaigns.length === 0) {
  errors.push(`${REGISTRY_PATH}: campaigns должен быть непустым массивом`);
} else {
  if (registry.portal_id !== "newbuilds-borisoglebsk") {
    errors.push(`${REGISTRY_PATH}: portal_id должен быть newbuilds-borisoglebsk`);
  }

  if (registry.rules?.active_campaign_uses_primary_form !== true) {
    errors.push(`${REGISTRY_PATH}: rules.active_campaign_uses_primary_form должен быть true`);
  }

  for (const [index, campaign] of registry.campaigns.entries()) {
    const label = `${REGISTRY_PATH}#${index + 1}:${campaign?.id || "unknown"}`;
    const id = requireText(campaign, "id", label);
    const status = requireText(campaign, "status", label);
    const objectId = requireText(campaign, "object_id", label);
    const landingPath = normalizePath(requireText(campaign, "landing_path", label));
    const formId = requireText(campaign, "expected_form_id", label);
    const leadType = requireText(campaign, "expected_lead_type", label);
    const utmSource = requireText(campaign, "utm_source", label);
    const utmMedium = requireText(campaign, "utm_medium", label);
    const utmCampaign = requireText(campaign, "utm_campaign", label);
    const utmContent = requireText(campaign, "utm_content", label);
    requireText(campaign, "goal", label);
    requireText(campaign, "sales_note", label);

    if (id && seenIds.has(id)) {
      errors.push(`${label}: дублирующий id`);
    }
    seenIds.add(id);

    if (id && !SAFE_UTM_VALUE.test(id)) {
      errors.push(`${label}: id должен содержать только строчные латинские буквы, цифры, дефис и подчёркивание`);
    }

    if (!ALLOWED_CAMPAIGN_STATUSES.has(status)) {
      errors.push(`${label}: неподдерживаемый status=${status}`);
    }

    if (!ALLOWED_OBJECT_IDS.has(objectId)) {
      errors.push(`${label}: неподдерживаемый object_id=${objectId}`);
    }

    for (const [field, value] of Object.entries({
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent
    })) {
      if (value && !SAFE_UTM_VALUE.test(value)) {
        errors.push(`${label}: ${field} должен содержать только строчные латинские буквы, цифры, дефис и подчёркивания`);
      }
    }

    if (LEGACY_PATTERN.test([id, utmCampaign, landingPath].join(" "))) {
      errors.push(`${label}: рекламная кампания не должна возвращать legacy-позиционирование одного ЖК`);
    }

    const signature = [landingPath, utmSource, utmMedium, utmCampaign, utmContent].join("|");
    if (seenSignatures.has(signature)) {
      errors.push(`${label}: дублирующая комбинация посадочной страницы и UTM-меток`);
    }
    seenSignatures.add(signature);

    if (status !== "active") continue;
    activeCampaigns += 1;

    if (!activePages.has(landingPath)) {
      errors.push(`${label}: активная кампания ведёт на страницу без статуса ready/published: ${landingPath}`);
      continue;
    }

    const pageFile = resolvePageFile(landingPath);
    const html = read(pageFile);
    if (!html) continue;

    const formTag = findFormTag(html, formId);
    if (!formTag) {
      errors.push(`${label}: на ${pageFile} не найдена форма ${formId}`);
      continue;
    }

    const actualLeadType = getAttribute(formTag, "data-lead-type");
    if (actualLeadType !== leadType) {
      errors.push(`${label}: форма ${formId} использует lead_type=${actualLeadType || "missing"}, ожидался ${leadType}`);
    }

    const primaryLeadBlock = findPrimaryLeadBlock(html);
    if (!primaryLeadBlock) {
      errors.push(`${label}: на ${pageFile} не найден контейнер data-primary-lead`);
    } else if (!primaryLeadBlock.includes(`data-form-id="${formId}"`) && !primaryLeadBlock.includes(`data-form-id='${formId}'`)) {
      errors.push(`${label}: активная кампания должна вести к первичной короткой форме, но ${formId} не находится внутри data-primary-lead`);
    } else {
      primaryCampaigns += 1;
    }

    const formObjectId = getAttribute(formTag, "data-complex-id");
    const formComplex = getAttribute(formTag, "data-complex");

    if (objectId === "all-newbuilds") {
      if (formComplex !== NEUTRAL_COMPLEX) {
        errors.push(`${label}: общая кампания должна использовать data-complex="${NEUTRAL_COMPLEX}"`);
      }
    } else if (formObjectId !== objectId) {
      errors.push(`${label}: форма ${formId} должна использовать data-complex-id=${objectId}, найдено ${formObjectId || "missing"}`);
    }
  }
}

console.log(`Checked UTM campaigns: ${registry?.campaigns?.length || 0}`);
console.log(`Active UTM campaigns: ${activeCampaigns}`);
console.log(`Active campaigns using primary forms: ${primaryCampaigns}`);

if (errors.length) {
  console.error("\nUTM campaign validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nUTM campaign validation passed.");
