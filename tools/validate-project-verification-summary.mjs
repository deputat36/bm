import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUNTIME_PATH = "assets/js/project-verification-summary.js";
const errors = [];

const PROJECTS = [
  {
    page: "catalog/prostornaya-4a/index.html",
    profile: "data/verification/prostornaya-4a.json",
    htmlProfile: "../../data/verification/prostornaya-4a.json",
    expected: { sources: 3, claims: 23, critical: 14 }
  },
  {
    page: "catalog/aerodromnaya-18g/index.html",
    profile: "data/verification/aerodromnaya-18g.json",
    htmlProfile: "../../data/verification/aerodromnaya-18g.json",
    expected: { sources: 6, claims: 13, critical: 8 }
  },
  {
    page: "catalog/sennaya-76/index.html",
    profile: "data/verification/sennaya-76.json",
    htmlProfile: "../../data/verification/sennaya-76.json",
    expected: { sources: 7, claims: 19, critical: 13 }
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

function count(source, fragment) {
  return source.split(fragment).length - 1;
}

const runtime = read(RUNTIME_PATH);

[
  'document.querySelectorAll("[data-verification-summary]")',
  'section.dataset.verificationProfile',
  'fetch(new URL(profileUrl, window.location.href)',
  'cache: "no-store"',
  'credentials: "same-origin"',
  'source?.status === "verified"',
  'claim?.importance === "critical"',
  'claim?.verification_status === "confirmed"',
  'block.className = "notice project-verification-summary"',
  'block.setAttribute("role", "status")',
  'metrics.textContent = `Внутренняя актуализация:',
  'note.textContent = "Точные характеристики не публикуются',
  'Статус проверки временно недоступен'
].forEach((fragment) => {
  if (!runtime.includes(fragment)) errors.push(`${RUNTIME_PATH}: missing ${fragment}`);
});

for (const forbidden of [
  "innerHTML",
  "claim.value",
  "claim?.value",
  "source.title",
  "source?.title",
  "source.notes",
  "source?.notes",
  "JSON.stringify(profile)",
  "JSON.stringify(claims)",
  "JSON.stringify(sources)"
]) {
  if (runtime.includes(forbidden)) {
    errors.push(`${RUNTIME_PATH}: forbidden profile detail rendering token ${forbidden}`);
  }
}

if (!runtime.includes('metrics.textContent = `Внутренняя актуализация: ${summary.updatedAt}. Проверено источников: ${summary.sourcesVerified} из ${summary.sourcesTotal}. Подтверждено критических фактов: ${summary.criticalConfirmed} из ${summary.criticalTotal}.`;')) {
  errors.push(`${RUNTIME_PATH}: aggregate-only metrics template changed`);
}

for (const project of PROJECTS) {
  const html = read(project.page);
  const profile = readJson(project.profile);

  if (count(html, "data-verification-summary") !== 1) {
    errors.push(`${project.page}: expected exactly one verification summary section`);
  }
  if (count(html, `data-verification-profile="${project.htmlProfile}"`) !== 1) {
    errors.push(`${project.page}: expected exact verification profile path ${project.htmlProfile}`);
  }
  const scriptTag = '<script src="../../assets/js/project-verification-summary.js"></script>';
  if (count(html, scriptTag) !== 1) {
    errors.push(`${project.page}: verification summary runtime must load exactly once`);
  }

  const mainPosition = html.indexOf('<script src="../../assets/js/main.js"></script>');
  const summaryPosition = html.indexOf(scriptTag);
  const schemaPosition = html.indexOf('<script src="../../assets/js/schema.js"></script>');
  if (mainPosition < 0 || summaryPosition < 0 || schemaPosition < 0 || !(mainPosition < summaryPosition && summaryPosition < schemaPosition)) {
    errors.push(`${project.page}: runtime order must be main.js -> project-verification-summary.js -> schema.js`);
  }
  if (!html.includes('content="noindex,follow"')) {
    errors.push(`${project.page}: page must remain noindex,follow`);
  }

  const sources = Array.isArray(profile?.sources) ? profile.sources : [];
  const claims = Array.isArray(profile?.claims) ? profile.claims : [];
  const critical = claims.filter((claim) => claim.importance === "critical");
  const confirmedCritical = critical.filter((claim) => claim.verification_status === "confirmed");
  const verifiedSources = sources.filter(
    (source) => source.status === "verified" && /^https:\/\//i.test(String(source.reference || ""))
  );

  if (sources.length !== project.expected.sources) {
    errors.push(`${project.profile}: expected ${project.expected.sources} sources, found ${sources.length}`);
  }
  if (claims.length !== project.expected.claims) {
    errors.push(`${project.profile}: expected ${project.expected.claims} claims, found ${claims.length}`);
  }
  if (critical.length !== project.expected.critical) {
    errors.push(`${project.profile}: expected ${project.expected.critical} critical claims, found ${critical.length}`);
  }
  if (verifiedSources.length !== 0 || confirmedCritical.length !== 0) {
    errors.push(`${project.profile}: validator must be reviewed when verification progress changes`);
  }
  if (claims.some((claim) => claim.publication_allowed !== false)) {
    errors.push(`${project.profile}: all claims must remain non-public in the current state`);
  }
}

console.log(`Project verification summary pages: ${PROJECTS.length}`);
console.log("Rendered fields: updated_at + source counts + critical claim counts");
console.log("Rendered claim values: 0");
console.log("Rendered source details: 0");

if (errors.length) {
  console.error("\nProject verification summary validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Project verification summary validation passed.");