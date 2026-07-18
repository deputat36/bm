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
  for (const fragment of fragments) {
    if (!content.includes(fragment)) errors.push(`${relativePath}: missing fragment ${fragment}`);
  }
}

function validatePublicClaims(profilePath, profile, expectedValues, minimumPublicClaims) {
  const claims = Array.isArray(profile?.claims) ? profile.claims : [];
  const sources = Array.isArray(profile?.sources) ? profile.sources : [];
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const publicClaims = claims.filter((claim) => claim.publication_allowed === true);
  const publicMap = new Map(publicClaims.map((claim) => [claim.field, claim.value]));

  for (const [field, expected] of expectedValues) {
    if (publicMap.get(field) !== expected) errors.push(`${profilePath}: ${field} must equal ${JSON.stringify(expected)}`);
  }
  if (publicClaims.length < minimumPublicClaims) errors.push(`${profilePath}: buyer profile must expose at least ${minimumPublicClaims} confirmed claims`);

  for (const claim of publicClaims) {
    if (claim.verification_status !== "confirmed") errors.push(`${profilePath}: public claim ${claim.field} is not confirmed`);
    if (!Array.isArray(claim.source_ids) || !claim.source_ids.length) errors.push(`${profilePath}: public claim ${claim.field} needs sources`);
    for (const sourceId of claim.source_ids || []) {
      const source = sourceMap.get(sourceId);
      if (!source || source.status !== "verified" || !String(source.reference || "").startsWith("https://")) {
        errors.push(`${profilePath}: public claim ${claim.field} has invalid source ${sourceId}`);
      }
    }
  }
  return { claims, sources, publicClaims };
}

const runtimePath = "assets/js/buyer-project-content.js";
const loaderPath = "assets/js/page-accessibility.js";
const catalogRuntimePath = "assets/js/catalog-verification-comparison.js";
const homePath = "index.html";
const configs = {
  tellermanov: {
    profilePath: "data/verification/prostornaya-4a.json",
    pagePath: "catalog/prostornaya-4a/index.html",
    minimum: 21,
    expected: new Map([
      ["complex_name", "ЖК «Теллерманов сад»"],
      ["buildings_total", 2],
      ["complex_apartments_total", 194],
      ["ceiling_height", 2.7],
      ["yard_area_m2", 1730],
      ["parking_spaces", 130],
      ["studio_area_from_m2", 25],
      ["four_room_area_to_m2", 92],
      ["energy_efficiency", "A"]
    ])
  },
  aerodromnaya: {
    profilePath: "data/verification/aerodromnaya-18g.json",
    pagePath: "catalog/aerodromnaya-18g/index.html",
    minimum: 10,
    expected: new Map([
      ["address", "ул. Аэродромная, 18Г"],
      ["public_name", "ЖК «Патриот»"],
      ["marketplace_incorrect_name_statement", "ЦИАН ошибочно использует для объекта название ЖК «Чкалов»"],
      ["developer_attribution_statement", "ЦИАН указывает застройщиком ООО «Первая Строительная Компания»"],
      ["building_type_statement", "В карточке ЦИАН объект указан как кирпичный"],
      ["floor_range_statement", "В карточке ЦИАН указана этажность 3–7"],
      ["ceiling_height_statement", "В карточке ЦИАН указана высота потолков 2,7 м"],
      ["finish_statement", "В карточке ЦИАН указана черновая отделка"],
      ["guest_parking_statement", "В карточке ЦИАН указана гостевая парковка"],
      ["territory_features_statement", "В карточке ЦИАН перечислены детская и спортивная площадки и места отдыха"]
    ])
  },
  sennaya: {
    profilePath: "data/verification/sennaya-76.json",
    pagePath: "catalog/sennaya-76/index.html",
    minimum: 14,
    expected: new Map([
      ["address", "ул. Сенная, 76"],
      ["public_name", "Дом на Сенной 76"],
      ["developer_representative_role", "Главный инженер компании-застройщика"],
      ["facade_material_statement", "В публичном интервью заявлен фасад из голландского кирпича"],
      ["roof_material_statement", "В публичном интервью заявлена кровля из керамической черепицы"],
      ["individual_heating_statement", "Представитель застройщика сообщил об индивидуальном отоплении"],
      ["smart_home_statement", "В публичном интервью заявлена система «умный дом»"],
      ["video_surveillance_statement", "В публичном интервью заявлены камеры видеонаблюдения внутри и снаружи дома"]
    ])
  }
};

const runtime = read(runtimePath);
const loader = read(loaderPath);
const catalogRuntime = read(catalogRuntimePath);
const home = read(homePath);
const loaded = Object.fromEntries(
  Object.entries(configs).map(([key, config]) => [key, {
    page: read(config.pagePath),
    profile: readJson(config.profilePath)
  }])
);

requireFragments(runtimePath, runtime, [
  'new URL("../../data/verification/prostornaya-4a.json", scriptUrl).href',
  'new URL("../../data/verification/aerodromnaya-18g.json", scriptUrl).href',
  'new URL("../../data/verification/sennaya-76.json", scriptUrl).href',
  'claim?.publication_allowed === true',
  'CONFIRMED_STATUSES.has',
  "select[name='residential_complex'] option",
  'ЖК «Теллерманов сад» — ул. Просторная',
  'ЖК «Патриот» — Аэродромная 18Г',
  'Дом на Сенной 76',
  'updateAerodromnayaHomepageCard',
  'Название ЖК «Патриот» подтверждено владельцем проекта.',
  'Секция, ввод, продавец, договор, цена и ипотека проверяются по конкретной квартире.',
  'updateHomepageStructuredData("/catalog/aerodromnaya-18g/", "ЖК «Патриот»")',
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
  'profile?.project_id === "aerodromnaya-18g"',
  'profile?.project_id === "sennaya-76"',
  'renderAerodromnayaBuyerCard',
  'Название подтверждено владельцем проекта; характеристики — по ЦИАН',
  'Кирпичный дом · этажность 3–7 · потолки 2,7 м',
  'Секция, ввод, продавец, договор, цена и ипотека проверяются по конкретной квартире',
  'primaryAction.textContent = "Проверить квартиру"'
]);

requireFragments(configs.tellermanov.pagePath, loaded.tellermanov.page, [
  '<h1>ЖК «Теллерманов сад»</h1>',
  'два дома на 194 квартиры',
  'Улучшенная предчистовая отделка',
  'Покупатель может проверить первичные документы',
  'href="https://bm36.ru/projects/tellermanov-sad/"',
  'Цена, наличие и применимость программ покупки уточняются'
]);
requireFragments(configs.aerodromnaya.pagePath, loaded.aerodromnaya.page, [
  '<title>ЖК «Патриот» на Аэродромной 18Г',
  'data-schema-project-name="ЖК Патриот на Аэродромной 18Г"',
  '<h1>ЖК «Патриот» на Аэродромной 18Г</h1>',
  'Название «Патриот» подтверждено владельцем проекта',
  'Карточка ЦИАН использует название ЖК «Чкалов»',
  'href="https://github.com/deputat36/bm/issues/110#issuecomment-5010781446"',
  'href="https://zhk-chkalov-voronezh-i.cian.ru/"',
  'href="https://realty.yandex.ru/borisoglebsk/kupit/kvartira/st-aehrodromnaya-ulica-115486/"',
  'Название отделено от юридических фактов сделки',
  'Нужны первичные документы',
  'Цена, наличие, секция и юридический статус квартиры проверяются отдельно'
]);
if (loaded.aerodromnaya.page.includes('<h1>ЖК «Чкалов»') || loaded.aerodromnaya.page.includes('<title>ЖК «Чкалов»') || loaded.aerodromnaya.page.includes('data-schema-project-name="ЖК Чкалов')) {
  errors.push(`${configs.aerodromnaya.pagePath}: incorrect marketplace name must not be used as primary page identity`);
}
requireFragments(configs.sennaya.pagePath, loaded.sennaya.page, [
  '<h1>Дом на Сенной 76</h1>',
  'Характеристики ниже основаны на публичном интервью главного инженера компании-застройщика',
  'Материалы и долговечность',
  'Инженерия и расходы',
  'Двор и безопасность',
  'href="https://ria-glas.ru/2024/blagoustroistvo/novyj-dom-na-ulicze-sennaya-76-chto-za-fasadom/"',
  'Постоянные сведения отделены от сделки',
  'Цена, наличие и юридический статус конкретной квартиры проверяются отдельно'
]);

for (const objectId of ["prostornaya-4a", "aerodromnaya-18g", "sennaya-76"]) {
  if (!home.includes(`data-track-object="${objectId}"`)) errors.push(`${homePath}: homepage CTA missing for ${objectId}`);
}

const results = Object.fromEntries(
  Object.entries(configs).map(([key, config]) => [key, validatePublicClaims(
    config.profilePath,
    loaded[key].profile,
    config.expected,
    config.minimum
  )])
);

for (const field of ["current_price", "current_availability"]) {
  const claim = results.tellermanov.claims.find((item) => item.field === field);
  if (!claim || claim.publication_allowed !== false) errors.push(`${configs.tellermanov.profilePath}: ${field} must remain private`);
}
for (const field of [
  "sections_total", "commissioning_model", "uncommissioned_sections_probable", "sales_status_uncommissioned",
  "contract_type", "seller_identity", "commissioning_permits", "developer_name", "mortgage_availability",
  "price", "current_market_listings"
]) {
  const claim = results.aerodromnaya.claims.find((item) => item.field === field);
  if (!claim || claim.publication_allowed !== false) errors.push(`${configs.aerodromnaya.profilePath}: ${field} must remain private`);
}
for (const field of ["price_from", "available_offers_count", "seller_identity", "commissioning_permit", "area_max"]) {
  const claim = results.sennaya.claims.find((item) => item.field === field);
  if (!claim || claim.publication_allowed !== false) errors.push(`${configs.sennaya.profilePath}: ${field} must remain private`);
}

for (const sourceId of ["owner-project-name-confirmation", "cian-complex-card", "yandex-address-listings"]) {
  const source = results.aerodromnaya.sources.find((item) => item.id === sourceId);
  if (!source || source.status !== "verified" || !String(source.reference || "").startsWith("https://")) {
    errors.push(`${configs.aerodromnaya.profilePath}: verified source ${sourceId} is required`);
  }
}
const ownerConfirmation = results.aerodromnaya.sources.find((source) => source.id === "owner-project-name-confirmation");
if (!String(ownerConfirmation?.reference || "").includes("issues/110#issuecomment-5010781446")) {
  errors.push(`${configs.aerodromnaya.profilePath}: owner confirmation must reference issue #110 correction`);
}
const sennayaInterview = results.sennaya.sources.find((source) => source.id === "developer-engineer-interview");
if (!sennayaInterview || sennayaInterview.status !== "verified" || !String(sennayaInterview.reference || "").includes("ria-glas.ru/2024/")) {
  errors.push(`${configs.sennaya.profilePath}: verified developer interview source is required`);
}

for (const [key, config] of Object.entries(configs)) {
  const page = loaded[key].page;
  const formCount = (page.match(/<form\b[^>]*data-lead-form/gi) || []).length;
  if (formCount !== 2) errors.push(`${config.pagePath}: expected 2 lead forms, found ${formCount}`);
  if (!page.includes('<meta name="robots" content="noindex,follow">')) errors.push(`${config.pagePath}: noindex,follow must remain`);
}

for (const fragment of [
  "api.web3forms.com", "WEB3FORMS_ACCESS_KEY", "sendLead(", "collectFormData(", "navigator.userAgent",
  "localStorage.setItem", "sessionStorage.setItem", "price_from", "available_offers_count",
  "seller_identity", "commissioning_permit"
]) {
  if (runtime.includes(fragment)) errors.push(`${runtimePath}: buyer runtime must not contain ${fragment}`);
}
const fetchCalls = [...runtime.matchAll(/fetch\(([^)]+)/g)].map((match) => match[1]);
if (fetchCalls.length !== 1 || !fetchCalls[0].includes("url")) errors.push(`${runtimePath}: expected one reusable same-origin fetch function`);

console.log(`Tellermanov public claims: ${results.tellermanov.publicClaims.length}`);
console.log(`Aerodromnaya public claims: ${results.aerodromnaya.publicClaims.length}`);
console.log(`Sennaya public claims: ${results.sennaya.publicClaims.length}`);
console.log("Patriot is the canonical project name; the CIAN name is retained only as a documented source error.");
console.log("Prices, availability, seller identity, section commissioning and legal status remain unpublished.");

if (errors.length) {
  console.error("\nBuyer project content validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log("Buyer project content validation passed.");