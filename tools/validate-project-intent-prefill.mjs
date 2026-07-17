import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUNTIME_PATH = "assets/js/project-intent-prefill.js";
const errors = [];

const PROJECTS = [
  {
    page: "catalog/prostornaya-4a/index.html",
    objectId: "prostornaya-4a",
    interest: "Презентацию и документы проекта",
    label: "Получить документы и пояснения",
    placement: "project_documents_check",
    optionCount: 1,
    formIds: [
      "catalog_prostornaya_4a_quick_consultation",
      "catalog_prostornaya_4a_priority_lead"
    ]
  },
  {
    page: "catalog/aerodromnaya-18g/index.html",
    objectId: "aerodromnaya-18g",
    interest: "Схема покупки и договор",
    label: "Проверить схему покупки",
    placement: "project_purchase_scheme",
    optionCount: 2,
    formIds: [
      "catalog_aerodromnaya_18g_quick_consultation",
      "catalog_aerodromnaya_18g_priority_lead"
    ]
  },
  {
    page: "catalog/sennaya-76/index.html",
    objectId: "sennaya-76",
    interest: "Проверка конкретной квартиры",
    label: "Проверить конкретную квартиру",
    placement: "project_apartment_check",
    optionCount: 2,
    formIds: [
      "catalog_sennaya_76_quick_consultation",
      "catalog_sennaya_76_priority_lead"
    ]
  }
];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function count(source, fragment) {
  return source.split(fragment).length - 1;
}

const runtime = read(RUNTIME_PATH);

[
  'document.querySelectorAll("a[data-prefill-interest]")',
  'link.dataset.prefillInterest',
  'target?.querySelector("form[data-lead-form]")',
  'form?.querySelector("select[name=\'interest\']")',
  'event.preventDefault()',
  'select.value = option.value',
  'form.dataset.prefilledInterest = "true"',
  'target.scrollIntoView({ behavior: "smooth", block: "start" })',
  'select.focus({ preventScroll: true })'
].forEach((fragment) => {
  if (!runtime.includes(fragment)) errors.push(`${RUNTIME_PATH}: missing ${fragment}`);
});

for (const forbidden of [
  "localStorage",
  "sessionStorage",
  "URLSearchParams",
  "window.location.search",
  "history.pushState",
  "history.replaceState",
  "fetch(",
  "innerHTML",
  "dispatchEvent(",
  "new FormData(",
  "document.cookie"
]) {
  if (runtime.includes(forbidden)) errors.push(`${RUNTIME_PATH}: forbidden mechanism ${forbidden}`);
}

for (const project of PROJECTS) {
  const html = read(project.page);
  const ctaFragments = [
    `href="#quick-lead"`,
    `data-prefill-interest="${project.interest}"`,
    `data-track-action="intent_prefill"`,
    `data-track-placement="${project.placement}"`,
    `data-track-object="${project.objectId}"`,
    `>${project.label}</a>`
  ];

  for (const fragment of ctaFragments) {
    if (!html.includes(fragment)) errors.push(`${project.page}: missing CTA fragment ${fragment}`);
  }
  if (count(html, `data-track-placement="${project.placement}"`) !== 1) {
    errors.push(`${project.page}: expected exactly one intent CTA placement`);
  }
  if (count(html, `<option>${project.interest}</option>`) !== project.optionCount) {
    errors.push(`${project.page}: expected ${project.optionCount} matching interest options`);
  }
  if (count(html, "form[data-lead-form]") > 0) {
    errors.push(`${project.page}: literal selector text unexpectedly present in HTML`);
  }
  if (count(html, "<form ") !== 2) {
    errors.push(`${project.page}: active form count must remain 2`);
  }
  for (const formId of project.formIds) {
    if (count(html, `data-form-id="${formId}"`) !== 1) {
      errors.push(`${project.page}: form id must remain unique: ${formId}`);
    }
  }

  const intentTag = '<script src="../../assets/js/project-intent-prefill.js"></script>';
  const summaryTag = '<script src="../../assets/js/project-verification-summary.js"></script>';
  if (count(html, intentTag) !== 1) errors.push(`${project.page}: intent runtime must load exactly once`);

  const mainPosition = html.indexOf('<script src="../../assets/js/main.js"></script>');
  const intentPosition = html.indexOf(intentTag);
  const summaryPosition = html.indexOf(summaryTag);
  const schemaPosition = html.indexOf('<script src="../../assets/js/schema.js"></script>');
  if (!(mainPosition >= 0 && mainPosition < intentPosition && intentPosition < summaryPosition && summaryPosition < schemaPosition)) {
    errors.push(`${project.page}: script order must be main -> intent -> verification summary -> schema`);
  }
  if (!html.includes('content="noindex,follow"')) {
    errors.push(`${project.page}: noindex,follow must remain`);
  }
}

console.log(`Intent CTA routes checked: ${PROJECTS.length}`);
console.log("New forms added: 0");
console.log("Query parameters used: 0");
console.log("Storage writes used: 0");

if (errors.length) {
  console.error("\nProject intent prefill validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Project intent prefill validation passed.");
