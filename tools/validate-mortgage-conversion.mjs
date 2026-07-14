import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

function read(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findForm(html, formId) {
  const pattern = new RegExp(`<form\\b[^>]*data-form-id=["']${escapeRegExp(formId)}["'][^>]*>[\\s\\S]*?<\\/form>`, "i");
  return html.match(pattern)?.[0] || "";
}

function hasRequiredField(form, fieldName) {
  const pattern = new RegExp(`<(?:input|select|textarea)\\b(?=[^>]*\\bname=["']${escapeRegExp(fieldName)}["'])(?=[^>]*\\brequired(?:\\s|=|>))[^>]*>`, "i");
  return pattern.test(form);
}

function hasField(form, fieldName) {
  const pattern = new RegExp(`\\bname=["']${escapeRegExp(fieldName)}["']`, "i");
  return pattern.test(form);
}

const html = read("ipoteka/index.html");
const priorityScript = read("assets/js/priority-leads.js");
const conversionScript = read("assets/js/conversion-tracking.js");
const quickFormId = "portal_mortgage_quick_consultation";
const detailedFormId = "portal_mortgage_consultation";
const quickForm = findForm(html, quickFormId);
const detailedForm = findForm(html, detailedFormId);

if (!quickForm) errors.push(`ipoteka/index.html: missing ${quickFormId}`);
if (!detailedForm) errors.push(`ipoteka/index.html: missing ${detailedFormId}`);

["name", "phone", "residential_complex"].forEach((fieldName) => {
  if (quickForm && !hasRequiredField(quickForm, fieldName)) {
    errors.push(`${quickFormId}: required field ${fieldName} is missing`);
  }
});

["purchase_method", "interest", "budget", "timeline", "comment"].forEach((fieldName) => {
  if (quickForm && hasField(quickForm, fieldName)) {
    errors.push(`${quickFormId}: must not request ${fieldName} before the first conversation`);
  }
});

["Просторная 4А", "Аэродромная 18Г", "Сенная 76", "Общий подбор новостройки"].forEach((option) => {
  if (quickForm && !quickForm.includes(`>${option}<`)) {
    errors.push(`${quickFormId}: missing object option ${option}`);
  }
});

if (quickForm && !/data-lead-type=["']mortgage["']/i.test(quickForm)) {
  errors.push(`${quickFormId}: data-lead-type must be mortgage`);
}

if (quickForm && !quickForm.includes('inputmode="tel"')) {
  errors.push(`${quickFormId}: phone field must use inputmode=tel`);
}

if (detailedForm && !hasRequiredField(detailedForm, "purchase_method")) {
  errors.push(`${detailedFormId}: detailed form must keep required purchase_method`);
}

const quickPosition = html.indexOf(`data-form-id="${quickFormId}"`);
const detailedPosition = html.indexOf(`data-form-id="${detailedFormId}"`);
if (quickPosition < 0 || detailedPosition < 0 || quickPosition > detailedPosition) {
  errors.push("ipoteka/index.html: quick form must appear before detailed form");
}

[
  'id="quick-lead"',
  "data-primary-lead",
  "../assets/css/project-conversion.css",
  'href="#quick-lead" data-track-action="mortgage_quick_consultation" data-track-placement="mortgage_header"',
  'href="#quick-lead" data-track-action="mortgage_quick_consultation" data-track-placement="mortgage_hero"',
  'href="#lead" data-track-action="mortgage_detailed_consultation" data-track-placement="mortgage_hero"',
  "data-selected-object-note"
].forEach((fragment) => {
  if (!html.includes(fragment)) {
    errors.push(`ipoteka/index.html: missing conversion fragment ${fragment}`);
  }
});

[
  'params.get("object")',
  'document.querySelectorAll("form[data-lead-form]")',
  "residential_complex_id",
  "updateRequestedObjectNote"
].forEach((fragment) => {
  if (!priorityScript.includes(fragment)) {
    errors.push(`assets/js/priority-leads.js: missing object context fragment ${fragment}`);
  }
});

[
  'const MORTGAGE_PRIMARY_ANCHOR = "quick-lead"',
  'params.set("object", objectId)',
  '#${MORTGAGE_PRIMARY_ANCHOR}'
].forEach((fragment) => {
  if (!conversionScript.includes(fragment)) {
    errors.push(`assets/js/conversion-tracking.js: missing primary mortgage link fragment ${fragment}`);
  }
});

if (conversionScript.includes("params.toString()}#lead")) {
  errors.push("assets/js/conversion-tracking.js: object mortgage CTA must not target the detailed #lead form");
}

if (!html.includes("../assets/js/main.js") || !html.includes("../assets/js/schema.js")) {
  errors.push("ipoteka/index.html: lead scripts are not connected");
}

console.log("Checked mortgage short and detailed conversion paths.");

if (errors.length) {
  console.error("\nMortgage conversion validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Mortgage conversion validation passed.");
