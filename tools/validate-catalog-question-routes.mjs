import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
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
  const source = read(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function count(source, fragment) {
  return source.split(fragment).length - 1;
}

function extractSection(html, marker) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return "";
  const start = html.lastIndexOf("<section", markerIndex);
  const end = html.indexOf("</section>", markerIndex);
  return start >= 0 && end >= 0 ? html.slice(start, end + "</section>".length) : "";
}

const pagePath = "catalog/index.html";
const runtimePath = "assets/js/catalog-verification-comparison.js";
const qaPath = "data/qa/catalog-question-routes.json";
const formQaPath = "data/qa/form-scenarios.json";
const html = read(pagePath);
const runtime = read(runtimePath);
const qa = readJson(qaPath);
const formQa = readJson(formQaPath);
const questionSection = extractSection(html, "data-catalog-question-routes");
const comparisonSection = extractSection(html, "data-catalog-verification-comparison");

if (!questionSection) errors.push(`${pagePath}: question routes section not found`);
if (!comparisonSection) errors.push(`${pagePath}: verification comparison section not found`);
if (!qa || !Array.isArray(qa.routes) || qa.routes.length !== 5) {
  errors.push(`${qaPath}: expected exactly 5 routes`);
}
if (qa?.target_form_id !== "catalog_quick_selection") {
  errors.push(`${qaPath}: target form must be catalog_quick_selection`);
}
if (qa?.expected_active_form_count !== 14) {
  errors.push(`${qaPath}: expected_active_form_count must remain 14`);
}

const scenarios = Array.isArray(formQa?.scenarios) ? formQa.scenarios : [];
const activeFormIds = new Set(scenarios.map((scenario) => scenario?.form_id).filter(Boolean));
if (scenarios.length !== 14 || activeFormIds.size !== 14) {
  errors.push(`${formQaPath}: active form matrix must contain 14 unique forms`);
}
if (!activeFormIds.has("catalog_quick_selection") || !activeFormIds.has("catalog_priority_selection")) {
  errors.push(`${formQaPath}: catalog form ids missing`);
}
if (count(html, "<form ") !== 2) errors.push(`${pagePath}: catalog must keep exactly 2 forms`);
for (const formId of ["catalog_quick_selection", "catalog_priority_selection"]) {
  if (count(html, `data-form-id="${formId}"`) !== 1) {
    errors.push(`${pagePath}: form id must remain unique: ${formId}`);
  }
}

const quickFormStart = html.indexOf('data-form-id="catalog_quick_selection"');
const quickFormEnd = quickFormStart >= 0 ? html.indexOf("</form>", quickFormStart) : -1;
const quickForm = quickFormStart >= 0 && quickFormEnd >= 0 ? html.slice(quickFormStart, quickFormEnd) : "";
if (!quickForm.includes('select name="interest" required')) {
  errors.push(`${pagePath}: primary catalog form must require the main question`);
}

const placements = new Set();
for (const route of qa?.routes || []) {
  const required = [
    `href="#quick-lead"`,
    `data-prefill-interest="${route.interest}"`,
    `data-track-action="${route.action}"`,
    `data-track-placement="${route.placement}"`,
    `>${route.label}</a>`
  ];
  for (const fragment of required) {
    if (!questionSection.includes(fragment)) errors.push(`${pagePath}: route missing ${fragment}`);
  }
  if (!quickForm.includes(`<option>${route.interest}</option>`)) {
    errors.push(`${pagePath}: quick form option missing: ${route.interest}`);
  }
  if (count(html, `data-track-placement="${route.placement}"`) !== 1) {
    errors.push(`${pagePath}: placement must be unique: ${route.placement}`);
  }
  if (placements.has(route.placement)) errors.push(`${qaPath}: duplicate placement ${route.placement}`);
  placements.add(route.placement);
}

if (questionSection.includes("<form") || questionSection.includes("<input") || questionSection.includes("<select")) {
  errors.push(`${pagePath}: question route section must not create another form or filter controls`);
}
if (comparisonSection.includes("<form") || comparisonSection.includes("<input") || comparisonSection.includes("<select")) {
  errors.push(`${pagePath}: comparison section must not create filters or forms`);
}

const comparisonContracts = [
  {
    label: "Просторная 4А",
    profile: "../data/verification/prostornaya-4a.json",
    objectFragment: 'data-track-object="prostornaya-4a"',
    projectId: "tellermanov-sad",
    minimumPublicClaims: 21
  },
  {
    label: "Аэродромная 18Г",
    profile: "../data/verification/aerodromnaya-18g.json",
    objectFragment: 'data-track-object="aerodromnaya-18g"',
    projectId: "aerodromnaya-18g",
    minimumPublicClaims: 0
  },
  {
    label: "Сенная 76",
    profile: "../data/verification/sennaya-76.json",
    objectFragment: 'data-track-object="sennaya-76"',
    projectId: "sennaya-76",
    minimumPublicClaims: 0
  }
];
if (count(comparisonSection, "data-catalog-verification-card") !== 3) {
  errors.push(`${pagePath}: expected exactly 3 verification comparison cards`);
}
for (const contract of comparisonContracts) {
  for (const fragment of [contract.label, `data-verification-profile="${contract.profile}"`, contract.objectFragment]) {
    if (!comparisonSection.includes(fragment)) errors.push(`${pagePath}: comparison card missing ${fragment}`);
  }
  const profilePath = contract.profile.replace("../", "");
  const verification = readJson(profilePath);
  if (!verification || !Array.isArray(verification.sources) || !Array.isArray(verification.claims)) {
    errors.push(`${profilePath}: invalid verification profile`);
    continue;
  }
  if (verification.project_id !== contract.projectId) {
    errors.push(`${profilePath}: project identity mismatch`);
  }
  if (verification.publication_policy?.page_must_remain_noindex_until_confirmed !== true) {
    errors.push(`${profilePath}: noindex publication gate must remain enabled`);
  }
  const publicClaims = verification.claims.filter((claim) => claim?.publication_allowed === true);
  if (contract.minimumPublicClaims === 0 && publicClaims.length !== 0) {
    errors.push(`${profilePath}: unverified project must not expose public claims`);
  }
  if (contract.minimumPublicClaims > 0 && publicClaims.length < contract.minimumPublicClaims) {
    errors.push(`${profilePath}: expected at least ${contract.minimumPublicClaims} confirmed buyer claims`);
  }
  publicClaims.forEach((claim) => {
    if (claim.verification_status !== "confirmed") {
      errors.push(`${profilePath}: public claim ${claim.field} must be confirmed`);
    }
  });
}

for (const marker of [
  "data-verification-status",
  "data-verification-date",
  "data-verification-sources",
  "data-verification-critical",
  "data-verification-categories"
]) {
  if (count(comparisonSection, marker) !== 3) errors.push(`${pagePath}: expected marker ${marker} on all 3 cards`);
}

for (const fragment of [
  'meta name="robots" content="noindex,follow"',
  'script src="../assets/js/project-intent-prefill.js"',
  'script src="../assets/js/catalog-verification-comparison.js"',
  'script src="../assets/js/reference-catalog.js"',
  'script src="../assets/js/schema.js"'
]) {
  if (!html.includes(fragment)) errors.push(`${pagePath}: missing ${fragment}`);
}
const scriptOrder = [
  "../assets/js/main.js",
  "../assets/js/project-intent-prefill.js",
  "../assets/js/catalog-verification-comparison.js",
  "../assets/js/reference-catalog.js",
  "../assets/js/schema.js"
].map((script) => html.indexOf(script));
if (scriptOrder.some((index) => index < 0) || scriptOrder.some((index, position) => position > 0 && index <= scriptOrder[position - 1])) {
  errors.push(`${pagePath}: catalog scripts must load in the expected order`);
}

for (const href of Array.from(questionSection.matchAll(/href="([^"]+)"/g), (match) => match[1])) {
  if (href.includes("?") || href.includes("utm_") || href.includes("lead_source=") || href.includes("placement=")) {
    errors.push(`${pagePath}: question route href must not contain query attribution: ${href}`);
  }
}

for (const forbidden of [
  "source.title",
  "source.reference",
  "source.notes",
  "document_number",
  "innerHTML",
  "localStorage",
  "sessionStorage",
  "document.cookie",
  "current_price",
  "current_availability"
]) {
  if (runtime.includes(forbidden)) errors.push(`${runtimePath}: forbidden source detail, storage or volatile claim access: ${forbidden}`);
}
for (const required of [
  "profile?.updated_at",
  "profile?.overall_status",
  "profile?.project_id",
  "profile?.sources",
  "profile?.claims",
  "claim?.field",
  "claim?.importance",
  "claim?.verification_status",
  "claim?.publication_allowed",
  "claim.value",
  'profile?.project_id === "tellermanov-sad"',
  "getPublicClaimMap",
  "textContent",
  'credentials: "same-origin"'
]) {
  if (!runtime.includes(required)) errors.push(`${runtimePath}: missing safe buyer aggregate fragment ${required}`);
}

for (const forbidden of [
  "filter_price",
  "filter_area",
  "filter_floors",
  "data-catalog-price-filter",
  "data-catalog-area-filter",
  "data-catalog-floor-filter"
]) {
  if (html.includes(forbidden)) errors.push(`${pagePath}: exact characteristic filter is forbidden before current offer data`);
}

console.log(`Catalog question routes: ${qa?.routes?.length || 0}`);
console.log(`Catalog comparison cards: ${count(comparisonSection, "data-catalog-verification-card")}`);
console.log(`Active forms: ${activeFormIds.size}`);
console.log("Exact characteristic filters: 0");
console.log("Confirmed buyer claim values rendered for Tellermanov only.");

if (errors.length) {
  console.error("\nCatalog question route validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Catalog question route validation passed.");
