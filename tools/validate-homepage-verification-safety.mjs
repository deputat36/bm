import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HOMEPAGE_PATH = "index.html";
const READINESS_PATH = "docs/portal/PROJECT_VERIFICATION_READINESS.md";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function extractArticle(html, heading) {
  const headingIndex = html.indexOf(`<h3>${heading}</h3>`);
  if (headingIndex < 0) return "";
  const articleStart = html.lastIndexOf("<article", headingIndex);
  const articleEnd = html.indexOf("</article>", headingIndex);
  if (articleStart < 0 || articleEnd < 0) return "";
  return html.slice(articleStart, articleEnd + "</article>".length);
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const homepage = read(HOMEPAGE_PATH);
const readiness = read(READINESS_PATH);
if (!homepage || !readiness) process.exit(1);

if (!homepage.includes('<link rel="canonical" href="https://novostroyki-borisoglebsk.ru/">')) {
  errors.push(`${HOMEPAGE_PATH}: root canonical is missing`);
}
if (/name=["']robots["'][^>]*noindex/i.test(homepage)) {
  errors.push(`${HOMEPAGE_PATH}: root page is expected to remain indexable`);
}

const publicReadyMatch = readiness.match(/Готово к публичной публикации:\s*(\d+)\s*из\s*(\d+)/i);
const criticalMatch = readiness.match(/Просторная 4А[\s\S]*?Critical claims:\s*(\d+)\s*из\s*(\d+)\s*подтверждены/i);
const publicReady = publicReadyMatch ? Number(publicReadyMatch[1]) : NaN;
const confirmedCritical = criticalMatch ? Number(criticalMatch[1]) : NaN;

if (!Number.isFinite(publicReady) || !Number.isFinite(confirmedCritical)) {
  errors.push(`${READINESS_PATH}: readiness counters could not be parsed`);
}
if (publicReady !== 0) {
  errors.push(`${READINESS_PATH}: validator must be reviewed when any project becomes public_ready`);
}
if (confirmedCritical !== 0) {
  errors.push(`${READINESS_PATH}: validator must be reviewed when Просторная 4А has confirmed critical claims`);
}

const projects = ["Просторная 4А", "Аэродромная 18Г", "Сенная 76"];
for (const project of projects) {
  const article = extractArticle(homepage, project);
  if (!article) {
    errors.push(`${HOMEPAGE_PATH}: card not found for ${project}`);
    continue;
  }
  if (!article.includes("Данные уточняются")) {
    errors.push(`${HOMEPAGE_PATH}: ${project} card must say Данные уточняются`);
  }
}

const prostornayaArticle = extractArticle(homepage, "Просторная 4А");
const prostornayaText = visibleText(prostornayaArticle).replace("Просторная 4А", "");

[
  "проверяем первичные сведения",
  "Точные характеристики не публикуются без первичных источников",
  "какие данные подтверждены на момент обращения"
].forEach((fragment) => {
  if (!prostornayaArticle.includes(fragment)) {
    errors.push(`${HOMEPAGE_PATH}: Просторная 4А safe card missing ${fragment}`);
  }
});

const forbiddenFragments = [
  "Строится · данные частично подтверждены",
  "Дом, связанный с ЖК «Теллерманов сад»",
  "9 этажей",
  "70 квартир",
  "27,71–63,76 м²",
  "I квартал 2028 года",
  "30.09.2028"
];
for (const fragment of forbiddenFragments) {
  if (homepage.includes(fragment)) {
    errors.push(`${HOMEPAGE_PATH}: unverified fragment is public: ${fragment}`);
  }
}

const metricPattern = /\b\d+(?:[.,]\d+)?\s*(?:этаж(?:а|ей)?|квартир(?:а|ы)?|м²)\b/i;
const datePattern = /(?:\b[IVX]+\s+квартал\s+\d{4}\b|\b\d{2}\.\d{2}\.\d{4}\b)/i;
if (metricPattern.test(prostornayaText)) {
  errors.push(`${HOMEPAGE_PATH}: Просторная 4А card contains an unverified numeric characteristic`);
}
if (datePattern.test(prostornayaText)) {
  errors.push(`${HOMEPAGE_PATH}: Просторная 4А card contains an unverified date`);
}

console.log(`Public-ready projects: ${publicReady}`);
console.log(`Confirmed critical claims for Просторная 4А: ${confirmedCritical}`);
console.log(`Homepage project cards checked: ${projects.length}`);
console.log("Public exact project characteristics allowed: 0");

if (errors.length) {
  console.error("\nHomepage verification safety errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Homepage verification safety validation passed.");