import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = "data/projects/index.json";
const DOC_PATH = "docs/portal/PROJECT_VERIFICATION_READINESS.md";
const EXPECTED = {
  "tellermanov-sad": { sources: 3, claims: 23, critical: 14 },
  "aerodromnaya-18g": { sources: 6, claims: 13, critical: 8 },
  "sennaya-76": { sources: 7, claims: 19, critical: 13 }
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
if (activeProjects.length !== 3) {
  errors.push(`${INDEX_PATH}: ожидалось 3 активных объекта, найдено ${activeProjects.length}`);
}

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
    errors.push(`${projectId}: до подтверждения источников is_public_ready должен быть false`);
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
  const verifiedSources = sources.filter((source) => source.status === "verified" && String(source.reference || "").trim());

  if (verification.overall_status !== "requires_recheck") {
    errors.push(`${verificationPath}: текущий overall_status должен быть requires_recheck`);
  }
  if (sources.length !== expected.sources) {
    errors.push(`${verificationPath}: ожидалось ${expected.sources} источников, найдено ${sources.length}`);
  }
  if (claims.length !== expected.claims) {
    errors.push(`${verificationPath}: ожидалось ${expected.claims} claims, найдено ${claims.length}`);
  }
  if (criticalClaims.length !== expected.critical) {
    errors.push(`${verificationPath}: ожидалось ${expected.critical} critical claims, найдено ${criticalClaims.length}`);
  }
  if (confirmedCritical.length !== 0) {
    errors.push(`${verificationPath}: документация должна быть обновлена при подтверждении critical claims`);
  }
  if (verifiedSources.length !== 0) {
    errors.push(`${verificationPath}: документация должна быть обновлена при появлении verified source`);
  }
  if (claims.some((claim) => claim.publication_allowed !== false)) {
    errors.push(`${verificationPath}: до готовности все claims должны иметь publication_allowed=false`);
  }

  const pageUrl = entry.portal_detail_url || entry.detail_url || project.detail_url;
  const pageFile = resolvePageFile(pageUrl);
  const html = read(pageFile);
  if (html && !html.includes('content="noindex,follow"') && !html.includes("content='noindex,follow'")) {
    errors.push(`${pageFile}: страница должна оставаться noindex,follow`);
  }

  const requiredFragments = [
    projectId,
    pageUrl,
    `Источники: 0 из ${expected.sources} проверены`,
    `Critical claims: 0 из ${expected.critical} подтверждены`,
    `Всего claims: ${expected.claims}`
  ];
  for (const fragment of requiredFragments) {
    if (!documentation.includes(fragment)) {
      errors.push(`${DOC_PATH}: отсутствует актуальная сводка «${fragment}»`);
    }
  }
}

for (const fragment of [
  "Готово к публичной публикации: 0 из 3",
  "Требует повторной проверки: 3",
  "Требует первичных источников: 0",
  "Все три страницы сохраняют noindex,follow"
]) {
  if (!documentation.includes(fragment)) errors.push(`${DOC_PATH}: отсутствует «${fragment}»`);
}

if (documentation.includes("verification_file отсутствует")) {
  errors.push(`${DOC_PATH}: отчёт не должен утверждать отсутствие verification-файлов`);
}
if (documentation.includes("готово к индексации") || documentation.includes("данные полностью подтверждены")) {
  errors.push(`${DOC_PATH}: нельзя заявлять готовность до появления подтверждённых источников`);
}

console.log(`Active projects checked: ${activeProjects.length}`);
console.log("Canonical verification profiles checked: 3");
console.log("Public-ready projects: 0");

if (errors.length) {
  console.error("\nProject readiness report validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nProject readiness report validation passed.");