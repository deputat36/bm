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
    expected: { sourcesMin: 5, claimsMin: 30, criticalMin: 8, confirmedCriticalMin: 6, publicClaimsMin: 21, verifiedSourcesMin: 4 }
  },
  {
    page: "catalog/aerodromnaya-18g/index.html",
    profile: "data/verification/aerodromnaya-18g.json",
    htmlProfile: "../../data/verification/aerodromnaya-18g.json",
    expected: { sourcesMin: 9, claimsMin: 23, criticalMin: 8, confirmedCriticalMin: 1, publicClaimsMin: 10, verifiedSourcesMin: 3 }
  },
  {
    page: "catalog/sennaya-76/index.html",
    profile: "data/verification/sennaya-76.json",
    htmlProfile: "../../data/verification/sennaya-76.json",
    expected: { sourcesMin: 8, claimsMin: 32, criticalMin: 13, confirmedCriticalMin: 1, publicClaimsMin: 14, verifiedSourcesMin: 1 }
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
  'claim?.publication_allowed === true',
  'publicClaims: publicClaims.length',
  'Опубликовано подтверждённых характеристик',
  'Текущая цена, наличие квартир, акции и индивидуальные условия проверяются отдельно',
  'block.className = "notice project-verification-summary"',
  'block.setAttribute("role", "status")',
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
  if (runtime.includes(forbidden)) errors.push(`${RUNTIME_PATH}: forbidden profile detail rendering token ${forbidden}`);
}

for (const project of PROJECTS) {
  const html = read(project.page);
  const profile = readJson(project.profile);
  if (count(html, "data-verification-summary") !== 1) errors.push(`${project.page}: expected exactly one verification summary section`);
  if (count(html, `data-verification-profile="${project.htmlProfile}"`) !== 1) errors.push(`${project.page}: expected exact verification profile path ${project.htmlProfile}`);
  const scriptTag = '<script src="../../assets/js/project-verification-summary.js"></script>';
  if (count(html, scriptTag) !== 1) errors.push(`${project.page}: verification summary runtime must load exactly once`);
  const mainPosition = html.indexOf('<script src="../../assets/js/main.js"></script>');
  const summaryPosition = html.indexOf(scriptTag);
  const schemaPosition = html.indexOf('<script src="../../assets/js/schema.js"></script>');
  if (mainPosition < 0 || summaryPosition < 0 || schemaPosition < 0 || !(mainPosition < summaryPosition && summaryPosition < schemaPosition)) {
    errors.push(`${project.page}: runtime order must be main.js -> project-verification-summary.js -> schema.js`);
  }
  if (!html.includes('content="noindex,follow"')) errors.push(`${project.page}: page must remain noindex,follow`);

  const sources = Array.isArray(profile?.sources) ? profile.sources : [];
  const claims = Array.isArray(profile?.claims) ? profile.claims : [];
  const critical = claims.filter((claim) => claim.importance === "critical");
  const confirmedCritical = critical.filter((claim) => claim.verification_status === "confirmed");
  const publicClaims = claims.filter((claim) => claim.verification_status === "confirmed" && claim.publication_allowed === true);
  const verifiedSources = sources.filter((source) => source.status === "verified" && /^https:\/\//i.test(String(source.reference || "")));

  if (sources.length < project.expected.sourcesMin) errors.push(`${project.profile}: expected at least ${project.expected.sourcesMin} sources`);
  if (claims.length < project.expected.claimsMin) errors.push(`${project.profile}: expected at least ${project.expected.claimsMin} claims`);
  if (critical.length < project.expected.criticalMin) errors.push(`${project.profile}: expected at least ${project.expected.criticalMin} critical claims`);
  if (confirmedCritical.length < project.expected.confirmedCriticalMin) errors.push(`${project.profile}: expected confirmed critical progress`);
  if (publicClaims.length < project.expected.publicClaimsMin) errors.push(`${project.profile}: expected confirmed buyer claims`);
  if (verifiedSources.length < project.expected.verifiedSourcesMin) errors.push(`${project.profile}: expected verified source progress`);

  publicClaims.forEach((claim) => {
    const allVerified = (claim.source_ids || []).every((sourceId) => {
      const source = sources.find((item) => item.id === sourceId);
      return source?.status === "verified" && /^https:\/\//i.test(String(source.reference || ""));
    });
    if (!allVerified) errors.push(`${project.profile}:${claim.field}: public claim requires verified sources`);
  });
}

console.log(`Project verification summary pages: ${PROJECTS.length}`);
console.log("Rendered fields: updated_at + source counts + critical claim counts + public claim count");
console.log("Rendered claim values: 0");
console.log("Rendered source details: 0");

if (errors.length) {
  console.error("\nProject verification summary validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Project verification summary validation passed.");