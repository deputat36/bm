import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PAGE_INDEX_PATH = "data/pages/index.json";
const MAIN_SCRIPT_PATH = "assets/js/main.js";
const SCHEMA_SCRIPT_PATH = "assets/js/schema.js";
const errors = [];

const ACTIVE_STATUSES = new Set(["ready", "published"]);
const LEGACY_SINGLE_PROJECT_COMPLEX = "ЖК Теллерманов сад";
const NEUTRAL_COMPLEX = "Общий подбор новостройки";

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

function resolvePageFile(url) {
  const clean = String(url || "").replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? `${clean}/index.html` : "index.html";
}

function getForms(html) {
  return html.match(/<form\b[^>]*data-lead-form[^>]*>/gi) || [];
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`${name}=["']([^"']*)["']`, "i");
  return tag.match(pattern)?.[1]?.trim() || "";
}

const pages = readJson(PAGE_INDEX_PATH);
const mainScript = read(MAIN_SCRIPT_PATH);
const schemaScript = read(SCHEMA_SCRIPT_PATH);
const formIds = new Map();
let checkedPages = 0;
let checkedForms = 0;

if (!Array.isArray(pages)) {
  errors.push(`${PAGE_INDEX_PATH}: ожидается массив страниц`);
} else {
  for (const page of pages) {
    if (!ACTIVE_STATUSES.has(page.status)) continue;

    const file = resolvePageFile(page.url);
    const html = read(file);
    if (!html) continue;

    checkedPages += 1;
    const forms = getForms(html);

    for (const form of forms) {
      checkedForms += 1;
      const formId = getAttribute(form, "data-form-id");
      const projectId = getAttribute(form, "data-project-id");
      const projectName = getAttribute(form, "data-project-name");
      const leadType = getAttribute(form, "data-lead-type");
      const complex = getAttribute(form, "data-complex");
      const label = `${file}:${formId || `form-${checkedForms}`}`;

      if (!formId) errors.push(`${label}: отсутствует data-form-id`);
      if (!leadType) errors.push(`${label}: отсутствует data-lead-type`);
      if (projectId !== "newbuilds-borisoglebsk") {
        errors.push(`${label}: data-project-id должен быть newbuilds-borisoglebsk`);
      }
      if (!projectName) errors.push(`${label}: отсутствует data-project-name`);
      if (!complex) {
        errors.push(`${label}: активная форма не должна использовать defaultComplex из main.js`);
      }
      if (complex === LEGACY_SINGLE_PROJECT_COMPLEX) {
        errors.push(`${label}: активная форма использует legacy-привязку к одному ЖК`);
      }

      if (formId) {
        if (formIds.has(formId)) {
          errors.push(`${label}: form_id уже используется в ${formIds.get(formId)}`);
        } else {
          formIds.set(formId, file);
        }
      }
    }

    if (forms.length > 0 && !html.includes("assets/js/main.js")) {
      errors.push(`${file}: активная страница с формой не подключает main.js`);
    }

    if (forms.length > 0 && !html.includes("assets/js/schema.js")) {
      errors.push(`${file}: активная страница с формой не подключает schema.js с runtime-защитой`);
    }
  }
}

if (mainScript) {
  if (!mainScript.includes("SITE_CONFIG.defaultComplex")) {
    errors.push(`${MAIN_SCRIPT_PATH}: ожидаемый механизм резервного значения не найден`);
  }

  if (!mainScript.includes("form.dataset.complex || SITE_CONFIG.defaultComplex")) {
    errors.push(`${MAIN_SCRIPT_PATH}: изменилась логика резервного объекта; требуется повторный аудит форм`);
  }
}

if (schemaScript) {
  const requiredGuardFragments = [
    "function neutralizeLegacyLeadFallback()",
    `const neutralComplex = "${NEUTRAL_COMPLEX}"`,
    `const legacyComplex = "${LEGACY_SINGLE_PROJECT_COMPLEX}"`,
    "SITE_CONFIG.defaultComplex = neutralComplex",
    "complexField.value = neutralComplex",
    "neutralizeLegacyLeadFallback();"
  ];

  for (const fragment of requiredGuardFragments) {
    if (!schemaScript.includes(fragment)) {
      errors.push(`${SCHEMA_SCRIPT_PATH}: отсутствует runtime-защита резервного объекта — ${fragment}`);
    }
  }
}

const legacyFormPage = read("zayavka/index.html");
if (/data-lead-form/i.test(legacyFormPage)) {
  errors.push("zayavka/index.html: переходная страница не должна содержать лид-формы");
}

console.log(`Checked active pages: ${checkedPages}`);
console.log(`Checked active lead forms: ${checkedForms}`);

if (errors.length) {
  console.error("\nActive lead form scope validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nActive lead form scope validation passed.");
