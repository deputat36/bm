import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

function read(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
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

function requireFragments(relativePath, content, fragments) {
  fragments.forEach((fragment) => {
    if (!content.includes(fragment)) errors.push(`${relativePath}: missing fragment ${fragment}`);
  });
}

const runtimePath = "assets/js/buyer-project-content.js";
const loaderPath = "assets/js/page-accessibility.js";
const catalogRuntimePath = "assets/js/catalog-verification-comparison.js";
const profilePath = "data/verification/prostornaya-4a.json";
const pagePath = "catalog/prostornaya-4a/index.html";
const homePath = "index.html";

const runtime = read(runtimePath);
const loader = read(loaderPath);
const catalogRuntime = read(catalogRuntimePath);
const page = read(pagePath);
const home = read(homePath);
const profile = readJson(profilePath);

requireFragments(runtimePath, runtime, [
  'new URL("../../data/verification/prostornaya-4a.json", scriptUrl).href',
  'claim?.publication_allowed === true',
  'CONFIRMED_STATUSES.has',
  'select[name=\'residential_complex\'] option',
  'ЖК «Теллерманов сад» — ул. Просторная',
  'findHomepageProjectCard',
  '${buildings} дома · ${apartments} квартиры',
  'Узнать цены и наличие',
  'window.__NEWBUILD_BUYER_PROJECT_CONTENT__ = true'
]);

requireFragments(loaderPath, loader, [
  'new URL("buyer-project-content.js", scriptUrl).href',
  'buyerContentScript.async = true',
  'buyerContentScript.dataset.buyerProjectContent = "true"'
]);

requireFragments(catalogRuntimePath, catalogRuntime, [
  'profile?.project_id === "tellermanov-sad"',
  'ЖК «Теллерманов сад»',
  'Закрытый двор · общедомовая котельная · видеонаблюдение',
  'Студии от ${studioFrom || 25} м²',
  'primaryAction.textContent = "Узнать цены и наличие"'
]);

requireFragments(pagePath, page, [
  '<h1>ЖК «Теллерманов сад»</h1>',
  'два дома на 194 квартиры',
  'Комфорт не только внутри квартиры',
  'От компактной студии до семейной квартиры',
  'Улучшенная предчистовая отделка',
  'Можно собрать подходящий финансовый сценарий',
  'Покупатель может проверить первичные документы',
  'href="https://bm36.ru/projects/tellermanov-sad/"',
  'Цена, наличие и применимость программ покупки уточняются'
]);

if (!home.includes('<section id="objects">')) errors.push(`${homePath}: objects section missing`);
if (!home.includes('data-track-object="prostornaya-4a"')) errors.push(`${homePath}: Tellermanov homepage CTA missing`);

const claims = Array.isArray(profile?.claims) ? profile.claims : [];
const sources = Array.isArray(profile?.sources) ? profile.sources : [];
const sourceMap = new Map(sources.map((source) => [source.id, source]));
const publicClaims = claims.filter((claim) => claim.publication_allowed === true);
const publicMap = new Map(publicClaims.map((claim) => [claim.field, claim.value]));

const expectedValues = new Map([
  ["complex_name", "ЖК «Теллерманов сад»"],
  ["buildings_total", 2],
  ["complex_apartments_total", 194],
  ["ceiling_height", 2.7],
  ["yard_area_m2", 1730],
  ["parking_spaces", 130],
  ["studio_area_from_m2", 25],
  ["four_room_area_to_m2", 92],
  ["energy_efficiency", "A"]
]);

expectedValues.forEach((expected, field) => {
  if (publicMap.get(field) !== expected) {
    errors.push(`${profilePath}: ${field} must equal ${JSON.stringify(expected)}`);
  }
});

if (publicClaims.length < 21) errors.push(`${profilePath}: buyer profile must expose at least 21 confirmed claims`);
publicClaims.forEach((claim) => {
  if (claim.verification_status !== "confirmed") {
    errors.push(`${profilePath}: public claim ${claim.field} is not confirmed`);
  }
  (claim.source_ids || []).forEach((sourceId) => {
    const source = sourceMap.get(sourceId);
    if (!source || source.status !== "verified" || !String(source.reference || "").startsWith("https://")) {
      errors.push(`${profilePath}: public claim ${claim.field} has invalid source ${sourceId}`);
    }
  });
});

for (const field of ["current_price", "current_availability"]) {
  const claim = claims.find((item) => item.field === field);
  if (!claim || claim.publication_allowed !== false) errors.push(`${profilePath}: ${field} must remain private`);
}

const forbiddenRuntimeFragments = [
  "api.web3forms.com",
  "WEB3FORMS_ACCESS_KEY",
  "sendLead(",
  "collectFormData(",
  "navigator.userAgent",
  "localStorage.setItem",
  "sessionStorage.setItem"
];
forbiddenRuntimeFragments.forEach((fragment) => {
  if (runtime.includes(fragment)) errors.push(`${runtimePath}: buyer runtime must not contain ${fragment}`);
});

const externalFetches = [...runtime.matchAll(/fetch\(([^)]+)/g)].map((match) => match[1]);
if (externalFetches.length !== 1 || !externalFetches[0].includes("PROFILE_URL")) {
  errors.push(`${runtimePath}: expected exactly one same-origin profile fetch`);
}

const formCount = (page.match(/<form\b[^>]*data-lead-form/gi) || []).length;
if (formCount !== 2) errors.push(`${pagePath}: expected 2 lead forms, found ${formCount}`);

console.log(`Buyer-facing public claims: ${publicClaims.length}`);
console.log(`Verified profile sources: ${sources.filter((source) => source.status === "verified").length}`);
console.log("Homepage, catalog and project page buyer content checked.");
console.log("Current prices and availability remain unpublished.");

if (errors.length) {
  console.error("\nBuyer project content validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Buyer project content validation passed.");
