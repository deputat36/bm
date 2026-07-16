import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const filePath = path.join(ROOT, "catalog/index.html");
const errors = [];

if (!fs.existsSync(filePath)) {
  console.error("catalog/index.html: file does not exist");
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

const quickFormId = "catalog_quick_selection";
const detailedFormId = "catalog_priority_selection";
const quickForm = findForm(quickFormId);
const detailedForm = findForm(detailedFormId);

if (!quickForm) errors.push(`catalog/index.html: missing ${quickFormId}`);
if (!detailedForm) errors.push(`catalog/index.html: missing ${detailedFormId}`);

["name", "phone", "residential_complex", "interest"].forEach((fieldName) => {
  if (quickForm && !hasRequiredField(quickForm, fieldName)) {
    errors.push(`${quickFormId}: required field ${fieldName} is missing`);
  }
});

["budget", "purchase_method", "timeline", "comment"].forEach((fieldName) => {
  if (quickForm && hasField(quickForm, fieldName)) {
    errors.push(`${quickFormId}: must not request ${fieldName} before the first conversation`);
  }
});

["Просторная 4А", "Аэродромная 18Г", "Сенная 76", "Общий подбор новостройки"].forEach((option) => {
  if (quickForm && !quickForm.includes(`>${option}<`)) {
    errors.push(`${quickFormId}: missing object option ${option}`);
  }
});

[
  "Наличие и актуальный статус",
  "Документы по объекту",
  "Схема покупки и договор",
  "Ипотека и расчёт покупки",
  "Альтернативы и общий подбор"
].forEach((option) => {
  if (quickForm && !quickForm.includes(`>${option}<`)) {
    errors.push(`${quickFormId}: missing question option ${option}`);
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
  errors.push("catalog/index.html: quick form must appear before detailed form");
}

[
  'id="quick-lead"',
  "data-primary-lead",
  "../assets/css/project-conversion.css",
  'href="#quick-lead" data-track-action="quick_selection" data-track-placement="catalog_header"',
  'href="#questions" data-track-action="catalog_question_start" data-track-placement="catalog_hero_questions"',
  "data-catalog-question-routes",
  "data-catalog-verification-comparison"
].forEach((fragment) => {
  if (!html.includes(fragment)) {
    errors.push(`catalog/index.html: missing quick conversion fragment ${fragment}`);
  }
});

const objects = [
  ["prostornaya-4a", "prostornaya-4a/#quick-lead"],
  ["aerodromnaya-18g", "aerodromnaya-18g/#quick-lead"],
  ["sennaya-76", "sennaya-76/#quick-lead"]
];

objects.forEach(([objectId, href]) => {
  if (!html.includes(`href="${href}"`)) {
    errors.push(`catalog/index.html: ${objectId} card must lead to its quick form`);
  }
  if (!html.includes(`data-track-action="object_quick_consultation" data-track-placement="catalog_comparison_card" data-track-object="${objectId}"`)) {
    errors.push(`catalog/index.html: ${objectId} quick CTA tracking is missing`);
  }
});

console.log("Checked catalog short and detailed conversion paths.");
console.log("Catalog primary fields: name, phone, object, main question.");

if (errors.length) {
  console.error("\nCatalog conversion validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Catalog conversion validation passed.");
