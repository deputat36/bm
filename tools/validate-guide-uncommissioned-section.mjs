import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARTICLE_PATH = "guides/pokupka-kvartiry-v-nevvedennoy-sektsii/index.html";
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
  '<link rel="canonical" href="https://novostroyki-borisoglebsk.ru/guides/pokupka-kvartiry-v-nevvedennoy-sektsii/">',
  '<h1>Покупка квартиры в ещё не введённой секции</h1>',
  'Материал проверен 16 июля 2026 года',
  'Договор участия в долевом строительстве заключается письменно, подлежит государственной регистрации',
  'Фраза «продаётся только за наличные» сама по себе не подтверждает ни безопасность, ни незаконность сделки.',
  'действующая на 16 июля 2026 года редакция Федерального закона',
  'статьи 4, 15.4 и 17',
  'Последняя указанная редакция закона — от 9 апреля 2026 года.',
  'https://www.consultant.ru/document/cons_doc_LAW_51038/',
  'data-track-placement="guide_uncommissioned_section_footer"',
  'href="../../contacts/?lead_source=internal_content&amp;placement=guide_uncommissioned_section_footer#quick-lead"'
].forEach((fragment) => requireFragment(article, fragment));

if (!guideIndex.includes('href="pokupka-kvartiry-v-nevvedennoy-sektsii/"')) {
  errors.push(`${GUIDE_INDEX_PATH}: article card is missing`);
}
if (sitemap.includes("pokupka-kvartiry-v-nevvedennoy-sektsii")) {
  errors.push(`${SITEMAP_PATH}: noindex article must not be in sitemap`);
}

if (/<form\b/i.test(article)) errors.push(`${ARTICLE_PATH}: standalone form is forbidden`);
if (/<(?:input|textarea|select)\b/i.test(article)) errors.push(`${ARTICLE_PATH}: contact fields are forbidden`);
if (/application\/ld\+json/i.test(article)) errors.push(`${ARTICLE_PATH}: Article schema is deferred until review`);

const placements = Array.from(article.matchAll(/data-track-placement="([^"]+)"/g), (match) => match[1]);
if (placements.length !== 1 || placements[0] !== "guide_uncommissioned_section_footer") {
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
  "сделка полностью безопасна",
  "официальный сайт застройщика",
  "только наличные означает незаконную продажу",
  "наличные гарантируют скидку",
  "можно переводить деньги без проверки"
];
misleadingClaims.forEach((fragment) => {
  if (article.toLowerCase().includes(fragment.toLowerCase())) {
    errors.push(`${ARTICLE_PATH}: misleading claim is forbidden: ${fragment}`);
  }
});

[
  '../../assets/js/analytics-debug.js',
  '../../assets/js/conversion-tracking.js',
  '../../assets/js/schema.js'
].forEach((fragment) => requireFragment(article, fragment));

console.log("Guide intent: покупка квартиры в невведённой секции");
console.log(`Tracked CTA placements: ${placements.length}`);
console.log(`Standalone forms: ${/<form\b/i.test(article) ? 1 : 0}`);
console.log(`Object-specific claims: ${objectSpecificFragments.filter((fragment) => article.includes(fragment)).length}`);
console.log(`Listed in sitemap: ${sitemap.includes("pokupka-kvartiry-v-nevvedennoy-sektsii")}`);

if (errors.length) {
  console.error("\nUncommissioned section guide validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Uncommissioned section guide validation passed.");
