import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = path.join(ROOT, "index.html");
const CSS_PATH = path.join(ROOT, "assets/css/faq-accordion.css");
const SOURCE_MAP_PATH = path.join(ROOT, "data/design/portal-v2.source-map.json");
const READINESS_BUILDER_PATH = path.join(ROOT, "tools/build-figma-code-connect-readiness.mjs");

const expectedFaq = [
  {
    question: "Где посмотреть новостройки Борисоглебска?",
    answer: "На портале собраны карточки новых домов Борисоглебска. Сведения по каждому объекту публикуются с указанием статуса проверки, а неподтверждённые цены и наличие не выдаются за актуальные."
  },
  {
    question: "Как узнать актуальные цены и наличие квартир?",
    answer: "Оставьте заявку или позвоните специалисту. Перед консультацией уточняются доступные на дату обращения сведения о цене, наличии, документах и способе покупки."
  },
  {
    question: "Можно ли подобрать 1-, 2- или 3-комнатную квартиру?",
    answer: "Да. В заявке можно указать нужную комнатность, бюджет, способ покупки и срок. Подбор не является бронью и не фиксирует стоимость квартиры."
  },
  {
    question: "Можно ли купить квартиру с семейной ипотекой?",
    answer: "Возможность применения семейной ипотеки зависит от актуальных условий программы, характеристик объекта и ситуации покупателя. Это проверяется отдельно перед расчётом."
  },
  {
    question: "Какие документы нужно проверить перед покупкой?",
    answer: "Набор документов зависит от объекта и схемы сделки. Обычно проверяют сведения о продавце или застройщике, разрешительные документы, договор, порядок оплаты и подтверждение полномочий стороны сделки."
  },
  {
    question: "Портал является сайтом застройщика?",
    answer: "Нет. Портал является независимым городским каталогом новостроек Борисоглебска. Информация сверяется по доступным источникам и уточняется перед консультацией."
  }
];

const errors = [];
function assert(condition, message) {
  if (!condition) errors.push(message);
}
function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`Cannot read JSON ${path.relative(ROOT, filePath)}: ${error.message}`);
    return null;
  }
}

for (const filePath of [INDEX_PATH, CSS_PATH, SOURCE_MAP_PATH, READINESS_BUILDER_PATH]) {
  assert(fs.existsSync(filePath), `Missing required file: ${path.relative(ROOT, filePath)}`);
}

const html = fs.existsSync(INDEX_PATH) ? fs.readFileSync(INDEX_PATH, "utf8") : "";
const css = fs.existsSync(CSS_PATH) ? fs.readFileSync(CSS_PATH, "utf8") : "";
const sourceMap = fs.existsSync(SOURCE_MAP_PATH) ? readJson(SOURCE_MAP_PATH) : null;

assert(html.includes('<link rel="stylesheet" href="assets/css/faq-accordion.css">'), "index.html does not load faq-accordion.css");
assert(html.includes('class="faq-list" data-faq-accordion'), "FAQ container misses data-faq-accordion");
assert(count(html, '<details class="faq-item" data-faq-item') === 6, "FAQ must contain exactly six details elements");
assert(count(html, '<details class="faq-item" data-faq-item open>') === 1, "FAQ must have exactly one default-open item");
assert(count(html, "<summary>") === 6, "FAQ must contain exactly six summary elements");
assert(count(html, 'class="faq-item__answer"') === 6, "FAQ must contain exactly six answer containers");
assert(!html.includes('<article class="card"><h3>Где посмотреть новостройки Борисоглебска?'), "Legacy static FAQ card markup is still present");

const faqStart = html.indexOf('<section class="section--soft" id="faq">');
const faqEnd = html.indexOf('<section class="cta" id="lead">', faqStart);
assert(faqStart >= 0 && faqEnd > faqStart, "Cannot isolate visible FAQ section");
const visibleFaq = faqStart >= 0 && faqEnd > faqStart ? html.slice(faqStart, faqEnd) : "";
assert(visibleFaq.indexOf('<details class="faq-item" data-faq-item open>') < visibleFaq.indexOf('<details class="faq-item" data-faq-item>'), "The first FAQ item must be the default-open item");

const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => {
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      errors.push(`Invalid JSON-LD block: ${error.message}`);
      return null;
    }
  })
  .filter(Boolean);
const faqSchema = jsonLdBlocks.find((item) => item["@type"] === "FAQPage");
assert(Boolean(faqSchema), "FAQPage JSON-LD is missing");
assert(Array.isArray(faqSchema?.mainEntity) && faqSchema.mainEntity.length === 6, "FAQPage JSON-LD must contain six questions");

for (const item of expectedFaq) {
  assert(count(visibleFaq, item.question) === 1, `Visible FAQ question must occur once: ${item.question}`);
  assert(count(visibleFaq, item.answer) === 1, `Visible FAQ answer must occur once: ${item.question}`);
  const schemaQuestion = faqSchema?.mainEntity?.find((entry) => entry.name === item.question);
  assert(Boolean(schemaQuestion), `FAQPage JSON-LD misses question: ${item.question}`);
  assert(schemaQuestion?.acceptedAnswer?.text === item.answer, `FAQPage answer differs from visible answer: ${item.question}`);
}

for (const marker of [
  ".faq-list {",
  ".faq-item {",
  ".faq-item[open] {",
  ".faq-item summary {",
  ".faq-item summary::-webkit-details-marker",
  ".faq-item summary:focus-visible",
  ".faq-item[open] summary::after",
  ".faq-item__answer {",
  "@media (max-width: 640px)",
  "@media (prefers-reduced-motion: reduce)"
]) assert(css.includes(marker), `FAQ stylesheet misses marker: ${marker}`);

if (sourceMap) {
  assert(sourceMap.production?.styles?.includes("assets/css/faq-accordion.css"), "Source map production styles miss faq-accordion.css");
  const faqComponent = sourceMap.components?.find((item) => item.id === "faq-accordion");
  assert(faqComponent?.mapping === "direct", "FAQ Accordion source mapping must be direct");
  assert(Array.isArray(faqComponent?.selectors) && faqComponent.selectors.includes(".faq-item"), "FAQ Accordion selectors miss .faq-item");
  assert(faqComponent?.selectors?.includes(".faq-item summary"), "FAQ Accordion selectors miss summary");
  assert(faqComponent?.selectors?.includes(".faq-item__answer"), "FAQ Accordion selectors miss answer container");
  assert(!faqComponent?.implementationGap, "FAQ Accordion still contains implementationGap metadata");
  const faqScreen = sourceMap.screens?.find((item) => item.id === "homepage-faq-lead");
  assert(faqScreen?.mapping === "direct", "Homepage FAQ & Lead screen source mapping must be direct");
  assert(!(sourceMap.components || []).some((item) => item.mapping === "gap"), "Component source map still contains a gap");
  assert(!(sourceMap.screens || []).some((item) => item.mapping === "gap"), "Screen source map still contains a gap");
}

if (fs.existsSync(READINESS_BUILDER_PATH) && sourceMap) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "faq-readiness-"));
  const run = spawnSync(process.execPath, [READINESS_BUILDER_PATH, tempDir], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024
  });
  assert(run.status === 0, `Code Connect readiness builder failed: ${run.stderr.trim()}`);
  const manifestPath = path.join(tempDir, "manifest.json");
  const gapsPath = path.join(tempDir, "gaps.json");
  const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : null;
  const gaps = fs.existsSync(gapsPath) ? readJson(gapsPath) : null;
  assert(manifest?.directMappings === 8, "Readiness manifest must contain eight direct component mappings");
  assert(manifest?.composedMappings === 6, "Readiness manifest must contain six composed component mappings");
  assert(manifest?.gapMappings === 0, "Readiness manifest must contain zero component gaps");
  assert(Array.isArray(gaps) && gaps.length === 0, "Readiness gaps.json must be empty");
  fs.rmSync(tempDir, { recursive: true, force: true });
}

if (errors.length) {
  console.error(`Homepage FAQ accordion validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Homepage FAQ accordion validation passed.");
