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
  errors.push(`${PAGE_PATH}: page must remain noindex,follow until the legal and launch gates are approved`);
}
if (!profile || profile.project_id !== "tellermanov-sad" || profile.portal_slug !== "prostornaya-4a") {
  errors.push(`${PROFILE_PATH}: profile identity mismatch`);
}
if (profile?.overall_status !== "requires_recheck") {
  errors.push(`${PROFILE_PATH}: overall status must remain requires_recheck while current prices and availability are absent`);
}

const sources = Array.isArray(profile?.sources) ? profile.sources : [];
const sourceMap = new Map(sources.map((source) => [source.id, source]));
const claims = Array.isArray(profile?.claims) ? profile.claims : [];
const publicClaims = claims.filter((claim) => claim.publication_allowed === true);
const confirmedCritical = claims.filter(
  (claim) => claim.importance === "critical" && claim.verification_status === "confirmed"
);
const publicFields = new Set(publicClaims.map((claim) => claim.field));

for (const sourceId of ["official-developer-project-page", "official-developer-project-list", "project-declaration", "building-permit"]) {
  const source = sourceMap.get(sourceId);
  if (!source || source.status !== "verified" || !String(source.reference || "").startsWith("https://")) {
    errors.push(`${PROFILE_PATH}: verified official source missing or invalid: ${sourceId}`);
  }
}

const requiredPublicFields = [
  "complex_name",
  "address",
  "builder_name",
  "class",
  "buildings_total",
  "complex_apartments_total",
  "ceiling_height",
  "yard_area_m2",
  "parking_spaces",
  "handover",
  "closed_yard",
  "house_boiler",
  "barrier_free_environment",
  "video_surveillance",
  "studio_area_from_m2",
  "four_room_area_to_m2",
  "energy_efficiency",
  "finish_type",
  "finish_includes",
  "purchase_methods",
  "project_documents_published"
];
for (const field of requiredPublicFields) {
  if (!publicFields.has(field)) errors.push(`${PROFILE_PATH}: required buyer-facing public claim missing: ${field}`);
}
if (publicClaims.length < 21) errors.push(`${PROFILE_PATH}: expected at least 21 publication-allowed buyer claims`);
if (confirmedCritical.length < 6) errors.push(`${PROFILE_PATH}: expected at least 6 confirmed critical claims`);

for (const claim of publicClaims) {
  if (claim.verification_status !== "confirmed") {
    errors.push(`${PROFILE_PATH}: public claim ${claim.field} must be confirmed`);
  }
  for (const sourceId of claim.source_ids || []) {
    if (sourceMap.get(sourceId)?.status !== "verified") {
      errors.push(`${PROFILE_PATH}: public claim ${claim.field} uses non-verified source ${sourceId}`);
    }
  }
}

for (const field of ["current_price", "current_availability"]) {
  const claim = claims.find((item) => item.field === field);
  if (!claim || claim.publication_allowed !== false) {
    errors.push(`${PROFILE_PATH}: ${field} must remain unpublished`);
  }
}

const requiredPageFragments = [
  "ЖК «Теллерманов сад»",
  "два дома на 194 квартиры",
  "Закрытый двор",
  "Своя котельная",
  "От компактной студии до семейной квартиры",
  "Улучшенная предчистовая отделка",
  "Семейная ипотека",
  "Проектная декларация",
  "Официальная страница проекта",
  "Портал является независимым каталогом",
  "Цена, наличие и применимость программ покупки уточняются",
  'data-form-id="catalog_prostornaya_4a_quick_consultation"',
  'data-form-id="catalog_prostornaya_4a_priority_lead"',
  'data-track-object="prostornaya-4a"',
  'data-verification-profile="../../data/verification/prostornaya-4a.json"'
];
for (const fragment of requiredPageFragments) {
  if (!page.includes(fragment)) errors.push(`${PAGE_PATH}: missing buyer-content fragment ${fragment}`);
}

const forbiddenPagePatterns = [
  /(?:цена|стоимость)\s*(?:от|=|:)\s*[\d\s]+(?:₽|руб)/i,
  /(?:в наличии|свободно)\s+\d+\s+квартир/i,
  /гарантированн(?:ая|ый|ое)\s+(?:сдача|одобрение|ставка|бронь)/i,
  /официальный сайт ЖК/i,
  /бесплатн(?:ая|ое) бронирован/i,
  /фиксируем цену/i
];
for (const pattern of forbiddenPagePatterns) {
  if (pattern.test(page)) errors.push(`${PAGE_PATH}: forbidden sales claim matched ${pattern}`);
}

const formIds = [...page.matchAll(/data-form-id="([^"]+)"/g)].map((match) => match[1]);
if (formIds.length !== 2) errors.push(`${PAGE_PATH}: expected exactly 2 lead forms, found ${formIds.length}`);
if (!page.includes('href="https://bm36.ru/projects/tellermanov-sad/"')) {
  errors.push(`${PAGE_PATH}: official project source link is missing`);
}

const requiredCatalogFragments = [
  'data-catalog-verification-card data-verification-profile="../data/verification/prostornaya-4a.json"',
  'data-verification-date',
  'data-verification-sources',
  'data-verification-critical',
  'data-verification-categories',
  'script src="../assets/js/catalog-verification-comparison.js"'
];
for (const fragment of requiredCatalogFragments) {
  if (!catalog.includes(fragment)) {
    errors.push(`${CATALOG_PATH}: missing verification comparison fragment ${fragment}`);
  }
}

console.log(`Prostornaya claims checked: ${claims.length}`);
console.log(`Publication-allowed claims: ${publicClaims.length}`);
console.log(`Confirmed critical claims: ${confirmedCritical.length}`);
console.log("Buyer content sections: advantages, apartments, finish, purchase, documents, FAQ");
console.log("Project forms preserved: 2");
console.log("Current price and availability remain unpublished");

if (errors.length) {
  console.error("\nProstornaya buyer-content safety errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Prostornaya buyer-content safety validation passed.");
