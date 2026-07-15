import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MAIN_PATH = "assets/js/main.js";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireFragment(source, fragment, label = fragment) {
  if (!source.includes(fragment)) errors.push(`${MAIN_PATH}: missing ${label}`);
}

function requireOrder(source, fragments, label) {
  let previous = -1;
  for (const fragment of fragments) {
    const index = source.indexOf(fragment);
    if (index < 0) {
      errors.push(`${MAIN_PATH}: ${label} missing fragment ${fragment}`);
      return;
    }
    if (index <= previous) {
      errors.push(`${MAIN_PATH}: invalid order for ${label}: ${fragment}`);
      return;
    }
    previous = index;
  }
}

function count(source, fragment) {
  return source.split(fragment).length - 1;
}

const source = read(MAIN_PATH);
if (!source) process.exit(1);

[
  "function safeStorageGet(key, fallback = \"\")",
  "function safeStorageSet(key, value)",
  "return localStorage.getItem(key) ?? fallback;",
  "localStorage.setItem(key, value);",
  "return false;",
  "safeJsonParse(safeStorageGet(TRACKING_STORAGE_KEY, \"{}\"), {})",
  "safeJsonParse(safeStorageGet(LEGACY_TRACKING_STORAGE_KEY, \"{}\"), {})",
  "safeStorageSet(TRACKING_STORAGE_KEY, JSON.stringify(tracking));",
  "safeJsonParse(safeStorageGet(DRAFT_STORAGE_KEY, \"[]\"), [])",
  "if (!safeStorageSet(DRAFT_STORAGE_KEY, JSON.stringify(saved)))",
  "throw new Error(\"Offline draft storage unavailable\")",
  "return safeStorageSet(LAST_LEAD_STORAGE_KEY, JSON.stringify(safeLead));",
  "if (form.dataset.submitting === \"true\") return;",
  "form.dataset.submitting = \"true\";",
  "form.setAttribute(\"aria-busy\", \"true\");",
  "delete form.dataset.submitting;",
  "form.removeAttribute(\"aria-busy\");"
].forEach((fragment) => requireFragment(source, fragment));

if (count(source, "localStorage.getItem(") !== 1) {
  errors.push(`${MAIN_PATH}: direct localStorage.getItem must exist only inside safeStorageGet`);
}
if (count(source, "localStorage.setItem(") !== 1) {
  errors.push(`${MAIN_PATH}: direct localStorage.setItem must exist only inside safeStorageSet`);
}

const submitStart = source.indexOf('form.addEventListener("submit", async (event) => {');
const submitEnd = source.indexOf("  });\n}", submitStart);
if (submitStart < 0 || submitEnd < 0) {
  errors.push(`${MAIN_PATH}: submit handler not found`);
} else {
  const handler = source.slice(submitStart, submitEnd);

  requireOrder(handler, [
    "event.preventDefault();",
    "if (form.dataset.submitting === \"true\") return;",
    "if (!form.checkValidity())",
    "form.dataset.submitting = \"true\";",
    "const data = collectFormData(form);",
    "const result = await sendLead(data);",
    "trackLeadEvent(data, result);",
    "if (result.blocked)",
    "saveLastLead(data);"
  ], "submit integrity flow");

  requireOrder(handler, [
    "} finally {",
    "delete form.dataset.submitting;",
    "form.removeAttribute(\"aria-busy\");",
    "button.disabled = false;"
  ], "submit lock cleanup");

  if (handler.indexOf("saveLastLead(data);") < handler.indexOf("if (result.blocked)")) {
    errors.push(`${MAIN_PATH}: blocked submissions must not update lastLead`);
  }
}

const offlineStart = source.indexOf("if (!tasks.length) {");
const offlineEnd = source.indexOf("  }\n\n  const results", offlineStart);
if (offlineStart < 0 || offlineEnd < 0) {
  errors.push(`${MAIN_PATH}: offline fallback block not found`);
} else {
  const offlineBlock = source.slice(offlineStart, offlineEnd);
  requireOrder(offlineBlock, [
    "safeStorageGet(DRAFT_STORAGE_KEY, \"[]\")",
    "saved.push(data);",
    "if (!safeStorageSet(DRAFT_STORAGE_KEY, JSON.stringify(saved)))",
    "throw new Error(\"Offline draft storage unavailable\")",
    "return { offline: true };"
  ], "offline persistence flow");
}

console.log("Checked safe storage wrappers: 2");
console.log("Checked submit in-flight lock: enabled");
console.log("Checked blocked lastLead protection: enabled");
console.log("Checked offline persistence honesty: enabled");

if (errors.length) {
  console.error("\nLead submit integrity validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Lead submit integrity validation passed.");
