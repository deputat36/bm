import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HOMEPAGE_PATH = "index.html";
const READINESS_PATH = "docs/portal/PROJECT_VERIFICATION_READINESS.md";
const RUNTIME_PATH = "assets/js/buyer-project-content.js";
const LOADER_PATH = "assets/js/page-accessibility.js";
const TELLERMANOV_PROFILE_PATH = "data/verification/prostornaya-4a.json";
const AERODROMNAYA_PROFILE_PATH = "data/verification/aerodromnaya-18g.json";
const SENNAYA_PROFILE_PATH = "data/verification/sennaya-76.json";
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

function extractArticle(html, heading) {
  const headingIndex = html.indexOf(`<h3>${heading}</h3>`);
  if (headingIndex < 0) return "";
  const articleStart = html.lastIndexOf("<article", headingIndex);
  const articleEnd = html.indexOf("</article>", headingIndex);
  if (articleStart < 0 || articleEnd < 0) return "";
  return html.slice(articleStart, articleEnd + "</article>".length);
}

function validatePublicClaims(profilePath, profile, minimum) {
  const publicClaims = (profile?.claims || []).filter(
    (claim) => claim.verification_status === "confirmed" && claim.publication_allowed === true
  );
  if (publicClaims.length < minimum) errors.push(`${profilePath}: insufficient confirmed buyer claims`);
  for (const claim of publicClaims) {
    const allVerified = (claim.source_ids || []).every((sourceId) => {
      const source = (profile?.sources || []).find((item) => item.id === sourceId);
      return source?.status === "verified" && /^https:\/\//i.test(String(source.reference || ""));
    });
    if (!allVerified) errors.push(`${profilePath}:${claim.field}: homepage claim source is not verified`);
  }
  return publicClaims;
}

function readCriticalProgress(documentation, heading) {
  const headingIndex = documentation.indexOf(heading);
  if (headingIndex < 0) return NaN;
  const section = documentation.slice(headingIndex, headingIndex + 3500);
  const match = section.match(/Critical claims:\s*(\d+)\s*из\s*(\d+)\s*(?:confirmed|подтверждены|подтверждён|подтвержден)/i);
  return match ? Number(match[1]) : NaN;
}

const homepage = read(HOMEPAGE_PATH);
const readiness = read(READINESS_PATH);
const runtime = read(RUNTIME_PATH);
const loader = read(LOADER_PATH);
const tellermanovProfile = readJson(TELLERMANOV_PROFILE_PATH);
const aerodromnayaProfile = readJson(AERODROMNAYA_PROFILE_PATH);
const sennayaProfile = readJson(SENNAYA_PROFILE_PATH);
if (!homepage || !readiness || !runtime || !loader || !tellermanovProfile || !aerodromnayaProfile || !sennayaProfile) process.exit(1);

if (!homepage.includes('<link rel="canonical" href="https://novostroyki-borisoglebsk.ru/">')) errors.push(`${HOMEPAGE_PATH}: root canonical is missing`);
if (/name=["']robots["'][^>]*noindex/i.test(homepage)) errors.push(`${HOMEPAGE_PATH}: root page is expected to remain indexable`);

const publicReadyMatch = readiness.match(/Готово к публичной публикации:\s*(\d+)\s*из\s*(\d+)/i);
const publicReady = publicReadyMatch ? Number(publicReadyMatch[1]) : NaN;
const tellermanovConfirmedCritical = readCriticalProgress(readiness, "## ЖК «Теллерманов сад»");
const aerodromnayaConfirmedCritical = readCriticalProgress(readiness, "## ЖК «Чкалов» на Аэродромной 18Г");
const sennayaConfirmedCritical = readCriticalProgress(readiness, "## Дом на Сенной 76");

if (![publicReady, tellermanovConfirmedCritical, aerodromnayaConfirmedCritical, sennayaConfirmedCritical].every(Number.isFinite)) {
  errors.push(`${READINESS_PATH}: readiness counters could not be parsed`);
}
if (publicReady !== 0) errors.push(`${READINESS_PATH}: full launch gate must remain closed`);
if (tellermanovConfirmedCritical < 6) errors.push(`${READINESS_PATH}: confirmed critical progress for Tellermanov is missing`);
if (aerodromnayaConfirmedCritical < 1) errors.push(`${READINESS_PATH}: attributed critical progress for Aerodromnaya is missing`);
if (sennayaConfirmedCritical < 1) errors.push(`${READINESS_PATH}: confirmed critical progress for Sennaya is missing`);

for (const project of ["Просторная 4А", "Аэродромная 18Г", "Сенная 76"]) {
  const article = extractArticle(homepage, project);
  if (!article) {
    errors.push(`${HOMEPAGE_PATH}: fallback card not found for ${project}`);
    continue;
  }
  if (!article.includes("Данные уточняются")) errors.push(`${HOMEPAGE_PATH}: static fallback for ${project} must remain cautious`);
}

const tellermanovPublicClaims = validatePublicClaims(TELLERMANOV_PROFILE_PATH, tellermanovProfile, 21);
const aerodromnayaPublicClaims = validatePublicClaims(AERODROMNAYA_PROFILE_PATH, aerodromnayaProfile, 9);
const sennayaPublicClaims = validatePublicClaims(SENNAYA_PROFILE_PATH, sennayaProfile, 14);

for (const fragment of [
  'claim?.publication_allowed === true',
  'CONFIRMED_STATUSES.has',
  'findHomepageProjectCard',
  'ЖК «Теллерманов сад»',
  'ЖК «Чкалов»',
  'Дом на Сенной 76',
  'updateTellermanovHomepageCard',
  'updateAerodromnayaHomepageCard',
  'updateSennayaHomepageCard',
  'Публичные сведения площадки',
  'Название и общие характеристики приведены по карточке ЦИАН.',
  'Секция, ввод, продавец, договор, цена и ипотека проверяются по конкретной квартире.',
  'Цена, наличие, продавец и документы конкретной квартиры проверяются отдельно.',
  'window.__NEWBUILD_BUYER_PROJECT_CONTENT__ = true'
]) {
  if (!runtime.includes(fragment)) errors.push(`${RUNTIME_PATH}: missing safe buyer fragment ${fragment}`);
}
if (!loader.includes('new URL("buyer-project-content.js", scriptUrl).href')) errors.push(`${LOADER_PATH}: buyer content runtime is not loaded`);

for (const forbidden of [
  "api.web3forms.com", "WEB3FORMS_ACCESS_KEY", "current_price", "current_availability", "price_from",
  "available_offers_count", "seller_identity", "commissioning_permit", "commissioning_permits",
  "uncommissioned_sections_probable", "sales_status_uncommissioned", "contract_type", "developer_name",
  "mortgage_availability", "area_max", "localStorage.setItem", "sessionStorage.setItem", "navigator.userAgent"
]) {
  if (runtime.includes(forbidden)) errors.push(`${RUNTIME_PATH}: forbidden token ${forbidden}`);
}

for (const fragment of [
  "9 этажей", "70 квартир", "27,71–63,76 м²", "30.09.2028", "42 квартиры", "37–61,3 м²", "5 920 000",
  "секции №3", "секции №5", "только за наличные"
]) {
  if (homepage.includes(fragment)) errors.push(`${HOMEPAGE_PATH}: working-copy detail leaked into static homepage: ${fragment}`);
}

console.log(`Public-ready projects: ${publicReady}`);
console.log(`Confirmed critical claims: Tellermanov=${tellermanovConfirmedCritical}; Aerodromnaya=${aerodromnayaConfirmedCritical}; Sennaya=${sennayaConfirmedCritical}`);
console.log(`Homepage confirmed buyer claims: Tellermanov=${tellermanovPublicClaims.length}; Aerodromnaya=${aerodromnayaPublicClaims.length}; Sennaya=${sennayaPublicClaims.length}`);
console.log("Static fallback cards remain cautious; attributed buyer content loads from profiles.");

if (errors.length) {
  console.error("\nHomepage verification safety errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Homepage verification safety validation passed.");
