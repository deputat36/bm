import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(ROOT, relativePath), content, "utf8");
}

function replaceRequired(content, before, after, label) {
  if (content.includes(after)) return content;
  if (!content.includes(before)) {
    throw new Error(`Cannot migrate ${label}: expected source fragment was not found`);
  }
  return content.replace(before, after);
}

const faqQuestions = [
  [
    "Где посмотреть новостройки Борисоглебска?",
    "На портале собраны карточки новых домов Борисоглебска. Сведения по каждому объекту публикуются с указанием статуса проверки, а неподтверждённые цены и наличие не выдаются за актуальные."
  ],
  [
    "Как узнать актуальные цены и наличие квартир?",
    "Оставьте заявку или позвоните специалисту. Перед консультацией уточняются доступные на дату обращения сведения о цене, наличии, документах и способе покупки."
  ],
  [
    "Можно ли подобрать 1-, 2- или 3-комнатную квартиру?",
    "Да. В заявке можно указать нужную комнатность, бюджет, способ покупки и срок. Подбор не является бронью и не фиксирует стоимость квартиры."
  ],
  [
    "Можно ли купить квартиру с семейной ипотекой?",
    "Возможность применения семейной ипотеки зависит от актуальных условий программы, характеристик объекта и ситуации покупателя. Это проверяется отдельно перед расчётом."
  ],
  [
    "Какие документы нужно проверить перед покупкой?",
    "Набор документов зависит от объекта и схемы сделки. Обычно проверяют сведения о продавце или застройщике, разрешительные документы, договор, порядок оплаты и подтверждение полномочий стороны сделки."
  ],
  [
    "Портал является сайтом застройщика?",
    "Нет. Портал является независимым городским каталогом новостроек Борисоглебска. Информация сверяется по доступным источникам и уточняется перед консультацией."
  ]
];

const oldFaqMarkup = `        <div class="grid grid--3">
          <article class="card"><h3>Где посмотреть новостройки Борисоглебска?</h3><p>На портале собраны карточки новых домов Борисоглебска. Сведения по каждому объекту публикуются с указанием статуса проверки, а неподтверждённые цены и наличие не выдаются за актуальные.</p></article>
          <article class="card"><h3>Как узнать актуальные цены и наличие квартир?</h3><p>Оставьте заявку или позвоните специалисту. Перед консультацией уточняются доступные на дату обращения сведения о цене, наличии, документах и способе покупки.</p></article>
          <article class="card"><h3>Можно ли подобрать 1-, 2- или 3-комнатную квартиру?</h3><p>Да. В заявке можно указать нужную комнатность, бюджет, способ покупки и срок. Подбор не является бронью и не фиксирует стоимость квартиры.</p></article>
          <article class="card"><h3>Можно ли купить квартиру с семейной ипотекой?</h3><p>Возможность применения семейной ипотеки зависит от актуальных условий программы, характеристик объекта и ситуации покупателя. Это проверяется отдельно перед расчётом.</p></article>
          <article class="card"><h3>Какие документы нужно проверить перед покупкой?</h3><p>Набор документов зависит от объекта и схемы сделки. Обычно проверяют сведения о продавце или застройщике, разрешительные документы, договор, порядок оплаты и подтверждение полномочий стороны сделки.</p></article>
          <article class="card"><h3>Портал является сайтом застройщика?</h3><p>Нет. Портал является независимым городским каталогом новостроек Борисоглебска. Информация сверяется по доступным источникам и уточняется перед консультацией.</p></article>
        </div>`;

const newFaqItems = faqQuestions.map(([question, answer], index) => {
  const open = index === 0 ? " open" : "";
  return `          <details class="faq-item" data-faq-item${open}>\n            <summary>${question}</summary>\n            <div class="faq-item__answer"><p>${answer}</p></div>\n          </details>`;
}).join("\n");

const newFaqMarkup = `        <div class="faq-list" data-faq-accordion>\n${newFaqItems}\n        </div>`;

let html = read("index.html");
html = replaceRequired(
  html,
  '  <link rel="stylesheet" href="assets/css/leadgen.css">\n',
  '  <link rel="stylesheet" href="assets/css/leadgen.css">\n  <link rel="stylesheet" href="assets/css/faq-accordion.css">\n',
  "FAQ stylesheet link"
);
html = replaceRequired(html, oldFaqMarkup, newFaqMarkup, "FAQ HTML markup");
write("index.html", html);

const sourceMapPath = "data/design/portal-v2.source-map.json";
const sourceMap = JSON.parse(read(sourceMapPath));
if (!sourceMap.production.styles.includes("assets/css/faq-accordion.css")) {
  sourceMap.production.styles.push("assets/css/faq-accordion.css");
}

const faqComponent = sourceMap.components.find((item) => item.id === "faq-accordion");
if (!faqComponent) throw new Error("FAQ Accordion component is missing from source map");
faqComponent.mapping = "direct";
faqComponent.selectors = [".faq-list", ".faq-item", ".faq-item summary", ".faq-item__answer"];
faqComponent.sources = [
  {
    path: "index.html",
    markers: [
      "id=\"faq\"",
      "data-faq-accordion",
      "<details class=\"faq-item\" data-faq-item open>",
      "<summary>Где посмотреть новостройки Борисоглебска?</summary>"
    ]
  },
  {
    path: "assets/css/faq-accordion.css",
    markers: [
      ".faq-item[open] {",
      ".faq-item summary:focus-visible",
      ".faq-item[open] summary::after",
      "@media (max-width: 640px)"
    ]
  }
];
faqComponent.notes = "Production uses native semantic details/summary disclosure. The first item is open by default and the remaining items are closed, matching the Figma Open/Closed variants.";
delete faqComponent.implementationGap;

const faqScreen = sourceMap.screens.find((item) => item.id === "homepage-faq-lead");
if (!faqScreen) throw new Error("Homepage FAQ & Lead screen is missing from source map");
faqScreen.mapping = "direct";
faqScreen.sources = [
  {
    path: "index.html",
    markers: [
      "id=\"faq\"",
      "data-faq-accordion",
      "id=\"lead\"",
      "data-form-id=\"homepage_priority_selection\""
    ]
  },
  {
    path: "assets/css/faq-accordion.css",
    markers: [".faq-list {", ".faq-item {", ".faq-item__answer {"]
  }
];
faqScreen.notes = "Production FAQ and detailed lead form now match the composed Figma screen structure and disclosure states.";
write(sourceMapPath, `${JSON.stringify(sourceMap, null, 2)}\n`);

let builder = read("tools/build-figma-code-connect-readiness.mjs");
builder = replaceRequired(
  builder,
  '  `## Known gap\\n\\n` +\n  `FAQ Accordion is interactive in Figma but remains six static cards in production. Resolve this before declaring direct parity.\\n`;',
  '  `## Production parity\\n\\n` +\n  `All tracked component and screen mappings are direct or composed. The FAQ uses native semantic details/summary disclosure in production.\\n`;',
  "Code Connect readiness README"
);
write("tools/build-figma-code-connect-readiness.mjs", builder);

let validator = read("tools/validate-figma-source-map-readiness.mjs");
validator = replaceRequired(
  validator,
  `  assert(components.filter((item) => item.mapping === "direct").length === 7, "Expected 7 direct component mappings");
  assert(components.filter((item) => item.mapping === "composed").length === 6, "Expected 6 composed component mappings");
  assert(components.filter((item) => item.mapping === "gap").length === 1, "Expected one component gap");
  const faq = components.find((item) => item.id === "faq-accordion");
  assert(faq?.mapping === "gap", "FAQ Accordion must remain marked as a gap");
  assert(faq?.implementationGap?.production === "six static cards", "FAQ production gap must document static cards");
  assert(faq?.implementationGap?.figma?.includes("accordion"), "FAQ Figma gap must document accordion variants");
  const faqScreen = screens.find((item) => item.id === "homepage-faq-lead");
  assert(faqScreen?.mapping === "gap", "Homepage FAQ & Lead screen must remain marked as a gap");`,
  `  assert(components.filter((item) => item.mapping === "direct").length === 8, "Expected 8 direct component mappings");
  assert(components.filter((item) => item.mapping === "composed").length === 6, "Expected 6 composed component mappings");
  assert(components.filter((item) => item.mapping === "gap").length === 0, "Expected zero component gaps");
  const faq = components.find((item) => item.id === "faq-accordion");
  assert(faq?.mapping === "direct", "FAQ Accordion must be marked as direct");
  assert(faq?.selectors?.includes(".faq-item"), "FAQ Accordion selectors must include .faq-item");
  assert(faq?.selectors?.includes(".faq-item summary"), "FAQ Accordion selectors must include summary");
  assert(!faq?.implementationGap, "FAQ Accordion must not retain implementationGap metadata");
  const faqScreen = screens.find((item) => item.id === "homepage-faq-lead");
  assert(faqScreen?.mapping === "direct", "Homepage FAQ & Lead screen must be marked as direct");
  assert(screens.filter((item) => item.mapping === "gap").length === 0, "Expected zero screen gaps");`,
  "source-map mapping assertions"
);
validator = replaceRequired(
  validator,
  `    assert(manifest?.directMappings === 7, "Readiness manifest must contain 7 direct mappings");
    assert(manifest?.composedMappings === 6, "Readiness manifest must contain 6 composed mappings");
    assert(manifest?.gapMappings === 1, "Readiness manifest must contain one component gap");`,
  `    assert(manifest?.directMappings === 8, "Readiness manifest must contain 8 direct mappings");
    assert(manifest?.composedMappings === 6, "Readiness manifest must contain 6 composed mappings");
    assert(manifest?.gapMappings === 0, "Readiness manifest must contain zero component gaps");`,
  "readiness manifest assertions"
);
validator = replaceRequired(
  validator,
  `    assert(Array.isArray(gaps) && gaps.some((item) => item.id === "faq-accordion"), "Gaps artifact must include FAQ Accordion");
    assert(gaps.some((item) => item.id === "homepage-faq-lead"), "Gaps artifact must include Homepage FAQ & Lead");`,
  `    assert(Array.isArray(gaps) && gaps.length === 0, "Gaps artifact must be empty after FAQ parity is implemented");`,
  "readiness gaps assertions"
);
validator = replaceRequired(
  validator,
  `    "FAQ Accordion",
    "six static cards",
    "nodeId",`,
  `    "FAQ Accordion",
    "semantic details/summary",
    "gap closed",
    "nodeId",`,
  "documentation markers"
);
write("tools/validate-figma-source-map-readiness.mjs", validator);

const docs = `# Figma Source Map и Code Connect Readiness

Figma-файл:

\`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX\`

Документ продолжает issue №116 и связывает Design System v2 с production-кодом портала.

## Объём

Source map содержит:

- 14 ComponentSet;
- 119 вариантов;
- 7 экранов;
- production selectors;
- HTML, CSS и JavaScript sources;
- Figma generators;
- Code Connect prerequisites.

## Типы соответствия

- \`direct\` — самостоятельный production-аналог;
- \`composed\` — паттерн собирается из общей разметки;
- \`gap\` — поведение или структура ещё расходятся.

После внедрения FAQ:

- direct — 8 компонентов;
- composed — 6 компонентов;
- gap — 0 компонентов;
- screen gaps — 0.

## FAQ Accordion: gap closed

FAQ Accordion теперь имеет прямое production-соответствие.

Production использует semantic details/summary:

- контейнер \`.faq-list\`;
- элемент \`.faq-item\`;
- интерактивный \`summary\`;
- ответ \`.faq-item__answer\`;
- первый вопрос открыт по умолчанию;
- остальные вопросы закрыты;
- клавиатурное управление предоставляется браузером;
- \`:focus-visible\` показывает фокус;
- текст остаётся в HTML и доступен поисковым системам;
- FAQPage JSON-LD сохраняет те же шесть вопросов и ответов.

Figma Open/Closed variants и production disclosure теперь совпадают по смыслу.

## Production sources

Основные источники:

- \`index.html\`;
- \`assets/css/styles.css\`;
- \`assets/css/home-polish.css\`;
- \`assets/css/leadgen.css\`;
- \`assets/css/faq-accordion.css\`;
- \`assets/js/main.js\`.

## Проверка

Локально:

\`node tools/validate-homepage-faq-accordion.mjs\`

\`node tools/validate-figma-source-map-readiness.mjs\`

CI workflows:

- \`Homepage FAQ accordion\`;
- \`Figma source map readiness\`;
- \`Figma visual QA pack\`;
- \`Portal guards\`.

## Code Connect

Code Connect остаётся заблокирован по инфраструктурным причинам, не из-за production parity:

- текущий тариф Figma — Starter;
- требуется Organization or Enterprise;
- месячный MCP-лимит исчерпан;
- ComponentSet nodeId недоступны;
- публикация библиотеки не подтверждена.

Правило остаётся неизменным: nodeId нельзя придумывать. Он заполняется только после физического запуска Figma Execution Pack, публикации компонентов и чтения реальной metadata.

## Порядок после восстановления Figma MCP

1. Запустить Figma Execution Pack.
2. Запустить Figma Visual QA Pack.
3. Проверить FAQ Accordion Open/Closed.
4. Получить реальные ComponentSet nodeId.
5. Опубликовать библиотеку.
6. На подходящем плане подключить Code Connect.
7. Записать IDs и screenshots в issue №116.
`;
write("docs/design/FIGMA_SOURCE_MAP_AND_CODE_CONNECT_READINESS.md", docs);

console.log(JSON.stringify({
  updated: [
    "index.html",
    "data/design/portal-v2.source-map.json",
    "tools/build-figma-code-connect-readiness.mjs",
    "tools/validate-figma-source-map-readiness.mjs",
    "docs/design/FIGMA_SOURCE_MAP_AND_CODE_CONNECT_READINESS.md"
  ],
  faqItems: faqQuestions.length,
  directComponentMappings: sourceMap.components.filter((item) => item.mapping === "direct").length,
  componentGaps: sourceMap.components.filter((item) => item.mapping === "gap").length,
  screenGaps: sourceMap.screens.filter((item) => item.mapping === "gap").length
}, null, 2));
