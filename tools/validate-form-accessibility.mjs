import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const QA_MATRIX_PATH = "data/qa/form-scenarios.json";
const SCHEMA_PATH = "assets/js/schema.js";
const ENHANCEMENT_PATH = "assets/js/form-accessibility.js";
const EXPECTED_FORMS = 14;
const EXPECTED_PAGES = 7;
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFormBlock(html, formId) {
  const pattern = new RegExp(`<form\\b[^>]*data-form-id=["']${escapeRegExp(formId)}["'][^>]*>[\\s\\S]*?<\\/form>`, "i");
  return html.match(pattern)?.[0] || "";
}

function findInputTag(formBlock, fieldName) {
  const pattern = new RegExp(`<input\\b(?=[^>]*\\bname=["']${escapeRegExp(fieldName)}["'])[^>]*>`, "i");
  return formBlock.match(pattern)?.[0] || "";
}

const matrix = readJson(QA_MATRIX_PATH);
const schemaScript = read(SCHEMA_PATH);
const enhancementScript = read(ENHANCEMENT_PATH);
const checkedFormIds = new Set();
const checkedPages = new Set();

if (schemaScript && !schemaScript.includes('loadPortalScript(schemaScriptUrl, "form-accessibility.js")')) {
  errors.push(`${SCHEMA_PATH}: form-accessibility.js не загружается для страниц с лид-формами`);
}

if (enhancementScript) {
  const requiredFragments = [
    'setAttribute("aria-busy"',
    'setAttribute("aria-invalid"',
    'setAttribute("aria-live", "polite")',
    'setAttribute("aria-atomic", "true")',
    'inputMode = "tel"',
    'autocomplete = "tel"',
    "const PHONE_MIN_DIGITS = 10;",
    "const PHONE_MAX_DIGITS = 15;",
    "const PHONE_MAX_LENGTH = 24;",
    "phone.pattern = PHONE_PATTERN;",
    "phone.maxLength = PHONE_MAX_LENGTH;",
    "phone.setCustomValidity",
    "phoneDigitCount(value)",
    "digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS",
    'phone.addEventListener("input"',
    'phone.addEventListener("blur"',
    "MutationObserver",
    'form.addEventListener("invalid"'
  ];

  requiredFragments.forEach((fragment) => {
    if (!enhancementScript.includes(fragment)) {
      errors.push(`${ENHANCEMENT_PATH}: отсутствует обязательный механизм ${fragment}`);
    }
  });
}

const scenarios = Array.isArray(matrix?.scenarios) ? matrix.scenarios : [];
if (matrix?.portal_id !== "newbuilds-borisoglebsk") {
  errors.push(`${QA_MATRIX_PATH}: неверный portal_id`);
}
if (scenarios.length !== EXPECTED_FORMS) {
  errors.push(`${QA_MATRIX_PATH}: ожидается ${EXPECTED_FORMS} сценариев, найдено ${scenarios.length}`);
}

for (const scenario of scenarios) {
  const formId = String(scenario.form_id || "").trim();
  const pageFile = String(scenario.page_file || "").trim();
  const label = `${pageFile || "unknown"}:${formId || "unknown"}`;

  if (!formId || !pageFile) {
    errors.push(`${QA_MATRIX_PATH}: у сценария отсутствует form_id или page_file`);
    continue;
  }
  if (checkedFormIds.has(formId)) {
    errors.push(`${QA_MATRIX_PATH}: повторяется form_id=${formId}`);
    continue;
  }
  checkedFormIds.add(formId);
  checkedPages.add(pageFile);

  const html = read(pageFile);
  if (!html) continue;
  if (!html.includes("assets/js/main.js")) {
    errors.push(`${pageFile}: страница с формой не подключает main.js`);
  }
  if (!html.includes("assets/js/schema.js")) {
    errors.push(`${pageFile}: страница с формой не подключает schema.js`);
  }

  const formBlock = findFormBlock(html, formId);
  if (!formBlock) {
    errors.push(`${label}: форма из QA-матрицы не найдена`);
    continue;
  }

  const nameInput = findInputTag(formBlock, "name");
  const phoneInput = findInputTag(formBlock, "phone");
  if (!nameInput) errors.push(`${label}: отсутствует поле имени`);
  if (!phoneInput) {
    errors.push(`${label}: отсутствует поле телефона`);
  } else if (!/\brequired(?:\s|=|>)/i.test(phoneInput)) {
    errors.push(`${label}: телефон должен быть обязательным`);
  }

  if (!/data-form-status/i.test(formBlock)) {
    errors.push(`${label}: отсутствует область статуса отправки`);
  }
  if (!/<button\b[^>]*type=["']submit["'][^>]*>/i.test(formBlock)) {
    errors.push(`${label}: отсутствует кнопка отправки`);
  }
}

if (checkedFormIds.size !== EXPECTED_FORMS) {
  errors.push(`accessibility scope: ожидается ${EXPECTED_FORMS} уникальных форм, найдено ${checkedFormIds.size}`);
}
if (checkedPages.size !== EXPECTED_PAGES) {
  errors.push(`accessibility scope: ожидается ${EXPECTED_PAGES} страниц, найдено ${checkedPages.size}`);
}

console.log(`Checked accessible lead pages: ${checkedPages.size}`);
console.log(`Checked accessible lead forms: ${checkedFormIds.size}`);
console.log("Phone digit rule: 10-15; max input length: 24");

if (errors.length) {
  console.error("\nLead form accessibility validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nLead form accessibility validation passed.");
