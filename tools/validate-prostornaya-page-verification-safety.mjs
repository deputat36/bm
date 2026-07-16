import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PAGE_PATH = "catalog/prostornaya-4a/index.html";
const CATALOG_PATH = "catalog/index.html";
const PROFILE_PATH = "data/verification/prostornaya-4a.json";
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

const page = read(PAGE_PATH);
const catalog = read(CATALOG_PATH);
const profile = readJson(PROFILE_PATH);

if (!page.includes('content="noindex,follow"')) {
  errors.push(`${PAGE_PATH}: page must remain noindex,follow`);
}
if (!profile || profile.project_id !== "tellermanov-sad" || profile.portal_slug !== "prostornaya-4a") {
  errors.push(`${PROFILE_PATH}: profile identity mismatch`);
}

const claims = Array.isArray(profile?.claims) ? profile.claims : [];
const publicClaims = claims.filter((claim) => claim.publication_allowed === true);
const confirmedCritical = claims.filter(
  (claim) => claim.importance === "critical" && claim.verification_status === "confirmed"
);

if (claims.length !== 23) errors.push(`${PROFILE_PATH}: expected 23 claims`);
if (publicClaims.length !== 0) {
  errors.push(`${PROFILE_PATH}: page validator must be reviewed when any claim becomes public`);
}
if (confirmedCritical.length !== 0) {
  errors.push(`${PROFILE_PATH}: page validator must be reviewed when a critical claim becomes confirmed`);
}

const requiredPageFragments = [
  "Собираем и проверяем сведения по адресу Просторная 4А",
  "Что проверяется по объекту",
  "Рабочие характеристики не публикуются как подтверждённые",
  "Какие источники ещё нужны",
  "Номера из старой рабочей карточки не выводятся как публичные реквизиты",
  'data-form-id="catalog_prostornaya_4a_quick_consultation"',
  'data-form-id="catalog_prostornaya_4a_priority_lead"',
  'data-track-object="prostornaya-4a"'
];
for (const fragment of requiredPageFragments) {
  if (!page.includes(fragment)) errors.push(`${PAGE_PATH}: missing safe fragment ${fragment}`);
}

const forbiddenPageFragments = [
  'data-schema-floors="9"',
  "ЖК «Теллерманов сад»",
  "9 этажей",
  "1 подъезд",
  "70 квартир",
  "27,71",
  "63,76",
  "I квартал 2028",
  "I квартале 2028",
  "30.09.2028",
  "36-001139",
  "72480",
  "36-04-13-2026",
  "08.06.2026",
  "26.06.2026",
  "пассажирский лифт",
  "кирпич / мелкоштучные каменные материалы"
];
for (const fragment of forbiddenPageFragments) {
  if (page.includes(fragment)) errors.push(`${PAGE_PATH}: unverified public fragment remains: ${fragment}`);
}

const requiredCatalogFragments = [
  'data-catalog-verification-card data-verification-profile="../data/verification/prostornaya-4a.json"',
  '<span class="eyebrow" data-verification-status>Загружаем статус проверки</span><h3>Просторная 4А</h3>',
  'data-verification-date',
  'data-verification-sources',
  'data-verification-critical',
  'data-verification-categories',
  'script src="../assets/js/catalog-verification-comparison.js"'
];
for (const fragment of requiredCatalogFragments) {
  if (!catalog.includes(fragment)) {
    errors.push(`${CATALOG_PATH}: missing safe verification comparison fragment ${fragment}`);
  }
}
if (catalog.includes('<span class="eyebrow">Данные частично подтверждены</span><h3>Просторная 4А</h3>')) {
  errors.push(`${CATALOG_PATH}: outdated partially-confirmed label is forbidden`);
}
if (catalog.includes('<span class="eyebrow">Данные уточняются</span><h3>Просторная 4А</h3>')) {
  errors.push(`${CATALOG_PATH}: static verification label must not replace profile-backed status`);
}

console.log(`Prostornaya claims checked: ${claims.length}`);
console.log(`Publication-allowed claims: ${publicClaims.length}`);
console.log(`Confirmed critical claims: ${confirmedCritical.length}`);
console.log("Project forms preserved: 2");
console.log("Catalog status source: verification profile aggregate");

if (errors.length) {
  console.error("\nProstornaya page verification safety errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Prostornaya page verification safety validation passed.");
