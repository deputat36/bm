import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const filePath = path.join(ROOT, "contacts/index.html");
const errors = [];

if (!fs.existsSync(filePath)) {
  console.error("contacts/index.html: file does not exist");
  process.exit(1);
}

const html = fs.readFileSync(filePath, "utf8");

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findForm(formId) {
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

const quickFormId = "contacts_quick_selection";
const detailedFormId = "contacts_priority_selection";
const quickForm = findForm(quickFormId);
const detailedForm = findForm(detailedFormId);

if (!quickForm) errors.push(`contacts/index.html: missing ${quickFormId}`);
if (!detailedForm) errors.push(`contacts/index.html: missing ${detailedFormId}`);

["name", "phone", "residential_complex"].forEach((fieldName) => {
  if (quickForm && !hasRequiredField(quickForm, fieldName)) {
    errors.push(`${quickFormId}: required field ${fieldName} is missing`);
  }
});

["interest", "budget", "purchase_method", "timeline", "comment"].forEach((fieldName) => {
  if (quickForm && hasField(quickForm, fieldName)) {
    errors.push(`${quickFormId}: must not request ${fieldName} before the first conversation`);
  }
});

["Просторная 4А", "Аэродромная 18Г", "Сенная 76", "Общий подбор новостройки"].forEach((option) => {
  if (quickForm && !quickForm.includes(`>${option}<`)) {
    errors.push(`${quickFormId}: missing object option ${option}`);
  }
});

if (quickForm && !quickForm.includes('inputmode="tel"')) {
  errors.push(`${quickFormId}: phone field must use inputmode=tel`);
}

if (detailedForm && !hasRequiredField(detailedForm, "interest")) {
  errors.push(`${detailedFormId}: detailed form must keep required apartment interest`);
}

const quickPosition = html.indexOf(`data-form-id="${quickFormId}"`);
const detailedPosition = html.indexOf(`data-form-id="${detailedFormId}"`);
if (quickPosition < 0 || detailedPosition < 0 || quickPosition > detailedPosition) {
  errors.push("contacts/index.html: quick form must appear before detailed form");
}

[
  'id="quick-lead"',
  "data-primary-lead",
  "../assets/css/project-conversion.css",
  'href="#quick-lead" data-track-action="quick_selection" data-track-placement="contacts_header"',
  'href="#quick-lead" data-track-action="quick_selection" data-track-placement="contacts_hero"',
  'href="#lead" data-track-action="detailed_selection" data-track-placement="contacts_hero"'
].forEach((fragment) => {
  if (!html.includes(fragment)) {
    errors.push(`contacts/index.html: missing conversion fragment ${fragment}`);
  }
});

if (!html.includes("../assets/js/main.js") || !html.includes("../assets/js/schema.js")) {
  errors.push("contacts/index.html: lead scripts are not connected");
}

console.log("Checked contacts short and detailed conversion paths.");

if (errors.length) {
  console.error("\nContacts conversion validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Contacts conversion validation passed.");
