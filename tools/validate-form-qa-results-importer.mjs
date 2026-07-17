import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const IMPORTER_PATH = "tools/import-form-qa-results.mjs";
const FIXTURE_PATH = "tools/fixtures/form-results-empty.json";
const WORKFLOW_PATH = ".github/workflows/form-qa-results-importer.yml";
const DOC_PATH = "docs/portal/FORM_QA_RESULTS_IMPORTER.md";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: файл не найден`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const importer = read(IMPORTER_PATH);
const fixtureText = read(FIXTURE_PATH);
const workflow = read(WORKFLOW_PATH);
read(DOC_PATH);

if (importer) {
  const requiredFragments = [
    'const ALLOWED_STATUSES = new Set(["passed", "failed", "blocked"])',
    "const FORBIDDEN_KEYS = new Set([",
    'if (result.status !== "passed") return;',
    "passed требует запись в evidence-пакете",
    "обязательная проверка",
    "--replace-existing",
    "--write",
    "замена требует более нового tested_at",
    "Итого после импорта: ${plan.summary.total}/42",
    "Режим предпросмотра: реестр не изменён",
    "runSelfTest(matrix, contract, registry)"
  ];
  requiredFragments.forEach((fragment) => {
    if (!importer.includes(fragment)) errors.push(`${IMPORTER_PATH}: отсутствует механизм ${fragment}`);
  });

  ["fetch(", "XMLHttpRequest", "WEB3FORMS", "api.web3forms.com", "navigator.userAgent"].forEach((forbidden) => {
    if (importer.includes(forbidden)) errors.push(`${IMPORTER_PATH}: запрещён сетевой или идентифицирующий фрагмент ${forbidden}`);
  });
}

let fixture = null;
if (fixtureText) {
  try {
    fixture = JSON.parse(fixtureText);
  } catch (error) {
    errors.push(`${FIXTURE_PATH}: некорректный JSON: ${error.message}`);
  }
}

if (fixture) {
  if (fixture.portal_id !== "newbuilds-borisoglebsk") errors.push(`${FIXTURE_PATH}: неверный portal_id`);
  if (!Array.isArray(fixture.results) || fixture.results.length !== 0) errors.push(`${FIXTURE_PATH}: fixture должен быть пустым`);
  if (fixture.rules?.personal_data_forbidden !== true) errors.push(`${FIXTURE_PATH}: personal_data_forbidden должен быть true`);
  if (!String(fixture.purpose || "").includes("самотеста")) errors.push(`${FIXTURE_PATH}: назначение fixture не зафиксировано`);
}

if (workflow) {
  const workflowFragments = [
    "node --check tools/import-form-qa-results.mjs",
    "node --check tools/validate-form-qa-results-importer.mjs",
    "node tools/validate-form-qa-results-importer.mjs",
    "node tools/validate-form-qa-results.mjs"
  ];
  workflowFragments.forEach((fragment) => {
    if (!workflow.includes(fragment)) errors.push(`${WORKFLOW_PATH}: отсутствует шаг ${fragment}`);
  });
}

if (!errors.length && importer && fixtureText) {
  const beforeHash = hash(fixtureText);
  const run = spawnSync(process.execPath, [
    path.join(ROOT, IMPORTER_PATH),
    "--self-test",
    `--registry=${path.join(ROOT, FIXTURE_PATH)}`
  ], {
    cwd: ROOT,
    encoding: "utf8"
  });

  if (run.status !== 0) {
    errors.push(`${IMPORTER_PATH}: self-test завершился с ошибкой: ${(run.stderr || run.stdout).trim()}`);
  } else if (!String(run.stdout || "").includes("self-test passed")) {
    errors.push(`${IMPORTER_PATH}: self-test не подтвердил успешное выполнение`);
  }

  const afterHash = hash(fs.readFileSync(path.join(ROOT, FIXTURE_PATH), "utf8"));
  if (beforeHash !== afterHash) errors.push(`${IMPORTER_PATH}: self-test изменил fixture без --write`);
}

console.log("Checked form QA results importer contract.");
console.log("Expected matrix: 14 scenarios × 3 devices = 42 slots.");
console.log("Default mode: preview only; explicit --write required.");

if (errors.length) {
  console.error("\nForm QA results importer validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Form QA results importer validation passed.");
