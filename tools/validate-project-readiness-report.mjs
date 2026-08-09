import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const INDEX_PATH = "data/projects/index.json";
const CONTRACT_PATH = "data/verification/profile-contract.json";
const DOC_PATH = "docs/portal/PROJECT_VERIFICATION_READINESS.md";
const REPORT_SCRIPT = "tools/build-project-readiness-report.mjs";
const EXPECTED = {
  "tellermanov-sad": { sourcesMin: 5, claimsMin: 30, criticalMin: 8, verifiedMin: 4, confirmedMin: 6, publicMin: 21 },
  "aerodromnaya-18g": { sourcesMin: 9, claimsMin: 23, criticalMin: 8, verifiedMin: 3, confirmedMin: 1, publicMin: 10 },
  "sennaya-76": { sourcesMin: 8, claimsMin: 32, criticalMin: 13, verifiedMin: 1, confirmedMin: 1, publicMin: 14 }
};
const EXPECTED_IDS = new Set(Object.keys(EXPECTED));
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

function buildReport() {
  try {
    const output = execFileSync(process.execPath, [REPORT_SCRIPT, "--format=json"], {
      cwd: ROOT,
      encoding: "utf8"
    });
    return JSON.parse(output);
  } catch (error) {
    errors.push(`${REPORT_SCRIPT}: невозможно построить JSON report: ${error.message}`);
    return null;
  }
}

const index = readJson(INDEX_PATH);
const contract = readJson(CONTRACT_PATH);
const documentation = read(DOC_PATH);
const activeProjects = Array.isArray(index) ? index.filter((item) => item.is_active !== false) : [];
const allowedOverallStatuses = new Set(contract?.allowed_overall_statuses || []);

if (!Array.isArray(index)) errors.push(`${INDEX_PATH}: ожидается массив`);
if (activeProjects.length !== EXPECTED_IDS.size) {
  errors.push(`${INDEX_PATH}: ожидалось ${EXPECTED_IDS.size} активных приоритетных объекта, найдено ${activeProjects.length}`);
}
const actualIds = new Set(activeProjects.map((item) => item.id));
for (const id of EXPECTED_IDS) {
  if (!actualIds.has(id)) errors.push(`${INDEX_PATH}: отсутствует активный объект ${id}`);
}
for (const id of actualIds) {
  if (!EXPECTED_IDS.has(id)) errors.push(`${INDEX_PATH}: неожиданный активный приоритетный объект ${id}`);
}
if (contract?.rules?.public_ready_requires_all_critical_claims_confirmed !== true) {
  errors.push(`${CONTRACT_PATH}: public_ready_requires_all_critical_claims_confirmed должен быть true`);
}
if (contract?.rules?.unconfirmed_project_page_must_be_noindex !== true) {
  errors.push(`${CONTRACT_PATH}: unconfirmed_project_page_must_be_noindex должен быть true`);
}

for (const [projectId, expected] of Object.entries(EXPECTED)) {
  const entry = activeProjects.find((item) => item.id === projectId);
  if (!entry) continue;

  const projectPath = repoPath(entry.data_file);
  const project = readJson(projectPath);
  if (!project) continue;
  if (project.id !== entry.id) errors.push(`${projectPath}: id не совпадает с индексом`);
  if (Boolean(project.is_public_ready) !== Boolean(entry.is_public_ready)) {
    errors.push(`${projectId}: is_public_ready в index и project profile должен совпадать`);
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
  if (!allowedOverallStatuses.has(verification.overall_status)) {
    errors.push(`${verificationPath}: неподдерживаемый overall_status=${verification.overall_status}`);
  }

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
  const neededSources = Array.isArray(project.needed_sources) ? project.needed_sources : [];

  if (sources.length < expected.sourcesMin) errors.push(`${verificationPath}: недостаточно источников`);
  if (claims.length < expected.claimsMin) errors.push(`${verificationPath}: недостаточно claims`);
  if (criticalClaims.length < expected.criticalMin) errors.push(`${verificationPath}: недостаточно critical claims`);
  if (verifiedSources.length < expected.verifiedMin) errors.push(`${verificationPath}: недостаточно verified sources`);
  if (confirmedCritical.length < expected.confirmedMin) errors.push(`${verificationPath}: недостаточно confirmed critical claims`);
  if (publicClaims.length < expected.publicMin) errors.push(`${verificationPath}: недостаточно buyer-facing public claims`);

  for (const claim of publicClaims) {
    const allVerified = (claim.source_ids || []).every((sourceId) => {
      const source = sources.find((item) => item.id === sourceId);
      return source?.status === "verified" && /^https:\/\//i.test(String(source.reference || ""));
    });
    if (!allVerified) errors.push(`${verificationPath}:${claim.field}: public claim требует verified HTTPS-источники`);
  }

  if (project.is_public_ready) {
    if (verification.overall_status !== "confirmed") {
      errors.push(`${projectId}: public-ready объект требует verification.overall_status=confirmed`);
    }
    if (confirmedCritical.length !== criticalClaims.length) {
      errors.push(`${projectId}: public-ready объект требует подтверждения всех critical claims`);
    }
    if (neededSources.length) {
      errors.push(`${projectId}: public-ready объект не может содержать needed_sources`);
    }
  }

  const pageUrl = entry.portal_detail_url || entry.detail_url || project.detail_url;
  const pageFile = resolvePageFile(pageUrl);
  const html = read(pageFile);
  const pageNoindex = html.includes('content="noindex,follow"') || html.includes("content='noindex,follow'");
  if (!project.is_public_ready && html && !pageNoindex) {
    errors.push(`${pageFile}: непубличный объект должен оставаться noindex,follow`);
  }
}

const report = buildReport();
if (report) {
  const rows = Array.isArray(report.projects) ? report.projects : [];
  const summary = report.summary || {};
  if (rows.length !== activeProjects.length) errors.push(`${REPORT_SCRIPT}: число project rows не совпадает с active projects`);
  if (Number(summary.total_projects) !== activeProjects.length) errors.push(`${REPORT_SCRIPT}: total_projects mismatch`);
  const statusTotal = Number(summary.public_ready || 0)
    + Number(summary.requires_recheck || 0)
    + Number(summary.requires_sources || 0);
  if (statusTotal !== activeProjects.length) errors.push(`${REPORT_SCRIPT}: readiness status counts must equal total projects`);
  if (Number(summary.projects_with_noindex || 0) < activeProjects.filter((item) => item.is_public_ready !== true).length) {
    errors.push(`${REPORT_SCRIPT}: все непубличные объекты должны оставаться noindex`);
  }
  for (const row of rows) {
    const entry = activeProjects.find((item) => item.id === row.project_id);
    if (!entry) {
      errors.push(`${REPORT_SCRIPT}: неизвестный project row ${row.project_id}`);
      continue;
    }
    const expectedStatus = entry.is_public_ready === true ? "public_ready" : "requires_recheck";
    if (row.readiness_status !== expectedStatus) {
      errors.push(`${REPORT_SCRIPT}:${row.project_id}: expected readiness_status=${expectedStatus}, found ${row.readiness_status}`);
    }
  }
}

for (const fragment of [
  "Дата проверки: 2026-07-18",
  "Подтверждённые характеристики разрешено показывать до полной готовности",
  "Статус `verified` у источника означает, что проверено содержание конкретной публикации",
  "Это не открывает индексацию, массовую рекламу или публикацию изменяемого предложения",
  "tellermanov-sad",
  "/catalog/prostornaya-4a/",
  "ЖК «Патриот» на Аэродромной 18Г",
  "Дом на Сенной 76",
  "Интервью не заменяет разрешение на ввод, ЕГРН и документы продавца",
  "После принятия нового источника необходимо одновременно обновить"
]) {
  if (!documentation.includes(fragment)) errors.push(`${DOC_PATH}: отсутствует обязательный policy fragment «${fragment}»`);
}
if (!documentation.includes("исторический снимок") && !documentation.includes("снимок состояния")) {
  errors.push(`${DOC_PATH}: документ должен явно маркироваться как датированный снимок, а не текущий source of truth`);
}
if (documentation.includes("готово к индексации") || documentation.includes("данные полностью подтверждены")) {
  errors.push(`${DOC_PATH}: нельзя заявлять полную готовность`);
}

const publicReadyCount = activeProjects.filter((item) => item.is_public_ready === true).length;
console.log(`Active projects checked: ${activeProjects.length}`);
console.log(`Public-ready projects: ${publicReadyCount}`);
console.log(`Noindex-required projects: ${activeProjects.length - publicReadyCount}`);

if (errors.length) {
  console.error("\nProject readiness report validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nProject readiness report validation passed.");
