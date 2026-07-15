import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCHEMA_PATH = "assets/js/schema.js";
const THANK_YOU_PATH = "spasibo/index.html";
const PAGE_INDEX_PATH = "data/pages/index.json";
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

function extractObject(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) return "";

  const start = source.indexOf("{", markerIndex);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  return "";
}

const schema = read(SCHEMA_PATH);
const thankYou = read(THANK_YOU_PATH);
const pages = readJson(PAGE_INDEX_PATH);

const requiredSchemaFragments = [
  'params.get("lead_test") === "dry-run"',
  'params.get("test_ack") === "1"',
  'event.stopImmediatePropagation()',
  'addEventListener("submit"',
  '}, true);',
  'newbuildsBorisoglebskLeadDryRuns',
  'newbuildsBorisoglebskLastLead',
  'payload.dry_run = true',
  'payload.delivery_status = "not_sent"',
  'const evidence = {',
  'personal_data_stored: false',
  'field_presence: {',
  'records.push(evidence)',
  'records.slice(-20)',
  'new CustomEvent("newbuildLeadDryRun", { detail: evidence })',
  'page_path: window.location.pathname',
  'newbuildLeadDryRun',
  'NB-TEST-',
  'ТЕСТОВЫЙ РЕЖИМ — данные не отправляются',
  'Данные не отправлены и не сохранены',
  'thankYouUrl.searchParams.set("dry_run", "1")',
  'thankYouUrl.searchParams.set("analytics_test", "debug")',
  'thankYouUrl.searchParams.set("lead_test", "dry-run")'
];

for (const fragment of requiredSchemaFragments) {
  if (!schema.includes(fragment)) {
    errors.push(`${SCHEMA_PATH}: отсутствует обязательный механизм dry-run: ${fragment}`);
  }
}

if (/enableLeadDryRunMode[\s\S]*?fetch\s*\(/.test(schema)) {
  errors.push(`${SCHEMA_PATH}: dry-run не должен выполнять сетевые fetch-запросы`);
}

if (schema.includes("records.push(payload)")) {
  errors.push(`${SCHEMA_PATH}: полный payload не должен сохраняться в dry-run журнале`);
}

if (schema.includes('new CustomEvent("newbuildLeadDryRun", { detail: payload })')) {
  errors.push(`${SCHEMA_PATH}: полный payload не должен передаваться во внутреннее dry-run событие`);
}

const evidenceObject = extractObject(schema, "const evidence =");
if (!evidenceObject) {
  errors.push(`${SCHEMA_PATH}: не удалось выделить объект evidence`);
} else {
  const requiredEvidenceFields = [
    "client_fixation_id",
    "lead_type",
    "form_id",
    "project_id",
    "project_name",
    "residential_complex",
    "residential_complex_id",
    "lead_source",
    "placement",
    "created_at",
    "page_path",
    "dry_run",
    "delivery_status",
    "personal_data_stored",
    "field_presence"
  ];

  for (const field of requiredEvidenceFields) {
    if (!new RegExp(`\\b${field}\\s*:`).test(evidenceObject)) {
      errors.push(`${SCHEMA_PATH}: evidence не содержит поле ${field}`);
    }
  }

  const prohibitedDirectValues = [
    "name: payload.name",
    "phone: payload.phone",
    "email: payload.email",
    "budget: payload.budget",
    "comment: payload.comment",
    "question: payload.question",
    "page_url: payload.page_url",
    "tracking: payload.tracking"
  ];

  for (const fragment of prohibitedDirectValues) {
    if (evidenceObject.includes(fragment)) {
      errors.push(`${SCHEMA_PATH}: evidence сохраняет исходное значение: ${fragment}`);
    }
  }

  const requiredPresenceFlags = [
    "name: Boolean(payload.name)",
    "phone: Boolean(payload.phone)",
    "interest: Boolean(payload.interest || payload.room_type)",
    "purchase_method: Boolean(payload.purchase_method || payload.mortgage_program)",
    "timeline: Boolean(payload.timeline || payload.purchase_timeline)",
    "comment: Boolean(payload.comment || payload.question)",
    'consent: payload.consent === "yes"'
  ];

  for (const fragment of requiredPresenceFlags) {
    if (!evidenceObject.includes(fragment)) {
      errors.push(`${SCHEMA_PATH}: отсутствует безопасный признак заполнения: ${fragment}`);
    }
  }
}

const requiredThankYouFragments = [
  'const isDryRun = params.get("dry_run") === "1"',
  'document.body.dataset.leadTestMode = "dry-run"',
  'Тестовая заявка обработана локально',
  'Данные не отправлялись в Web3Forms, CRM, email или аналитику',
  'ID начинается с NB-TEST',
  'lead_test=dry-run&test_ack=1',
  'lead_test=dry-run&analytics_test=debug&test_ack=1',
  'if (isAnalyticsDebug) emitAnalyticsEvent(thankYouPayload);',
  'return;'
];

for (const fragment of requiredThankYouFragments) {
  if (!thankYou.includes(fragment)) {
    errors.push(`${THANK_YOU_PATH}: отсутствует обязательная обработка dry-run: ${fragment}`);
  }
}

const dryRunBlockIndex = thankYou.indexOf("if (isDryRun) {");
const normalAnalyticsIndex = thankYou.indexOf("emitAnalyticsEvent(thankYouPayload, {", dryRunBlockIndex);
if (dryRunBlockIndex === -1 || normalAnalyticsIndex === -1 || dryRunBlockIndex > normalAnalyticsIndex) {
  errors.push(`${THANK_YOU_PATH}: dry-run должен завершаться до обычной аналитики`);
} else {
  const dryRunBlock = thankYou.slice(dryRunBlockIndex, normalAnalyticsIndex);
  if (!dryRunBlock.includes("return;")) {
    errors.push(`${THANK_YOU_PATH}: dry-run должен завершаться return до обычной аналитики`);
  }
  if (dryRunBlock.includes("dataLayer.push") || dryRunBlock.includes('gtag("event"')) {
    errors.push(`${THANK_YOU_PATH}: dry-run не должен напрямую вызывать внешнюю аналитику`);
  }
}

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

    const forms = html.match(/<form\b[^>]*data-lead-form[^>]*>/gi) || [];
    if (!forms.length) continue;

    checkedPages += 1;
    checkedForms += forms.length;

    const mainIndex = html.indexOf("assets/js/main.js");
    const schemaIndex = html.indexOf("assets/js/schema.js");

    if (mainIndex === -1) {
      errors.push(`${file}: страница с формой не подключает main.js`);
    }
    if (schemaIndex === -1) {
      errors.push(`${file}: страница с формой не подключает schema.js`);
    }
    if (mainIndex !== -1 && schemaIndex !== -1 && mainIndex > schemaIndex) {
      errors.push(`${file}: main.js должен загружаться раньше schema.js для безопасного dry-run`);
    }

    if (html.includes("lead_test=dry-run") || html.includes("analytics_test=debug") || html.includes("test_ack=1")) {
      errors.push(`${file}: тестовый режим не должен быть включён ссылкой в публичном контенте`);
    }
  }
}

console.log(`Checked dry-run lead pages: ${checkedPages}`);
console.log(`Checked dry-run lead forms: ${checkedForms}`);

if (errors.length) {
  console.error("\nLead dry-run validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nLead dry-run validation passed with sanitized local evidence.");
