import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];

const PAGE_FORMS = [
  {
    file: "index.html",
    primary: "homepage_quick_selection",
    detailed: "homepage_priority_selection"
  },
  {
    file: "catalog/index.html",
    primary: "catalog_quick_selection",
    detailed: "catalog_priority_selection"
  },
  {
    file: "catalog/prostornaya-4a/index.html",
    primary: "catalog_prostornaya_4a_quick_consultation",
    detailed: "catalog_prostornaya_4a_priority_lead"
  },
  {
    file: "catalog/aerodromnaya-18g/index.html",
    primary: "catalog_aerodromnaya_18g_quick_consultation",
    detailed: "catalog_aerodromnaya_18g_priority_lead"
  },
  {
    file: "catalog/sennaya-76/index.html",
    primary: "catalog_sennaya_76_quick_consultation",
    detailed: "catalog_sennaya_76_priority_lead"
  },
  {
    file: "contacts/index.html",
    primary: "contacts_quick_selection",
    detailed: "contacts_priority_selection"
  },
  {
    file: "ipoteka/index.html",
    primary: "portal_mortgage_quick_consultation",
    detailed: "portal_mortgage_consultation"
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

function findPrimaryLeadBlock(html) {
  const markerIndex = html.indexOf("data-primary-lead");
  if (markerIndex < 0) return "";

  const tagStart = html.lastIndexOf("<", markerIndex);
  if (tagStart < 0) return "";

  const openingMatch = html.slice(tagStart).match(/^<([a-z0-9-]+)\b[^>]*>/i);
  if (!openingMatch) return "";

  const tagName = openingMatch[1];
  const contentStart = tagStart + openingMatch[0].length;
  const closeTag = `</${tagName}>`;
  const closeIndex = html.indexOf(closeTag, contentStart);
  if (closeIndex < 0) return "";

  return html.slice(tagStart, closeIndex + closeTag.length);
}

let checkedForms = 0;

for (const page of PAGE_FORMS) {
  const html = read(page.file);
  if (!html) continue;

  const primaryToken = `data-form-id="${page.primary}"`;
  const detailedToken = `data-form-id="${page.detailed}"`;
  const primaryPosition = html.indexOf(primaryToken);
  const detailedPosition = html.indexOf(detailedToken);
  const primaryBlock = findPrimaryLeadBlock(html);
  const formCount = (html.match(/<form\b[^>]*data-lead-form/gi) || []).length;

  if (primaryPosition < 0) {
    errors.push(`${page.file}: missing primary form ${page.primary}`);
  } else {
    checkedForms += 1;
  }

  if (detailedPosition < 0) {
    errors.push(`${page.file}: missing detailed form ${page.detailed}`);
  } else {
    checkedForms += 1;
  }

  if (formCount !== 2) {
    errors.push(`${page.file}: expected exactly 2 active forms, found ${formCount}`);
  }

  if (!primaryBlock) {
    errors.push(`${page.file}: missing data-primary-lead container`);
  } else {
    if (!primaryBlock.includes(primaryToken)) {
      errors.push(`${page.file}: ${page.primary} must be inside data-primary-lead`);
    }
    if (primaryBlock.includes(detailedToken)) {
      errors.push(`${page.file}: ${page.detailed} must not be inside data-primary-lead`);
    }
  }

  if (primaryPosition >= 0 && detailedPosition >= 0 && primaryPosition > detailedPosition) {
    errors.push(`${page.file}: primary form must appear before detailed form`);
  }
}

const conversionScript = read("assets/js/conversion-tracking.js");

[
  "function getFormRole(form)",
  'form.closest("[data-primary-lead]") ? "primary" : "detailed"',
  "function ensureFormRole(form)",
  "form.dataset.formRole = role",
  "input[name='form_role']",
  'hidden.name = "form_role"',
  "form_role: getFormRole(form)",
  'window.addEventListener("newbuildLeadSubmit"',
  'sendConversionEvent("lead_submit_classified"',
  'window.addEventListener("newbuildLeadDryRun"',
  "updateStoredLeadRole(detail, formRole)"
].forEach((fragment) => {
  if (!conversionScript.includes(fragment)) {
    errors.push(`assets/js/conversion-tracking.js: missing form role fragment ${fragment}`);
  }
});

const classifiedStart = conversionScript.indexOf('sendConversionEvent("lead_submit_classified"');
const classifiedEnd = classifiedStart >= 0 ? conversionScript.indexOf("});", classifiedStart) : -1;
const classifiedBlock = classifiedStart >= 0 && classifiedEnd > classifiedStart
  ? conversionScript.slice(classifiedStart, classifiedEnd + 3)
  : "";

["form_id", "form_role", "lead_type", "residential_complex_id", "qualification_status", "blocked", "offline"].forEach((field) => {
  if (classifiedBlock && !classifiedBlock.includes(field)) {
    errors.push(`lead_submit_classified: missing field ${field}`);
  }
});

["client_fixation_id", "name", "phone", "budget", "comment"].forEach((field) => {
  if (classifiedBlock.includes(field)) {
    errors.push(`lead_submit_classified: must not contain personal or detailed field ${field}`);
  }
});

if (!classifiedBlock.includes("Boolean(detail.blocked)")) {
  errors.push("lead_submit_classified: blocked must be normalized to boolean");
}

if (!classifiedBlock.includes("Boolean(detail.offline)")) {
  errors.push("lead_submit_classified: offline must be normalized to boolean");
}

const dryRunStart = conversionScript.indexOf('window.addEventListener("newbuildLeadDryRun"');
const observerStart = conversionScript.indexOf('if ("IntersectionObserver"', dryRunStart);
const dryRunBlock = dryRunStart >= 0 && observerStart > dryRunStart
  ? conversionScript.slice(dryRunStart, observerStart)
  : "";
const debugCondition = dryRunBlock.indexOf("if (isAnalyticsDebugMode())");
const firstDryRunEvent = dryRunBlock.indexOf("sendConversionEvent");

if (firstDryRunEvent >= 0 && (debugCondition < 0 || firstDryRunEvent < debugCondition)) {
  errors.push("newbuildLeadDryRun: simulated events must be inside isAnalyticsDebugMode()");
}

[
  'sendConversionEvent("lead_submit"',
  'sendConversionEvent("lead_submit_classified"',
  "simulated: true",
  "offline: true"
].forEach((fragment) => {
  if (!dryRunBlock.includes(fragment)) {
    errors.push(`newbuildLeadDryRun: missing local debug fragment ${fragment}`);
  }
});

console.log(`Checked form role pages: ${PAGE_FORMS.length}`);
console.log(`Checked classified forms: ${checkedForms}`);

if (errors.length) {
  console.error("\nForm role analytics validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Form role analytics validation passed.");
