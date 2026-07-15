import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TRACKING_PATH = "assets/js/conversion-tracking.js";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: файл не найден`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

const source = read(TRACKING_PATH);

const expectedQueryKeys = [
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
  'const ATTRIBUTION_STORAGE_KEY = "newbuildsBorisoglebskTracking"',
  "const ATTRIBUTION_QUERY_KEYS = new Set([",
  "const OPAQUE_TRACKING_KEYS = new Set([",
  "function sanitizeTrackingValue(key, rawValue)",
  "function sanitizeTrackingValues(values)",
  "function sanitizeAttributionUrl(rawUrl, keepAttribution = false)",
  "function sanitizeTrackingTouch(touch)",
  "function sanitizeTrackingData(tracking)",
  "function persistSanitizedTracking(tracking)",
  "function installAttributionUrlPrivacy()",
  "EMAIL_VALUE_PATTERN.test(value)",
  "PHONE_VALUE_PATTERN.test(value)",
  "new URL(`${url.origin}${url.pathname}`)",
  "keepAttribution && url.origin === window.location.origin",
  "page_url: sanitizeAttributionUrl(source.page_url, true)",
  "referrer: sanitizeAttributionUrl(source.referrer, false)",
  "values: sanitizeTrackingValues(source.values)",
  "current: sanitizeTrackingValues(source.current)",
  "persistSanitizedTracking(sanitizeTrackingData(stored))",
  "const originalGetTrackingData = getTrackingData",
  "getTrackingData = function getPrivateTrackingData()",
  "const originalCollectFormData = collectFormData",
  "collectFormData = function collectPrivateFormData(form)",
  "data.page_url = sanitizeAttributionUrl(data.page_url, true)",
  "data.referrer = sanitizeAttributionUrl(data.referrer, false)",
  "data.tracking = sanitizeTrackingData(data.tracking)",
  "window.__NEWBUILD_ATTRIBUTION_URL_PRIVACY__ = true",
  "installAttributionUrlPrivacy();"
];

for (const fragment of requiredFragments) {
  if (!source.includes(fragment)) {
    errors.push(`${TRACKING_PATH}: отсутствует обязательный механизм: ${fragment}`);
  }
}

const allowlistMatch = source.match(/const ATTRIBUTION_QUERY_KEYS = new Set\(\[([\s\S]*?)\]\);/);
if (!allowlistMatch) {
  errors.push(`${TRACKING_PATH}: не найден allowlist параметров атрибуции`);
} else {
  const actualKeys = Array.from(allowlistMatch[1].matchAll(/"([a-z0-9_]+)"/g), (match) => match[1]);
  const missing = expectedQueryKeys.filter((key) => !actualKeys.includes(key));
  const extra = actualKeys.filter((key) => !expectedQueryKeys.includes(key));

  if (missing.length) errors.push(`${TRACKING_PATH}: в allowlist отсутствуют: ${missing.join(", ")}`);
  if (extra.length) errors.push(`${TRACKING_PATH}: в allowlist появились неразрешённые параметры: ${extra.join(", ")}`);
  if (new Set(actualKeys).size !== actualKeys.length) errors.push(`${TRACKING_PATH}: allowlist содержит дубли`);
}

const prohibitedQueryKeys = [
  "name",
  "phone",
  "tel",
  "email",
  "mail",
  "comment",
  "question",
  "message",
  "budget",
  "token",
  "secret",
  "access_key",
  "client_fixation_id",
  "consent_text",
  "user_agent",
  "lead_test",
  "analytics_test",
  "test_ack"
];

if (allowlistMatch) {
  const allowlistText = allowlistMatch[1];
  prohibitedQueryKeys.forEach((key) => {
    if (new RegExp(`"${key}"`).test(allowlistText)) {
      errors.push(`${TRACKING_PATH}: запрещённый query-параметр присутствует в allowlist: ${key}`);
    }
  });
}

const installIndex = source.indexOf("installAttributionUrlPrivacy();");
const formSetupIndex = source.indexOf("forms.forEach(ensureFormRole);");
if (installIndex === -1 || formSetupIndex === -1 || installIndex > formSetupIndex) {
  errors.push(`${TRACKING_PATH}: privacy-очистка должна устанавливаться до настройки форм`);
}

const collectBlockMatch = source.match(/collectFormData = function collectPrivateFormData\(form\) \{([\s\S]*?)\n    \};/);
if (!collectBlockMatch) {
  errors.push(`${TRACKING_PATH}: не найден приватный wrapper collectFormData`);
} else {
  const block = collectBlockMatch[1];
  ["data.name", "data.phone", "data.email", "data.comment", "data.question"].forEach((fragment) => {
    if (block.includes(fragment)) {
      errors.push(`${TRACKING_PATH}: URL privacy wrapper не должен читать контактное поле ${fragment}`);
    }
  });
}

if (/sanitized\.hash|url\.hash/.test(source)) {
  errors.push(`${TRACKING_PATH}: fragment URL не должен сохраняться в очищенной атрибуции`);
}

if (!source.includes(".slice(0, 256)")) {
  errors.push(`${TRACKING_PATH}: значения атрибуции должны иметь ограничение длины`);
}

if (errors.length) {
  console.error("\nAttribution URL privacy validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Allowed attribution query keys: ${expectedQueryKeys.length}`);
console.log("Attribution URL privacy validation passed.");