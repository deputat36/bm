import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MAIN_PATH = "assets/js/main.js";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: файл не найден`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function extractTrackingKeys(source) {
  const match = source.match(/const TRACKING_KEYS = \[([\s\S]*?)\];/);
  if (!match) return [];
  return Array.from(match[1].matchAll(/["']([^"']+)["']/g), (item) => item[1]);
}

const source = read(MAIN_PATH);
const expectedTrackingKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "gclid",
  "yclid",
  "ymclid",
  "vkclid",
  "fbclid",
  "roistat",
  "openstat",
  "realtor",
  "realtor_id",
  "manager",
  "lead_source",
  "placement"
];

const requiredFragments = [
  "const TRACKING_VALUE_MAX_LENGTH = 240;",
  "function sanitizeTrackingValue(value)",
  "function sanitizeLeadUrl(value)",
  'url.search = "";',
  'url.hash = "";',
  "function sanitizeTrackingValues(values)",
  "function sanitizeTrackingTouch(touch)",
  "first_touch: sanitizeTrackingTouch(savedRaw.first_touch)",
  "last_touch: sanitizeTrackingTouch(savedRaw.last_touch)",
  "current: sanitizeTrackingValues(savedRaw.current)",
  "page_url: sanitizeLeadUrl(window.location.href)",
  "referrer: sanitizeLeadUrl(document.referrer)",
  "data.page_url = sanitizeLeadUrl(window.location.href);",
  "data.referrer = sanitizeLeadUrl(document.referrer);",
  "delete data.user_agent;"
];

const forbiddenFragments = [
  "navigator.userAgent",
  "data.user_agent =",
  "page_url: window.location.href",
  "data.page_url = window.location.href",
  "referrer: document.referrer",
  "data.referrer = document.referrer"
];

requiredFragments.forEach((fragment) => {
  if (!source.includes(fragment)) {
    errors.push(`${MAIN_PATH}: отсутствует обязательная защита ${fragment}`);
  }
});

forbiddenFragments.forEach((fragment) => {
  if (source.includes(fragment)) {
    errors.push(`${MAIN_PATH}: найден запрещённый источник данных ${fragment}`);
  }
});

const actualTrackingKeys = extractTrackingKeys(source);
if (actualTrackingKeys.length !== expectedTrackingKeys.length) {
  errors.push(`${MAIN_PATH}: ожидается ${expectedTrackingKeys.length} разрешённых tracking-полей, найдено ${actualTrackingKeys.length}`);
}

const unexpectedKeys = actualTrackingKeys.filter((key) => !expectedTrackingKeys.includes(key));
const missingKeys = expectedTrackingKeys.filter((key) => !actualTrackingKeys.includes(key));
if (unexpectedKeys.length) {
  errors.push(`${MAIN_PATH}: найдены неразрешённые tracking-поля: ${unexpectedKeys.join(", ")}`);
}
if (missingKeys.length) {
  errors.push(`${MAIN_PATH}: отсутствуют разрешённые tracking-поля: ${missingKeys.join(", ")}`);
}

if (!/TRACKING_KEYS\.forEach\(\(key\) => \{[\s\S]*?sanitizeTrackingValue\(source\[key\]\)/.test(source)) {
  errors.push(`${MAIN_PATH}: сохранённые tracking-значения не ограничены allowlist и длиной`);
}

if (!/const pageSnapshot = \{[\s\S]*?page_url: sanitizeLeadUrl\(window\.location\.href\)[\s\S]*?referrer: sanitizeLeadUrl\(document\.referrer\)/.test(source)) {
  errors.push(`${MAIN_PATH}: снимок атрибуции должен хранить URL и referrer без query и hash`);
}

if (!/function collectFormData\(form\)[\s\S]*?data\.page_url = sanitizeLeadUrl\(window\.location\.href\);[\s\S]*?data\.referrer = sanitizeLeadUrl\(document\.referrer\);[\s\S]*?delete data\.user_agent;/.test(source)) {
  errors.push(`${MAIN_PATH}: итоговая заявка не гарантирует минимизацию URL и user_agent`);
}

console.log(`Checked lead payload privacy: ${MAIN_PATH}`);
console.log(`Allowed tracking fields: ${actualTrackingKeys.length}`);
console.log("URL policy: origin + pathname only; query and hash removed");
console.log("Browser fingerprint policy: user_agent is not collected");

if (errors.length) {
  console.error("\nLead payload privacy validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nLead payload privacy validation passed.");
