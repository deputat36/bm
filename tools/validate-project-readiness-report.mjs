import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = "data/projects/index.json";
const PROSTORNAYA_VERIFICATION_PATH = "data/verification/prostornaya-4a.json";
const DOC_PATH = "docs/portal/PROJECT_VERIFICATION_READINESS.md";
const EXPECTED_PROJECT_IDS = ["tellermanov-sad", "aerodromnaya-18g", "sennaya-76"];
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

function repoPath(value) {
  return String(value || "").replace(/^\/+/, "");
}

function resolvePageFile(url) {
  const clean = String(url || "").replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? `${clean}/index.html` : "index.html";
}

const index = readJson(INDEX_PATH);
const prostornayaVerification = readJson(PROSTORNAYA_VERIFICATION_PATH);
const documentation = read(DOC_PATH);
const activeProjects = Array.isArray(index) ? index.filter((item) => item.is_active !== false) : [];

if (!Array.isArray(index)) {
  errors.push(`${INDEX_PATH}: ожидается массив`);
}

if (activeProjects.length !== EXPECTED_PROJECT_IDS.length) {
  errors.push(`${INDEX_PATH}: ожидалось ${EXPECTED_PROJECT_IDS.length} активных объекта, найдено ${activeProjects.length}`);
}

for (const projectId of EXPECTED_PROJECT_IDS) {
  const entry = activeProjects.find((item) => item.id === projectId);
  if (!entry) {
    errors.push(`${INDEX_PATH}: отсутствует активный объект ${projectId}`);
    continue;
  }

  const dataFile = repoPath(entry.data_file);
  const project = readJson(dataFile);
  if (!project) continue;

  if (project.id !== entry.id) {
    errors.push(`${dataFile}: id не совпадает с индексом`);
  }
  if (project.is_public_ready !== false || entry.is_public_ready !== false) {
    errors.push(`${projectId}: до подтверждения источников is_public_ready должен быть false`);
  }

  const pageUrl = entry.portal_detail_url || entry.detail_url || project.detail_url;
  const pageFile = resolvePageFile(pageUrl);
  const html = read(pageFile);
  if (html && !html.includes('content="noindex,follow"') && !html.includes("content='noindex,follow'")) {
    errors.push(`${pageFile}: страница должна оставаться noindex,follow`);
  }

  if (!documentation.includes(projectId)) {
    errors.push(`${DOC_PATH}: отсутствует project_id ${projectId}`);
  }
  if (!documentation.includes(pageUrl)) {
    errors.push(`${DOC_PATH}: отсутствует page_url ${pageUrl}`);
  }
}

if (prostornayaVerification) {
  const sources = Array.isArray(prostornayaVerification.sources) ? prostornayaVerification.sources : [];
  const claims = Array.isArray(prostornayaVerification.claims) ? prostornayaVerification.claims : [];
  const criticalClaims = claims.filter((claim) => claim.importance === "critical");
  const confirmedCritical = criticalClaims.filter((claim) => claim.verification_status === "confirmed");
  const verifiedSources = sources.filter((source) => source.status === "verified" && String(source.reference || "").trim());
  const missingReferences = sources.filter((source) => !String(source.reference || "").trim());

  if (sources.length !== 3) errors.push(`${PROSTORNAYA_VERIFICATION_PATH}: ожидалось 3 источника, найдено ${sources.length}`);
  if (verifiedSources.length !== 0) errors.push(`${PROSTORNAYA_VERIFICATION_PATH}: документация должна быть обновлена при появлении проверенного источника`);
  if (missingReferences.length !== 3) errors.push(`${PROSTORNAYA_VERIFICATION_PATH}: ожидалось 3 источника без reference, найдено ${missingReferences.length}`);
  if (claims.length !== 23) errors.push(`${PROSTORNAYA_VERIFICATION_PATH}: ожидалось 23 claims, найдено ${claims.length}`);
  if (criticalClaims.length !== 14) errors.push(`${PROSTORNAYA_VERIFICATION_PATH}: ожидалось 14 critical claims, найдено ${criticalClaims.length}`);
  if (confirmedCritical.length !== 0) errors.push(`${PROSTORNAYA_VERIFICATION_PATH}: документация должна быть обновлена при подтверждении critical claims`);

  [
    "Источники: 0 из 3 проверены",
    "Critical claims: 0 из 14 подтверждены",
    "Всего claims: 23"
  ].forEach((fragment) => {
    if (!documentation.includes(fragment)) errors.push(`${DOC_PATH}: отсутствует актуальная сводка «${fragment}»`);
  });
}

for (const projectId of ["aerodromnaya-18g", "sennaya-76"]) {
  const entry = activeProjects.find((item) => item.id === projectId);
  if (!entry) continue;
  const project = readJson(repoPath(entry.data_file));
  if (!project) continue;

  if (entry.verification_file || project.verification_file) {
    errors.push(`${projectId}: при появлении verification_file нужно обновить отчёт и validator`);
  }
  const neededSources = Array.isArray(project.needed_sources) ? project.needed_sources : [];
  if (neededSources.length !== 5) {
    errors.push(`${projectId}: ожидалось 5 категорий нужных источников, найдено ${neededSources.length}`);
  }
  if (!documentation.includes(`${projectId}: verification_file отсутствует`)) {
    errors.push(`${DOC_PATH}: отсутствует отметка об отсутствии verification_file для ${projectId}`);
  }
}

if (!documentation.includes("Готово к публичной публикации: 0 из 3")) {
  errors.push(`${DOC_PATH}: должен быть указан текущий итог готовности 0 из 3`);
}
if (!documentation.includes("Все три страницы сохраняют noindex,follow")) {
  errors.push(`${DOC_PATH}: должен быть зафиксирован noindex для трёх страниц`);
}
if (documentation.includes("готово к индексации") || documentation.includes("данные полностью подтверждены")) {
  errors.push(`${DOC_PATH}: нельзя заявлять готовность до появления подтверждённых источников`);
}

console.log(`Active projects checked: ${activeProjects.length}`);
console.log(`Prostornaya claims checked: ${prostornayaVerification?.claims?.length || 0}`);
console.log(`Prostornaya sources checked: ${prostornayaVerification?.sources?.length || 0}`);

if (errors.length) {
  console.error("\nProject readiness report validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nProject readiness report validation passed.");
