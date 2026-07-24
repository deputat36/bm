import fs from "node:fs";

const MAIN_PATH = "assets/js/main.js";
const SCHEMA_PATH = "assets/js/schema.js";
const PRIVACY_PATH = "privacy/index.html";
const ENDPOINT = "https://ofewxuqfjhamgerwzull.supabase.co/functions/v1/newbuild-lead";
const errors = [];

function read(path) {
  if (!fs.existsSync(path)) {
    errors.push(`${path}: файл не найден`);
    return "";
  }
  return fs.readFileSync(path, "utf8");
}

function requireFragment(source, fragment, label) {
  if (!source.includes(fragment)) errors.push(`${label}: отсутствует ${fragment}`);
}

function forbidFragment(source, fragment, label) {
  if (source.includes(fragment)) errors.push(`${label}: найден запрещённый фрагмент ${fragment}`);
}

const main = read(MAIN_PATH);
const schema = read(SCHEMA_PATH);
const privacy = read(PRIVACY_PATH);

requireFragment(main, `LEAD_ENDPOINT: "${ENDPOINT}"`, MAIN_PATH);
requireFragment(main, 'WEB3FORMS_ACCESS_KEY: ""', MAIN_PATH);
requireFragment(main, "SEND_EMAIL_COPY: false", MAIN_PATH);
requireFragment(main, "return sendCustomLead(data);", MAIN_PATH);
requireFragment(main, 'if (!SITE_CONFIG.LEAD_ENDPOINT) throw new Error("Lead endpoint unavailable")', MAIN_PATH);
requireFragment(main, "const result = await response.json().catch(() => ({}));", MAIN_PATH);
requireFragment(main, "if (!response.ok || result.success === false)", MAIN_PATH);

[
  "api.web3forms.com",
  "sendWeb3FormsLead",
  "Promise.allSettled",
  "DRAFT_STORAGE_KEY",
  "newbuildsBorisoglebskLeadsDraft",
  "saved.push(data)",
  "All lead destinations failed"
].forEach((fragment) => forbidFragment(main, fragment, MAIN_PATH));

[
  "enableOfflineDraftPrivacy",
  "newbuildsBorisoglebskOfflineReceipts",
  "sendLeadWithPrivateFallback"
].forEach((fragment) => forbidFragment(schema, fragment, SCHEMA_PATH));

requireFragment(privacy, "защищённый серверный реестр", PRIVACY_PATH);
requireFragment(privacy, "сбой уведомления не отменяет основную запись", PRIVACY_PATH);
forbidFragment(privacy, "через подключённый сервис обработки форм", PRIVACY_PATH);

const sendLeadStart = main.indexOf("async function sendLead(data)");
const addHiddenStart = main.indexOf("function addHiddenField", sendLeadStart);
if (sendLeadStart < 0 || addHiddenStart < 0) {
  errors.push(`${MAIN_PATH}: не найден основной блок отправки`);
} else {
  const block = main.slice(sendLeadStart, addHiddenStart);
  const endpointCheck = block.indexOf("if (!SITE_CONFIG.LEAD_ENDPOINT)");
  const primaryCall = block.indexOf("return sendCustomLead(data);");
  if (endpointCheck < 0 || primaryCall < 0 || endpointCheck > primaryCall) {
    errors.push(`${MAIN_PATH}: основной endpoint должен проверяться до отправки`);
  }
}

console.log(`Primary lead endpoint: ${ENDPOINT}`);
console.log("Browser email fallback: disabled");
console.log("Browser PII draft storage: disabled");

if (errors.length) {
  console.error("\nPrimary lead route validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Primary lead route validation passed.");
