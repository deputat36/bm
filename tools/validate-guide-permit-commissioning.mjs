import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARTICLE_PATH = "guides/kak-proverit-razreshenie-na-vvod/index.html";
const GUIDE_INDEX_PATH = "guides/index.html";
const SITEMAP_PATH = "sitemap.xml";
const errors = [];

function read(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function requireFragment(source, fragment, label = ARTICLE_PATH) {
  if (!source.includes(fragment)) errors.push(`${label}: missing ${fragment}`);
}

const article = read(ARTICLE_PATH);
const guideIndex = read(GUIDE_INDEX_PATH);
const sitemap = read(SITEMAP_PATH);
if (!article || !guideIndex || !sitemap) process.exit(1);

[
  '<meta name="robots" content="noindex,follow">',
  '<link rel="canonical" href="https://novostroyki-borisoglebsk.ru/guides/kak-proverit-razreshenie-na-vvod/">',
  '<h1>Как проверить разрешение на ввод дома в эксплуатацию</h1>',
  'Материал проверен 16 июля 2026 года',
  'статья 55 Градостроительного кодекса Российской Федерации',
  'редакция от 23 марта 2026 года',
  'вступившими в силу 1 июля 2026 года',
  'Для покупателя это важный документ, но не единственная проверка.',
  'Разрешение может относиться не ко всему проекту одновременно, а к отдельному этапу строительства.',
  'Продажа «только за наличные» не является доказательством законности или незаконности схемы',
  'Материал носит справочный характер',
  'data-track-placement="guide_commissioning_footer"',
  'href="../../contacts/?lead_source=internal_content&amp;placement=guide_commissioning_footer#quick-lead"',
  'https://www.consultant.ru/document/cons_doc_LAW_51040/935a657a2b5f7c7a6436cb756694bb2d649c7a00/'
].forEach((fragment) => requireFragment(article, fragment));

if (!guideIndex.includes('href="kak-proverit-razreshenie-na-vvod/"')) {
  errors.push(`${GUIDE_INDEX_PATH}: article card is missing`);
}
if (sitemap.includes("kak-proverit-razreshenie-na-vvod")) {
  errors.push(`${SITEMAP_PATH}: noindex article must not be in sitemap`);
}

if (/<form\b/i.test(article)) errors.push(`${ARTICLE_PATH}: standalone form is forbidden`);
if (/<(?:input|textarea|select)\b/i.test(article)) errors.push(`${ARTICLE_PATH}: contact fields are forbidden`);
if (/application\/ld\+json/i.test(article)) errors.push(`${ARTICLE_PATH}: Article schema is deferred until review`);

const placements = Array.from(article.matchAll(/data-track-placement="([^"]+)"/g), (match) => match[1]);
if (placements.length !== 1 || placements[0] !== "guide_commissioning_footer") {
  errors.push(`${ARTICLE_PATH}: expected exactly one tracked CTA placement`);
}

const trackedActions = Array.from(article.matchAll(/data-track-action="([^"]+)"/g), (match) => match[1]);
if (trackedActions.length !== 1 || trackedActions[0] !== "quick_selection") {
  errors.push(`${ARTICLE_PATH}: expected exactly one quick_selection CTA`);
}

const objectSpecificFragments = [
  "Просторная 4А",
  "Аэродромная 18Г",
  "Сенная 76",
  "Теллерманов сад",
  "BM Group",
  "БМ Групп"
];
objectSpecificFragments.forEach((fragment) => {
  if (article.includes(fragment)) errors.push(`${ARTICLE_PATH}: object-specific fragment is forbidden: ${fragment}`);
});

const misleadingClaims = [
  "гарантируем безопасность",
  "гарантированно законная сделка",
  "официальный сайт застройщика",
  "разрешение на ввод гарантирует отсутствие обременений",
  "дом сдан, значит можно безопасно платить"
];
misleadingClaims.forEach((fragment) => {
  if (article.toLowerCase().includes(fragment.toLowerCase())) {
    errors.push(`${ARTICLE_PATH}: misleading claim is forbidden: ${fragment}`);
  }
});

if (!article.includes('../../assets/js/analytics-debug.js')) errors.push(`${ARTICLE_PATH}: analytics debug runtime is missing`);
if (!article.includes('../../assets/js/conversion-tracking.js')) errors.push(`${ARTICLE_PATH}: conversion tracking runtime is missing`);
if (!article.includes('../../assets/js/schema.js')) errors.push(`${ARTICLE_PATH}: schema runtime is missing`);

console.log("Guide intent: проверить разрешение на ввод");
console.log(`Tracked CTA placements: ${placements.length}`);
console.log(`Standalone forms: ${/<form\b/i.test(article) ? 1 : 0}`);
console.log(`Object-specific claims: ${objectSpecificFragments.filter((fragment) => article.includes(fragment)).length}`);
console.log(`Listed in sitemap: ${sitemap.includes("kak-proverit-razreshenie-na-vvod")}`);

if (errors.length) {
  console.error("\nPermit commissioning guide validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Permit commissioning guide validation passed.");