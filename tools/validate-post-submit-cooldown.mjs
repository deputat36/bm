import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUNTIME_PATH = "assets/js/form-accessibility.js";
const MAIN_PATH = "assets/js/main.js";
const MATRIX_PATH = "data/qa/form-scenarios.json";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
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
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function requireFragment(source, fragment, label) {
  if (!source.includes(fragment)) errors.push(`${label}: missing ${fragment}`);
}

const runtime = read(RUNTIME_PATH);
const main = read(MAIN_PATH);
const matrix = readJson(MATRIX_PATH);

[
  'const SUCCESS_COOLDOWN_STORAGE_KEY = "newbuildsBorisoglebskLeadSuccessCooldowns";',
  "const SUCCESS_COOLDOWN_MS = 30_000;",
  "const SUCCESS_COOLDOWN_RETENTION_MS = 5 * 60_000;",
  "function readSuccessCooldowns()",
  "function writeSuccessCooldowns(cooldowns)",
  "function markSuccessfulSubmission(detail)",
  "if (!detail || detail.blocked || detail.offline) return false;",
  'const formId = String(detail.form_id || "").trim();',
  "cooldowns[formId] = Date.now();",
  "function getCooldownSeconds(formId)",
  'form.addEventListener("submit", (event) => {',
  "event.preventDefault();",
  "event.stopImmediatePropagation();",
  'status.textContent = `Заявка уже отправлена. Повторите через ${seconds} сек.`;',
  'window.addEventListener("newbuildLeadSubmit"'
].forEach((fragment) => requireFragment(runtime, fragment, RUNTIME_PATH));

if (!runtime.includes("}, true);")) {
  errors.push(`${RUNTIME_PATH}: cooldown submit handler must use capture phase`);
}
if (!runtime.includes("sessionStorage.getItem(SUCCESS_COOLDOWN_STORAGE_KEY)")) {
  errors.push(`${RUNTIME_PATH}: cooldown must read from sessionStorage`);
}
if (!runtime.includes("sessionStorage.setItem(SUCCESS_COOLDOWN_STORAGE_KEY")) {
  errors.push(`${RUNTIME_PATH}: cooldown must write to sessionStorage`);
}
if (runtime.includes("localStorage.setItem(SUCCESS_COOLDOWN_STORAGE_KEY")) {
  errors.push(`${RUNTIME_PATH}: cooldown must not persist in localStorage`);
}

const cooldownStart = runtime.indexOf("const SUCCESS_COOLDOWN_STORAGE_KEY");
const cooldownEnd = runtime.indexOf("function enhanceForm", cooldownStart);
const cooldownBlock = cooldownStart >= 0 && cooldownEnd > cooldownStart
  ? runtime.slice(cooldownStart, cooldownEnd)
  : "";

if (!cooldownBlock) {
  errors.push(`${RUNTIME_PATH}: cooldown block not found`);
} else {
  [
    "client_fixation_id",
    "phone",
    "phone_normalized",
    "email",
    "comment",
    "question",
    "name:",
    "fields_json",
    "tracking"
  ].forEach((field) => {
    if (cooldownBlock.includes(field)) {
      errors.push(`${RUNTIME_PATH}: cooldown block must not store ${field}`);
    }
  });
  if (cooldownBlock.includes("innerHTML")) {
    errors.push(`${RUNTIME_PATH}: cooldown message must use textContent`);
  }
}

const submitListenerStart = runtime.indexOf('form.addEventListener("submit"');
const submitListenerEnd = runtime.indexOf('form.addEventListener("invalid"', submitListenerStart);
const submitBlock = submitListenerStart >= 0 && submitListenerEnd > submitListenerStart
  ? runtime.slice(submitListenerStart, submitListenerEnd)
  : "";
if (!submitBlock.includes("getCooldownSeconds")) errors.push(`${RUNTIME_PATH}: submit handler must check cooldown`);
if (!submitBlock.includes("event.stopImmediatePropagation()")) errors.push(`${RUNTIME_PATH}: duplicate submit must not reach main handler`);
if (!submitBlock.includes("status.focus")) errors.push(`${RUNTIME_PATH}: duplicate message must receive focus`);

[
  'event: "lead_submit"',
  "blocked: Boolean(result.blocked)",
  "offline: Boolean(result.offline)",
  'window.dispatchEvent(new CustomEvent("newbuildLeadSubmit"'
].forEach((fragment) => requireFragment(main, fragment, MAIN_PATH));

const scenarios = Array.isArray(matrix?.scenarios) ? matrix.scenarios : [];
const formIds = scenarios.map((item) => String(item.form_id || "").trim()).filter(Boolean);
if (scenarios.length !== 14 || new Set(formIds).size !== 14) {
  errors.push(`${MATRIX_PATH}: expected 14 unique active form IDs`);
}

console.log("Cooldown active window: 30 seconds");
console.log("Cooldown retention: 5 minutes");
console.log(`Checked active form IDs: ${new Set(formIds).size}`);
console.log("Stored personal fields: 0");

if (errors.length) {
  console.error("\nPost-submit cooldown validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Post-submit cooldown validation passed.");
