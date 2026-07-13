import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PAGE_INDEX_PATH = "data/pages/index.json";
const SCHEMA_PATH = "assets/js/schema.js";
const ENHANCEMENT_PATH = "assets/js/form-accessibility.js";
const ACTIVE_STATUSES = new Set(["ready", "published"]);
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

function resolvePageFile(url) {
  const clean = String(url || "").replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? `${clean}/index.html` : "index.html";
}

function getFormBlocks(html) {
  return html.match(/<form\b[^>]*data-lead-form[^>]*>[\s\S]*?<\/form>/gi) || [];
}

const pages = readJson(PAGE_INDEX_PATH);
const schemaScript = read(SCHEMA_PATH);
const enhancementScript = read(ENHANCEMENT_PATH);
let checkedPages = 0;
let checkedForms = 0;

if (schemaScript) {
  if (!schemaScript.includes('loadPortalScript(schemaScriptUrl, "form-accessibility.js")')) {
    errors.push(`${SCHEMA_PATH}: form-accessibility.js не загружается для страниц с лид-формами`);
  }
}

if (enhancementScript) {
  const requiredFragments = [
    'setAttribute("aria-busy"',
    'setAttribute("aria-invalid"',
    'setAttribute("aria-live", "polite")',
    'setAttribute("aria-atomic", "true")',
    'inputMode = "tel"',
    'MutationObserver',
    'form.addEventListener("invalid"'
  ];

  for (const fragment of requiredFragments) {
    if (!enhancementScript.includes(fragment)) {
      errors.push(`${ENHANCEMENT_PATH}: отсутствует обязательный механизм ${fragment}`);
    }
  }
}

if (!Array.isArray(pages)) {
  errors.push(`${PAGE_INDEX_PATH}: ожидается массив страниц`);
} else {
  for (const page of pages) {
    if (!ACTIVE_STATUSES.has(page.status)) continue;

    const file = resolvePageFile(page.url);
    const html = read(file);
    if (!html) continue;

    const forms = getFormBlocks(html);
    if (!forms.length) continue;

    checkedPages += 1;

    if (!html.includes("assets/js/main.js")) {
      errors.push(`${file}: страница с формой не подключает main.js`);
    }

    if (!html.includes("assets/js/schema.js")) {
      errors.push(`${file}: страница с формой не подключает schema.js и доступные улучшения`);
    }

    forms.forEach((form, index) => {
      checkedForms += 1;
      const label = `${file}:form-${index + 1}`;

      if (!/<input\b[^>]*name=["']name["'][^>]*>/i.test(form)) {
        errors.push(`${label}: отсутствует поле имени`);
      }

      if (!/<input\b[^>]*name=["']phone["'][^>]*>/i.test(form)) {
        errors.push(`${label}: отсутствует поле телефона`);
      }

      if (!/data-form-status/i.test(form)) {
        errors.push(`${label}: отсутствует область статуса отправки`);
      }

      if (!/<button\b[^>]*type=["']submit["'][^>]*>/i.test(form)) {
        errors.push(`${label}: отсутствует кнопка отправки`);
      }
    });
  }
}

console.log(`Checked accessible lead pages: ${checkedPages}`);
console.log(`Checked accessible lead forms: ${checkedForms}`);

if (errors.length) {
  console.error("\nLead form accessibility validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nLead form accessibility validation passed.");
