import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = "data/projects/index.json";
const DOC_PATH = "docs/portal/PROJECT_VERIFICATION_READINESS.md";
const EXPECTED = {
  "tellermanov-sad": { sourcesMin: 5, claimsMin: 30, criticalMin: 8, verifiedMin: 4, confirmedMin: 6, publicMin: 21 },
  "aerodromnaya-18g": { sources: 6, claims: 13, critical: 8, verified: 0, confirmed: 0, public: 0 },
  "sennaya-76": { sourcesMin: 8, claimsMin: 32, criticalMin: 13, verifiedMin: 1, confirmedMin: 1, publicMin: 14 }
};
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
const documentation = read(DOC_PATH);
const activeProjects = Array.isArray(index) ? index.filter((item) => item.is_active !== false) : [];

if (!Array.isArray(index)) errors.push(`${INDEX_PATH}: ожидается массив`);
if (activeProjects.length !== 3) errors.push(`${INDEX_PATH}: ожидалось 3 активных объекта, найдено ${activeProjects.length}`);

for (const [projectId, expected] of Object.entries(EXPECTED)) {
  const entry = activeProjects.find((item) => item.id === projectId);
  if (!entry) {
    errors.push(`${INDEX_PATH}: отсутствует активный объект ${projectId}`);
    continue;
  }

  const projectPath = repoPath(entry.data_file);
  const project = readJson(projectPath);
  if (!project) continue;
  if (project.id !== entry.id) errors.push(`${projectPath}: id не совпадает с индексом`);
  if (project.is_public_ready !== false || entry.is_public_ready !== false) {
    errors.push(`${projectId}: до полного запуска is_public_ready должен быть false`);
  }

  const verificationPath = repoPath(entry.verification_file || project.verification_file);
  if (!verificationPath) {
    errors.push(`${projectId}: verification_file обязателен`);
    continue;
  }
  if (entry.verification_file !== project.verification_file) {
    errors.push(`${projectId}: verification_file в индексе и проекте должен совпадать`);
  }

  const verification = readJson(verificationPath);
  if (!verification) continue;
  const sources = Array.isArray(verification.sources) ? verification.sources : [];
  const claims = Array.isArray(verification.claims) ? verification.claims : [];
  const criticalClaims = claims.filter((claim) => claim.importance === "critical");
  const confirmedCritical = criticalClaims.filter((claim) => claim.verification_status === "confirmed");
  const verifiedSources = sources.filter(
    (source) => source.status === "verified" && /^https:\/\//i.test(String(source.reference || ""))
  );
  const publicClaims = claims.filter(
    (claim) => claim.verification_status === "confirmed" && claim.publication_allowed === true
  );

  if (verification.overall_status !== "requires_recheck") {
    errors.push(`${verificationPath}: overall_status должен оставаться requires_recheck`);
  }

  if (expected.sourcesMin !== undefined) {
    if (sources.length < expected.sourcesMin) errors.push(`${verificationPath}: недостаточно источников`);
    if (claims.length < expected.claimsMin) errors.push(`${verificationPath}: недостаточно claims`);
    if (criticalClaims.length < expected.criticalMin) errors.push(`${verificationPath}: недостаточно critical claims`);
    if (verifiedSources.length < expected.verifiedMin) errors.push(`${verificationPath}: недостаточно verified sources`);
    if (confirmedCritical.length < expected.confirmedMin) errors.push(`${verificationPath}: недостаточно confirmed critical claims`);
    if (publicClaims.length < expected.publicMin) errors.push(`${verificationPath}: недостаточно buyer-facing public claims`);
  } else {
    if (sources.length !== expected.sources) errors.push(`${verificationPath}: ожидалось ${expected.sources} источников`);
    if (claims.length !== expected.claims) errors.push(`${verificationPath}: ожидалось ${expected.claims} claims`);
    if (criticalClaims.length !== expected.critical) errors.push(`${verificationPath}: ожидалось ${expected.critical} critical claims`);
    if (verifiedSources.length !== expected.verified) errors.push(`${verificationPath}: неожиданный прогресс источников`);
    if (confirmedCritical.length !== expected.confirmed) errors.push(`${verificationPath}: неожиданный прогресс critical claims`);
    if (publicClaims.length !== expected.public) errors.push(`${verificationPath}: неподтверждённый объект не должен иметь public claims`);
  }

  const pageUrl = entry.portal_detail_url || entry.detail_url || project.detail_url;
  const pageFile = resolvePageFile(pageUrl);
  const html = read(pageFile);
  if (html && !html.includes('content="noindex,follow"') && !html.includes("content='noindex,follow'")) {
    errors.push(`${pageFile}: страница должна оставаться noindex,follow`);
  }
}

for (const fragment of [
  "Готово к публичной публикации: 0 из 3",
  "Требует повторной проверки: 3",
  "Требует первичных источников: 0",
  "Все три страницы сохраняют noindex,follow",
  "Подтверждённые характеристики разрешено показывать до полной готовности",
  "Подтверждённые сведения есть у 2 из 3 объектов",
  "tellermanov-sad",
  "/catalog/prostornaya-4a/",
  "Источники: 4 из 5 проверены",
  "Critical claims: 6 из 8 подтверждены",
  "Подтверждённые характеристики: 25",
  "Текущая цена и наличие не подтверждены",
  "Аэродромная 18Г",
  "Источники: 0 из 6 проверены",
  "Дом на Сенной 76",
  "Источники: 1 из 8 проверены",
  "Critical claims: 1 из 13 подтверждён",
  "Подтверждённые характеристики: 14",
  "Интервью не заменяет разрешение на ввод, ЕГРН и документы продавца"
]) {
  if (!documentation.includes(fragment)) errors.push(`${DOC_PATH}: отсутствует актуальная сводка «${fragment}»`);
}

if (documentation.includes("готово к индексации") || documentation.includes("данные полностью подтверждены")) {
  errors.push(`${DOC_PATH}: нельзя заявлять полную готовность`);
}

console.log(`Active projects checked: ${activeProjects.length}`);
console.log("Projects with confirmed buyer facts: 2");
console.log("Public-ready projects: 0");

if (errors.length) {
  console.error("\nProject readiness report validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nProject readiness report validation passed.");
