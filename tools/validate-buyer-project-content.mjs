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

function validatePublicClaims(profilePath, profile, expectedValues, minimumPublicClaims) {
  const claims = Array.isArray(profile?.claims) ? profile.claims : [];
  const sources = Array.isArray(profile?.sources) ? profile.sources : [];
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const publicClaims = claims.filter((claim) => claim.publication_allowed === true);
  const publicMap = new Map(publicClaims.map((claim) => [claim.field, claim.value]));

  expectedValues.forEach((expected, field) => {
    if (publicMap.get(field) !== expected) {
      errors.push(`${profilePath}: ${field} must equal ${JSON.stringify(expected)}`);
    }
  });

  if (publicClaims.length < minimumPublicClaims) {
    errors.push(`${profilePath}: buyer profile must expose at least ${minimumPublicClaims} confirmed claims`);
  }

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

  return { claims, sources, publicClaims };
}

const runtimePath = "assets/js/buyer-project-content.js";
const loaderPath = "assets/js/page-accessibility.js";
const catalogRuntimePath = "assets/js/catalog-verification-comparison.js";
const homePath = "index.html";
const tellermanovProfilePath = "data/verification/prostornaya-4a.json";
const tellermanovPagePath = "catalog/prostornaya-4a/index.html";
const sennayaProfilePath = "data/verification/sennaya-76.json";
const sennayaPagePath = "catalog/sennaya-76/index.html";

const runtime = read(runtimePath);
const loader = read(loaderPath);
const catalogRuntime = read(catalogRuntimePath);
const home = read(homePath);
const tellermanovPage = read(tellermanovPagePath);
const sennayaPage = read(sennayaPagePath);
const tellermanovProfile = readJson(tellermanovProfilePath);
const sennayaProfile = readJson(sennayaProfilePath);

requireFragments(runtimePath, runtime, [
  'new URL("../../data/verification/prostornaya-4a.json", scriptUrl).href',
  'new URL("../../data/verification/sennaya-76.json", scriptUrl).href',
  'claim?.publication_allowed === true',
  'CONFIRMED_STATUSES.has',
  'select[name=\'residential_complex\'] option',
  'ЖК «Теллерманов сад» — ул. Просторная',
  'Дом на Сенной 76',
  'findHomepageProjectCard',
  '${buildings} дома · ${apartments} квартиры',
  'Фасад из голландского кирпича и кровля из керамической черепицы',
  'Цена, наличие, продавец и документы конкретной квартиры проверяются отдельно.',
  'Promise.allSettled',
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
  'profile?.project_id === "sennaya-76"',
  'Публичные сведения представителя застройщика',
  'Кирпичный фасад · керамическая кровля · утепление фасада',
  'Индивидуальное отопление · система «умный дом» · видеонаблюдение',
  'primaryAction.textContent = "Проверить квартиры"'
]);

requireFragments(tellermanovPagePath, tellermanovPage, [
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

requireFragments(sennayaPagePath, sennayaPage, [
  '<h1>Дом на Сенной 76</h1>',
  'Характеристики ниже основаны на публичном интервью главного инженера компании-застройщика',
  'Материалы и долговечность',
  'Инженерия и расходы',
  'Двор и безопасность',
  'Можно прочитать исходное интервью',
  'href="https://ria-glas.ru/2024/blagoustroistvo/novyj-dom-na-ulicze-sennaya-76-chto-za-fasadom/"',
  'Постоянные сведения отделены от сделки',
  'Разрешение на ввод и кадастровый номер здания',
  'Цена, наличие и юридический статус конкретной квартиры проверяются отдельно'
]);

if (!home.includes('<section id="objects">')) errors.push(`${homePath}: objects section missing`);
for (const objectId of ["prostornaya-4a", "sennaya-76"]) {
  if (!home.includes(`data-track-object="${objectId}"`)) errors.push(`${homePath}: homepage CTA missing for ${objectId}`);
}

const tellermanovResult = validatePublicClaims(
  tellermanovProfilePath,
  tellermanovProfile,
  new Map([
    ["complex_name", "ЖК «Теллерманов сад»"],
    ["buildings_total", 2],
    ["complex_apartments_total", 194],
    ["ceiling_height", 2.7],
    ["yard_area_m2", 1730],
    ["parking_spaces", 130],
    ["studio_area_from_m2", 25],
    ["four_room_area_to_m2", 92],
    ["energy_efficiency", "A"]
  ]),
  21
);

const sennayaResult = validatePublicClaims(
  sennayaProfilePath,
  sennayaProfile,
  new Map([
    ["address", "ул. Сенная, 76"],
    ["public_name", "Дом на Сенной 76"],
    ["developer_representative_role", "Главный инженер компании-застройщика"],
    ["facade_material_statement", "В публичном интервью заявлен фасад из голландского кирпича"],
    ["roof_material_statement", "В публичном интервью заявлена кровля из керамической черепицы"],
    ["individual_heating_statement", "Представитель застройщика сообщил об индивидуальном отоплении"],
    ["smart_home_statement", "В публичном интервью заявлена система «умный дом»"],
    ["video_surveillance_statement", "В публичном интервью заявлены камеры видеонаблюдения внутри и снаружи дома"]
  ]),
  14
);

for (const field of ["current_price", "current_availability"]) {
  const claim = tellermanovResult.claims.find((item) => item.field === field);
  if (!claim || claim.publication_allowed !== false) errors.push(`${tellermanovProfilePath}: ${field} must remain private`);
}
for (const field of ["price_from", "available_offers_count", "seller_identity", "commissioning_permit", "area_max"]) {
  const claim = sennayaResult.claims.find((item) => item.field === field);
  if (!claim || claim.publication_allowed !== false) errors.push(`${sennayaProfilePath}: ${field} must remain private`);
}

const sennayaInterview = sennayaResult.sources.find((source) => source.id === "developer-engineer-interview");
if (!sennayaInterview || sennayaInterview.status !== "verified" || !String(sennayaInterview.reference || "").includes("ria-glas.ru/2024/")) {
  errors.push(`${sennayaProfilePath}: verified developer interview source is required`);
}

for (const pageConfig of [
  [tellermanovPagePath, tellermanovPage],
  [sennayaPagePath, sennayaPage]
]) {
  const [relativePath, page] = pageConfig;
  const formCount = (page.match(/<form\b[^>]*data-lead-form/gi) || []).length;
  if (formCount !== 2) errors.push(`${relativePath}: expected 2 lead forms, found ${formCount}`);
  if (!page.includes('<meta name="robots" content="noindex,follow">')) {
    errors.push(`${relativePath}: noindex,follow must remain`);
  }
}

const forbiddenRuntimeFragments = [
  "api.web3forms.com",
  "WEB3FORMS_ACCESS_KEY",
  "sendLead(",
  "collectFormData(",
  "navigator.userAgent",
  "localStorage.setItem",
  "sessionStorage.setItem",
  "price_from",
  "available_offers_count",
  "seller_identity",
  "commissioning_permit"
];
forbiddenRuntimeFragments.forEach((fragment) => {
  if (runtime.includes(fragment)) errors.push(`${runtimePath}: buyer runtime must not contain ${fragment}`);
});

const fetchCalls = [...runtime.matchAll(/fetch\(([^)]+)/g)].map((match) => match[1]);
if (fetchCalls.length !== 1 || !fetchCalls[0].includes("url")) {
  errors.push(`${runtimePath}: expected one reusable same-origin fetch function`);
}

console.log(`Tellermanov public claims: ${tellermanovResult.publicClaims.length}`);
console.log(`Sennaya public claims: ${sennayaResult.publicClaims.length}`);
console.log(`Verified sources: Tellermanov=${tellermanovResult.sources.filter((source) => source.status === "verified").length}; Sennaya=${sennayaResult.sources.filter((source) => source.status === "verified").length}`);
console.log("Homepage, catalog and project pages contain buyer-facing content.");
console.log("Prices, availability, seller identity and legal status remain unpublished.");

if (errors.length) {
  console.error("\nBuyer project content validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Buyer project content validation passed.");
