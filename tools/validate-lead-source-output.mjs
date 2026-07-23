import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MAIN_PATH = "assets/js/main.js";
const DELIVERY_RUNTIME_PATH = "assets/js/mobile-lead-bar.js";
const TRACKING_PATH = "assets/js/conversion-tracking.js";
const REGISTRY_PATH = "data/analytics/events.json";
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

function requireFragments(source, sourcePath, fragments) {
  fragments.forEach((fragment) => {
    if (!source.includes(fragment)) {
      errors.push(`${sourcePath}: отсутствует фрагмент ${fragment}`);
    }
  });
}

const main = read(MAIN_PATH);
const deliveryRuntime = read(DELIVERY_RUNTIME_PATH);
const tracking = read(TRACKING_PATH);
const registry = readJson(REGISTRY_PATH);

requireFragments(main, MAIN_PATH, [
  '"lead_source"',
  '"placement"',
  'data.lead_source = data.lead_source || data.tracking?.current?.lead_source || "";',
  'data.placement = data.placement || data.tracking?.current?.placement || "";',
  '`Внутренний источник: ${data.lead_source || ""}`',
  '`Размещение перехода: ${data.placement || ""}`',
  'lead_source: data.lead_source || ""',
  'placement: data.placement || ""',
  'tracking: JSON.stringify(data.tracking || {})'
]);

const web3FormsStart = main.indexOf("async function sendWeb3FormsLead");
const customLeadStart = main.indexOf("async function sendCustomLead");
const web3FormsBlock = web3FormsStart >= 0 && customLeadStart > web3FormsStart
  ? main.slice(web3FormsStart, customLeadStart)
  : "";
if (!web3FormsBlock) {
  errors.push(`${MAIN_PATH}: не найден блок sendWeb3FormsLead`);
} else {
  [
    'lead_source: data.lead_source || ""',
    'placement: data.placement || ""',
    'message: leadToReadableText(data)'
  ].forEach((fragment) => {
    if (!web3FormsBlock.includes(fragment)) {
      errors.push(`${MAIN_PATH}: Web3Forms payload не содержит ${fragment}`);
    }
  });
}

requireFragments(deliveryRuntime, DELIVERY_RUNTIME_PATH, [
  'SITE_CONFIG.LEAD_ENDPOINT = "https://ofewxuqfjhamgerwzull.supabase.co/functions/v1/newbuild-lead";',
  'sendLead = async function sendLeadWithPrimaryStorage(data)',
  'primaryResult = await sendCustomLead(data);',
  'if (!primaryResult || primaryResult.success === false)',
  'await sendWeb3FormsLead(data);',
  'throw primaryError;',
  'primary_destination: "supabase_newbuild_leads"',
  'window.__NEWBUILD_PRIMARY_LEAD_DELIVERY__ = true'
]);

const primaryDeliveryStart = deliveryRuntime.indexOf("sendLead = async function sendLeadWithPrimaryStorage");
const primaryCallIndex = deliveryRuntime.indexOf("primaryResult = await sendCustomLead(data);", primaryDeliveryStart);
const normalEmailCopyIndex = deliveryRuntime.indexOf("let emailCopySent = false;", primaryDeliveryStart);
if (primaryDeliveryStart < 0 || primaryCallIndex < 0 || normalEmailCopyIndex < 0 || primaryCallIndex > normalEmailCopyIndex) {
  errors.push(`${DELIVERY_RUNTIME_PATH}: основной Supabase-контур должен завершаться до обычной email-копии`);
}

if (!deliveryRuntime.includes("catch (primaryError)")) {
  errors.push(`${DELIVERY_RUNTIME_PATH}: отсутствует отдельная обработка отказа основного контура`);
}

const submitStart = main.indexOf("function trackLeadEvent");
const thankYouStart = main.indexOf("function buildThankYouUrl");
const submitBlock = submitStart >= 0 && thankYouStart > submitStart
  ? main.slice(submitStart, thankYouStart)
  : "";
if (!submitBlock) {
  errors.push(`${MAIN_PATH}: не найден блок trackLeadEvent`);
} else {
  [
    'event: "lead_submit"',
    'lead_source: data.lead_source || ""',
    'placement: data.placement || ""'
  ].forEach((fragment) => {
    if (!submitBlock.includes(fragment)) {
      errors.push(`${MAIN_PATH}: lead_submit не содержит ${fragment}`);
    }
  });
}

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
    if (!event.optional_fields?.includes(field)) {
      errors.push(`${REGISTRY_PATH}:${label}: optional_fields не содержит ${field}`);
    }
  });
  if (event.contains_personal_data !== false) {
    errors.push(`${REGISTRY_PATH}:${label}: техническая атрибуция не должна считаться персональными данными`);
  }
}

const prohibited = new Set(registry?.rules?.prohibited_fields || []);
["lead_source", "placement"].forEach((field) => {
  if (prohibited.has(field)) {
    errors.push(`${REGISTRY_PATH}: ${field} не должен входить в prohibited_fields`);
  }
});

const forbiddenBindings = [
  /lead_source\s*:\s*data\.(name|phone|email|comment|question)/,
  /placement\s*:\s*data\.(name|phone|email|comment|question)/,
  /data\.lead_source\s*=\s*data\.(name|phone|email|comment|question)/,
  /data\.placement\s*=\s*data\.(name|phone|email|comment|question)/
];
forbiddenBindings.forEach((pattern) => {
  if (pattern.test(main) || pattern.test(tracking) || pattern.test(deliveryRuntime)) {
    errors.push(`Техническая атрибуция не должна формироваться из персональных полей: ${pattern}`);
  }
});

console.log("Checked lead source normalization: lead_source, placement");
console.log("Checked output surfaces: readable email, Web3Forms, lead_submit, lead_submit_classified");
console.log("Checked primary delivery: Supabase storage first, email copy second");

if (errors.length) {
  console.error("\nLead source output validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nLead source output validation passed.");