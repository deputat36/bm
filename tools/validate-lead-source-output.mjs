import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MAIN_PATH = "assets/js/main.js";
const MOBILE_PATH = "assets/js/mobile-lead-bar.js";
const TRACKING_PATH = "assets/js/conversion-tracking.js";
const REGISTRY_PATH = "data/analytics/events.json";
const ENDPOINT = "https://ofewxuqfjhamgerwzull.supabase.co/functions/v1/newbuild-lead";
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
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    errors.push(`${relativePath}: некорректный JSON: ${error.message}`);
    return null;
  }
}

function requireFragments(source, sourcePath, fragments) {
  fragments.forEach((fragment) => {
    if (!source.includes(fragment)) errors.push(`${sourcePath}: отсутствует фрагмент ${fragment}`);
  });
}

function forbidFragments(source, sourcePath, fragments) {
  fragments.forEach((fragment) => {
    if (source.includes(fragment)) errors.push(`${sourcePath}: найден устаревший транспорт ${fragment}`);
  });
}

const main = read(MAIN_PATH);
const mobile = read(MOBILE_PATH);
const tracking = read(TRACKING_PATH);
const registry = readJson(REGISTRY_PATH);

requireFragments(main, MAIN_PATH, [
  'LEAD_ENDPOINT: "' + ENDPOINT + '"',
  'data.lead_source = data.lead_source || data.tracking?.current?.lead_source || "";',
  'data.placement = data.placement || data.tracking?.current?.placement || "";',
  'lead_source: data.lead_source || ""',
  'placement: data.placement || ""',
  'body: JSON.stringify(data)',
  'return sendCustomLead(data);'
]);

forbidFragments(main, MAIN_PATH, [
  "leadToReadableText",
  "sendWeb3FormsLead",
  "api.web3forms.com",
  "Promise.allSettled",
  "fields_json:"
]);

requireFragments(mobile, MOBILE_PATH, [
  "enableInternalLeadIdPrivacy",
  "window.__NEWBUILD_INTERNAL_LEAD_ID_PRIVACY__ = true",
  'event: "lead_submit"',
  'lead_source: data.lead_source || ""',
  'placement: data.placement || ""',
  "data-mobile-lead-bar"
]);

forbidFragments(mobile, MOBILE_PATH, [
  "enablePrimaryLeadDelivery",
  "sendLeadWithPrimaryStorage",
  "sendWeb3FormsLead",
  "SITE_CONFIG.LEAD_ENDPOINT =",
  "email_copy_sent",
  "__NEWBUILD_PRIMARY_LEAD_DELIVERY__"
]);

requireFragments(tracking, TRACKING_PATH, [
  'sendConversionEvent("lead_submit_classified"',
  'lead_source: detail.lead_source || ""',
  'placement: detail.placement || ""'
]);

const submitEvent = registry?.events?.find((event) => event.id === "lead_submit");
const classifiedEvent = registry?.events?.find((event) => event.id === "lead_submit_classified");
for (const [label, event] of [["lead_submit", submitEvent], ["lead_submit_classified", classifiedEvent]]) {
  if (!event) {
    errors.push(`${REGISTRY_PATH}: отсутствует ${label}`);
    continue;
  }
  ["lead_source", "placement"].forEach((field) => {
    if (!event.optional_fields?.includes(field)) errors.push(`${REGISTRY_PATH}:${label}: нет ${field}`);
  });
  if (event.contains_personal_data !== false) errors.push(`${REGISTRY_PATH}:${label}: техническая атрибуция не должна содержать персональные данные`);
}

const prohibited = new Set(registry?.rules?.prohibited_fields || []);
["lead_source", "placement"].forEach((field) => {
  if (prohibited.has(field)) errors.push(`${REGISTRY_PATH}: ${field} ошибочно запрещён`);
});

const forbiddenBindings = [
  /lead_source\s*:\s*data\.(name|phone|email|comment|question)/,
  /placement\s*:\s*data\.(name|phone|email|comment|question)/,
  /data\.lead_source\s*=\s*data\.(name|phone|email|comment|question)/,
  /data\.placement\s*=\s*data\.(name|phone|email|comment|question)/
];
forbiddenBindings.forEach((pattern) => {
  if (pattern.test(main) || pattern.test(tracking) || pattern.test(mobile)) errors.push(`Техническая атрибуция связана с персональными полями: ${pattern}`);
});

const collectStart = main.indexOf("function collectFormData(form)");
const sendStart = main.indexOf("async function sendCustomLead(data)");
const collectBlock = collectStart >= 0 && sendStart > collectStart ? main.slice(collectStart, sendStart) : "";
if (!collectBlock.includes("data.lead_source") || !collectBlock.includes("data.placement")) {
  errors.push(`${MAIN_PATH}: источник и размещение должны добавляться до серверной отправки`);
}

console.log("Lead source and placement preserved in the primary server JSON payload");
console.log("Mobile bar transport override removed");
console.log("Browser email duplication and readable email formatter removed");

if (errors.length) {
  console.error("\nLead source output validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Lead source output validation passed.");
