import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROJECT_INDEX_PATH = "data/projects/index.json";
const PROJECT_PATH = "data/projects/tellermanov-sad.json";
const PROFILE_PATH = "data/verification/prostornaya-4a.json";
const PAGE_PATH = "catalog/prostornaya-4a/index.html";
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

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function count(source, fragment) {
  return source.split(fragment).length - 1;
}

const projectIndex = readJson(PROJECT_INDEX_PATH);
const project = readJson(PROJECT_PATH);
const profile = readJson(PROFILE_PATH);
const page = read(PAGE_PATH);
const indexEntry = Array.isArray(projectIndex)
  ? projectIndex.find((item) => item.id === "tellermanov-sad")
  : null;

if (!Array.isArray(projectIndex)) errors.push(`${PROJECT_INDEX_PATH}: ожидается массив проектов`);
if (!indexEntry) errors.push(`${PROJECT_INDEX_PATH}: проект tellermanov-sad не найден`);
if (!project) errors.push(`${PROJECT_PATH}: проект не прочитан`);
if (!profile) errors.push(`${PROFILE_PATH}: verification-профиль не прочитан`);

if (indexEntry && project) {
  if (indexEntry.verification_file !== project.verification_file) {
    errors.push(`${PROJECT_INDEX_PATH}: verification_file не совпадает с ${PROJECT_PATH}`);
  }
  if (indexEntry.is_public_ready !== project.is_public_ready) {
    errors.push(`${PROJECT_INDEX_PATH}: is_public_ready не совпадает с ${PROJECT_PATH}`);
  }
  if (indexEntry.verification_status !== project.verification_status) {
    errors.push(`${PROJECT_INDEX_PATH}: verification_status не совпадает с ${PROJECT_PATH}`);
  }
}

if (profile && project) {
  if (profile.project_id !== project.id || profile.project_id !== "tellermanov-sad") {
    errors.push(`${PROFILE_PATH}: project_id должен совпадать с каноническим проектом`);
  }
  if (profile.portal_slug !== "prostornaya-4a") {
    errors.push(`${PROFILE_PATH}: portal_slug должен быть prostornaya-4a`);
  }
  if (profile.page_url !== "/catalog/prostornaya-4a/") {
    errors.push(`${PROFILE_PATH}: неверный page_url`);
  }
  if (profile.overall_status !== "requires_recheck") {
    errors.push(`${PROFILE_PATH}: до проверки текущего предложения overall_status должен быть requires_recheck`);
  }
  if (!isIsoDate(profile.updated_at)) errors.push(`${PROFILE_PATH}: updated_at должен быть ISO-датой`);

  const policy = profile.publication_policy || {};
  for (const field of [
    "page_must_remain_noindex_until_confirmed",
    "public_ready_requires_all_critical_claims_confirmed",
    "advertising_requires_separate_current_check",
    "prices_and_availability_are_not_covered"
  ]) {
    if (policy[field] !== true) errors.push(`${PROFILE_PATH}: publication_policy.${field} должен быть true`);
  }

  const sources = Array.isArray(profile.sources) ? profile.sources : [];
  const sourceMap = new Map();
  for (const source of sources) {
    if (!source?.id) {
      errors.push(`${PROFILE_PATH}: источник без id`);
      continue;
    }
    if (sourceMap.has(source.id)) errors.push(`${PROFILE_PATH}: дублирующий источник ${source.id}`);
    sourceMap.set(source.id, source);
    if (!isIsoDate(source.last_checked_at)) {
      errors.push(`${PROFILE_PATH}:${source.id}: last_checked_at должен быть ISO-датой`);
    }
    if (source.status === "verified" && !/^https:\/\//i.test(String(source.reference || ""))) {
      errors.push(`${PROFILE_PATH}:${source.id}: verified требует HTTPS-ссылку`);
    }
  }

  for (const sourceId of [
    "official-developer-project-page",
    "official-developer-project-list",
    "project-declaration",
    "building-permit"
  ]) {
    const source = sourceMap.get(sourceId);
    if (!source || source.status !== "verified" || !/^https:\/\//i.test(String(source.reference || ""))) {
      errors.push(`${PROFILE_PATH}: отсутствует проверенный официальный источник ${sourceId}`);
    }
  }

  const claims = Array.isArray(profile.claims) ? profile.claims : [];
  const claimMap = new Map();
  for (const claim of claims) {
    if (!claim?.field) {
      errors.push(`${PROFILE_PATH}: claim без field`);
      continue;
    }
    if (claimMap.has(claim.field)) errors.push(`${PROFILE_PATH}: дублирующий claim ${claim.field}`);
    claimMap.set(claim.field, claim);
    if (!isIsoDate(claim.checked_at)) errors.push(`${PROFILE_PATH}:${claim.field}: checked_at должен быть ISO-датой`);
    if (!Array.isArray(claim.source_ids) || !claim.source_ids.length) {
      errors.push(`${PROFILE_PATH}:${claim.field}: должен быть source_id`);
      continue;
    }

    const linkedSources = claim.source_ids.map((sourceId) => sourceMap.get(sourceId));
    claim.source_ids.forEach((sourceId, index) => {
      if (!linkedSources[index]) errors.push(`${PROFILE_PATH}:${claim.field}: неизвестный source_id=${sourceId}`);
    });
    const allVerified = linkedSources.length > 0 && linkedSources.every(
      (source) => source?.status === "verified" && /^https:\/\//i.test(String(source.reference || ""))
    );

    if (claim.verification_status === "confirmed" && !allVerified) {
      errors.push(`${PROFILE_PATH}:${claim.field}: confirmed требует проверенных HTTPS-источников`);
    }
    if (claim.publication_allowed === true && claim.verification_status !== "confirmed") {
      errors.push(`${PROFILE_PATH}:${claim.field}: публикация требует confirmed`);
    }
    if (claim.publication_allowed === true && !allVerified) {
      errors.push(`${PROFILE_PATH}:${claim.field}: публикация требует проверенных источников`);
    }
    if (claim.publication_allowed !== true && claim.verification_status === "confirmed") {
      // Подтверждённый claim может быть непубличным, если это домовая детализация или изменяемые данные.
    }
  }

  const requiredBuyerClaims = new Map([
    ["complex_name", "ЖК «Теллерманов сад»"],
    ["address", "г. Борисоглебск, ул. Просторная"],
    ["class", "Комфорт"],
    ["buildings_total", 2],
    ["complex_apartments_total", 194],
    ["ceiling_height", 2.7],
    ["yard_area_m2", 1730],
    ["parking_spaces", 130],
    ["handover", "I квартал 2028"],
    ["closed_yard", true],
    ["house_boiler", true],
    ["studio_area_from_m2", 25],
    ["four_room_area_to_m2", 92],
    ["energy_efficiency", "A"],
    ["finish_type", "Улучшенная предчистовая отделка"]
  ]);

  requiredBuyerClaims.forEach((expectedValue, field) => {
    const claim = claimMap.get(field);
    if (!claim) {
      errors.push(`${PROFILE_PATH}: отсутствует покупательская характеристика ${field}`);
      return;
    }
    if (JSON.stringify(claim.value) !== JSON.stringify(expectedValue)) {
      errors.push(`${PROFILE_PATH}:${field}: неверное значение`);
    }
    if (claim.verification_status !== "confirmed" || claim.publication_allowed !== true) {
      errors.push(`${PROFILE_PATH}:${field}: характеристика должна быть confirmed и publication_allowed`);
    }
  });

  for (const field of ["finish_includes", "purchase_methods", "project_documents_published", "layout_features"]) {
    const claim = claimMap.get(field);
    if (!claim || !Array.isArray(claim.value) || !claim.value.length) {
      errors.push(`${PROFILE_PATH}:${field}: нужен непустой подтверждённый список`);
    } else if (claim.verification_status !== "confirmed" || claim.publication_allowed !== true) {
      errors.push(`${PROFILE_PATH}:${field}: список должен быть confirmed и publication_allowed`);
    }
  }

  for (const field of ["house_2_apartments_total", "house_2_apartment_types", "house_2_area_range_m2"]) {
    const claim = claimMap.get(field);
    if (!claim || claim.publication_allowed !== false) {
      errors.push(`${PROFILE_PATH}:${field}: домовая детализация должна оставаться непубличной до повторной сверки`);
    }
  }

  for (const field of ["current_price", "current_availability"]) {
    const claim = claimMap.get(field);
    if (!claim || claim.value !== null || claim.publication_allowed !== false) {
      errors.push(`${PROFILE_PATH}:${field}: текущее предложение не должно публиковаться без актуальных данных`);
    }
  }

  const excludedClaims = new Set(Array.isArray(profile.excluded_claims) ? profile.excluded_claims : []);
  for (const field of [
    "exact_current_price",
    "exact_current_availability",
    "discount",
    "booking",
    "mortgage_approval",
    "guaranteed_handover_date"
  ]) {
    if (!excludedClaims.has(field)) errors.push(`${PROFILE_PATH}: excluded_claims должен содержать ${field}`);
  }

  const publicClaims = claims.filter((claim) => claim.publication_allowed === true);
  if (publicClaims.length < 21) errors.push(`${PROFILE_PATH}: требуется минимум 21 подтверждённая покупательская характеристика`);
  if (project.is_public_ready !== false || indexEntry?.is_public_ready !== false) {
    errors.push(`${PROJECT_PATH}: проект должен оставаться is_public_ready=false до полного запуска`);
  }
}

if (!page.includes('content="noindex,follow"')) {
  errors.push(`${PAGE_PATH}: страница должна оставаться noindex,follow`);
}
for (const fragment of [
  "ЖК «Теллерманов сад»",
  "два дома на 194 квартиры",
  "Портал является независимым каталогом",
  "Цена, наличие и применимость программ покупки уточняются",
  'href="https://bm36.ru/projects/tellermanov-sad/"',
  'data-verification-profile="../../data/verification/prostornaya-4a.json"',
  'data-form-id="catalog_prostornaya_4a_quick_consultation"',
  'data-form-id="catalog_prostornaya_4a_priority_lead"'
]) {
  if (!page.includes(fragment)) errors.push(`${PAGE_PATH}: отсутствует ${fragment}`);
}
if (count(page, "<form ") !== 2) errors.push(`${PAGE_PATH}: должно остаться ровно две формы`);
if (/(?:цена|стоимость)\s*(?:от|=|:)\s*[\d\s]+(?:₽|руб)/i.test(page)) {
  errors.push(`${PAGE_PATH}: точная цена без актуального прайса запрещена`);
}

console.log(`Checked buyer claims: ${(profile?.claims || []).filter((claim) => claim.publication_allowed === true).length}`);
console.log(`Checked official sources: ${(profile?.sources || []).filter((source) => source.status === "verified").length}`);
console.log("Current price and availability remain unpublished.");
console.log("Project remains noindex and is_public_ready=false.");

if (errors.length) {
  console.error("\nProject verification validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nProject verification validation passed.");
