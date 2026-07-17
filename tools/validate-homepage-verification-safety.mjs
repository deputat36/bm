import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HOMEPAGE_PATH = "index.html";
const READINESS_PATH = "docs/portal/PROJECT_VERIFICATION_READINESS.md";
const RUNTIME_PATH = "assets/js/buyer-project-content.js";
const LOADER_PATH = "assets/js/page-accessibility.js";
const PROFILE_PATH = "data/verification/prostornaya-4a.json";
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

function extractArticle(html, heading) {
  const headingIndex = html.indexOf(`<h3>${heading}</h3>`);
  if (headingIndex < 0) return "";
  const articleStart = html.lastIndexOf("<article", headingIndex);
  const articleEnd = html.indexOf("</article>", headingIndex);
  if (articleStart < 0 || articleEnd < 0) return "";
  return html.slice(articleStart, articleEnd + "</article>".length);
}

const homepage = read(HOMEPAGE_PATH);
const readiness = read(READINESS_PATH);
const runtime = read(RUNTIME_PATH);
const loader = read(LOADER_PATH);
const profile = readJson(PROFILE_PATH);
if (!homepage || !readiness || !runtime || !loader || !profile) process.exit(1);

if (!homepage.includes('<link rel="canonical" href="https://novostroyki-borisoglebsk.ru/">')) {
  errors.push(`${HOMEPAGE_PATH}: root canonical is missing`);
}
if (/name=["']robots["'][^>]*noindex/i.test(homepage)) {
  errors.push(`${HOMEPAGE_PATH}: root page is expected to remain indexable`);
}

const publicReadyMatch = readiness.match(/Готово к публичной публикации:\s*(\d+)\s*из\s*(\d+)/i);
const criticalMatch = readiness.match(/ЖК «Теллерманов сад»[\s\S]*?Critical claims:\s*(\d+)\s*из\s*(\d+)\s*confirmed/i)
  || readiness.match(/Critical claims:\s*(\d+)\s*из\s*(\d+)\s*подтверждены/i);
const publicReady = publicReadyMatch ? Number(publicReadyMatch[1]) : NaN;
const confirmedCritical = criticalMatch ? Number(criticalMatch[1]) : NaN;

if (!Number.isFinite(publicReady) || !Number.isFinite(confirmedCritical)) {
  errors.push(`${READINESS_PATH}: readiness counters could not be parsed`);
}
if (publicReady !== 0) errors.push(`${READINESS_PATH}: full launch gate must remain closed`);
if (confirmedCritical < 6) errors.push(`${READINESS_PATH}: confirmed critical progress for Tellermanov is missing`);

const projects = ["Просторная 4А", "Аэродромная 18Г", "Сенная 76"];
for (const project of projects) {
  const article = extractArticle(homepage, project);
  if (!article) {
    errors.push(`${HOMEPAGE_PATH}: fallback card not found for ${project}`);
    continue;
  }
  if (!article.includes("Данные уточняются")) {
    errors.push(`${HOMEPAGE_PATH}: static fallback for ${project} must remain cautious`);
  }
}

const publicClaims = (profile.claims || []).filter(
  (claim) => claim.verification_status === "confirmed" && claim.publication_allowed === true
);
if (publicClaims.length < 21) errors.push(`${PROFILE_PATH}: insufficient confirmed buyer claims`);

for (const claim of publicClaims) {
  const allVerified = (claim.source_ids || []).every((sourceId) => {
    const source = (profile.sources || []).find((item) => item.id === sourceId);
    return source?.status === "verified" && /^https:\/\//i.test(String(source.reference || ""));
  });
  if (!allVerified) errors.push(`${PROFILE_PATH}:${claim.field}: homepage claim source is not verified`);
}

for (const fragment of [
  'claim?.publication_allowed === true',
  'CONFIRMED_STATUSES.has',
  'findHomepageProjectCard',
  'ЖК «Теллерманов сад»',
  'Узнать цены и наличие',
  'window.__NEWBUILD_BUYER_PROJECT_CONTENT__ = true'
]) {
  if (!runtime.includes(fragment)) errors.push(`${RUNTIME_PATH}: missing safe buyer fragment ${fragment}`);
}
if (!loader.includes('new URL("buyer-project-content.js", scriptUrl).href')) {
  errors.push(`${LOADER_PATH}: buyer content runtime is not loaded`);
}

for (const forbidden of [
  "api.web3forms.com",
  "WEB3FORMS_ACCESS_KEY",
  "current_price",
  "current_availability",
  "localStorage.setItem",
  "sessionStorage.setItem",
  "navigator.userAgent"
]) {
  if (runtime.includes(forbidden)) errors.push(`${RUNTIME_PATH}: forbidden token ${forbidden}`);
}

const staticForbiddenFragments = [
  "9 этажей",
  "70 квартир",
  "27,71–63,76 м²",
  "30.09.2028"
];
for (const fragment of staticForbiddenFragments) {
  if (homepage.includes(fragment)) errors.push(`${HOMEPAGE_PATH}: working-copy detail leaked into static homepage: ${fragment}`);
}

console.log(`Public-ready projects: ${publicReady}`);
console.log(`Confirmed critical claims for Tellermanov: ${confirmedCritical}`);
console.log(`Homepage confirmed buyer claims: ${publicClaims.length}`);
console.log("Static fallback cards remain cautious; verified buyer content loads from the profile.");

if (errors.length) {
  console.error("\nHomepage verification safety errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Homepage verification safety validation passed.");
