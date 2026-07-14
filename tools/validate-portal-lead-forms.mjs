import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const PRIORITY_OPTIONS = [
  "Просторная 4А",
  "Аэродромная 18Г",
  "Сенная 76",
  "Общий подбор новостройки"
];

const EXPECTED_FORMS = [
  {
    file: "index.html",
    formId: "homepage_quick_selection",
    leadType: "portal_selection",
    kind: "selection"
  },
  {
    file: "index.html",
    formId: "homepage_priority_selection",
    leadType: "portal_selection",
    kind: "selection"
  },
  {
    file: "catalog/index.html",
    formId: "catalog_priority_selection",
    leadType: "portal_selection",
    kind: "selection"
  },
  {
    file: "contacts/index.html",
    formId: "contacts_priority_selection",
    leadType: "portal_selection",
    kind: "selection"
  },
  {
    file: "ipoteka/index.html",
    formId: "portal_mortgage_consultation",
    leadType: "mortgage",
    kind: "selection"
  },
  {
    file: "catalog/prostornaya-4a/index.html",
    formId: "catalog_prostornaya_4a_priority_lead",
    leadType: "project_consultation",
    kind: "project",
    complex: "Просторная 4А",
    complexId: "prostornaya-4a"
  },
  {
    file: "catalog/aerodromnaya-18g/index.html",
    formId: "catalog_aerodromnaya_18g_priority_lead",
    leadType: "project_consultation",
    kind: "project",
    complex: "Аэродромная 18Г",
    complexId: "aerodromnaya-18g"
  },
  {
    file: "catalog/sennaya-76/index.html",
    formId: "catalog_sennaya_76_priority_lead",
    leadType: "project_consultation",
    kind: "project",
    complex: "Сенная 76",
    complexId: "sennaya-76"
  }
];

const errors = [];
const checkedFormIds = new Set();

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);

  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }

  return fs.readFileSync(fullPath, "utf8");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFormTag(html, formId) {
  const pattern = new RegExp(`<form\\b[^>]*data-form-id=["']${escapeRegExp(formId)}["'][^>]*>`, "i");
  return html.match(pattern)?.[0] || "";
}

function getAttribute(tag, name) {
  const pattern = new RegExp(`${escapeRegExp(name)}=["']([^"']*)["']`, "i");
  return tag.match(pattern)?.[1]?.trim() || "";
}

function findFormBlock(html, formId) {
  const pattern = new RegExp(`<form\\b[^>]*data-form-id=["']${escapeRegExp(formId)}["'][^>]*>[\\s\\S]*?<\\/form>`, "i");
  return html.match(pattern)?.[0] || "";
}

function validateCommon(expected, html, formTag) {
  const label = `${expected.file}:${expected.formId}`;

  if (!formTag) {
    errors.push(`${label}: expected lead form not found`);
    return;
  }

  if (checkedFormIds.has(expected.formId)) {
    errors.push(`${label}: duplicate form_id in validation registry`);
  }
  checkedFormIds.add(expected.formId);

  if (!/\bdata-lead-form(?:\s|=|>)/i.test(formTag)) {
    errors.push(`${label}: missing data-lead-form`);
  }

  if (getAttribute(formTag, "data-lead-type") !== expected.leadType) {
    errors.push(`${label}: expected data-lead-type=${expected.leadType}`);
  }

  if (getAttribute(formTag, "data-project-id") !== "newbuilds-borisoglebsk") {
    errors.push(`${label}: expected data-project-id=newbuilds-borisoglebsk`);
  }

  if (!getAttribute(formTag, "data-project-name")) {
    errors.push(`${label}: missing data-project-name`);
  }

  if (!getAttribute(formTag, "data-complex")) {
    errors.push(`${label}: missing data-complex`);
  }

  if (!html.includes("assets/js/main.js") && !html.includes("../assets/js/main.js") && !html.includes("../../assets/js/main.js")) {
    errors.push(`${expected.file}: main.js is not connected`);
  }
}

function validateSelectionForm(expected, html, formBlock) {
  const label = `${expected.file}:${expected.formId}`;

  if (!/select\b[^>]*name=["']residential_complex["']/i.test(formBlock)) {
    errors.push(`${label}: missing residential_complex select`);
    return;
  }

  PRIORITY_OPTIONS.forEach((option) => {
    if (!formBlock.includes(`>${option}<`)) {
      errors.push(`${label}: missing object option ${option}`);
    }
  });

  if (!html.includes("assets/js/schema.js") && !html.includes("../assets/js/schema.js") && !html.includes("../../assets/js/schema.js")) {
    errors.push(`${expected.file}: schema.js is required to load priority object mapping`);
  }
}

function validateProjectForm(expected, formTag) {
  const label = `${expected.file}:${expected.formId}`;

  if (getAttribute(formTag, "data-complex") !== expected.complex) {
    errors.push(`${label}: expected data-complex=${expected.complex}`);
  }

  if (getAttribute(formTag, "data-complex-id") !== expected.complexId) {
    errors.push(`${label}: expected data-complex-id=${expected.complexId}`);
  }
}

for (const expected of EXPECTED_FORMS) {
  const html = read(expected.file);
  if (!html) continue;

  const formTag = findFormTag(html, expected.formId);
  const formBlock = findFormBlock(html, expected.formId);

  validateCommon(expected, html, formTag);
  if (!formTag || !formBlock) continue;

  if (expected.kind === "selection") {
    validateSelectionForm(expected, html, formBlock);
  } else {
    validateProjectForm(expected, formTag);
  }
}

const homepage = read("index.html");
const schemaScript = read("assets/js/schema.js");
const conversionScript = read("assets/js/conversion-tracking.js");
const mobileLeadBarScript = read("assets/js/mobile-lead-bar.js");

[
  'id="quick-lead"',
  "data-primary-lead",
  'data-track-action="quick_selection"',
  'data-track-placement="hero"'
].forEach((fragment) => {
  if (!homepage.includes(fragment)) {
    errors.push(`index.html: missing homepage conversion fragment ${fragment}`);
  }
});

if (!schemaScript.includes('loadPortalScript(schemaScriptUrl, "conversion-tracking.js")')) {
  errors.push("assets/js/schema.js: conversion-tracking.js is not loaded for lead pages");
}

["lead_cta_click", "lead_form_view", "lead_form_start"].forEach((eventName) => {
  if (!conversionScript.includes(`"${eventName}"`)) {
    errors.push(`assets/js/conversion-tracking.js: missing event ${eventName}`);
  }
});

if (!mobileLeadBarScript.includes('form.closest("[data-primary-lead]")')) {
  errors.push("assets/js/mobile-lead-bar.js: mobile CTA does not prioritize the short lead form");
}

console.log(`Checked portal lead forms: ${EXPECTED_FORMS.length}`);

if (errors.length) {
  console.error("\nPortal lead form validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nPortal lead form validation passed.");
