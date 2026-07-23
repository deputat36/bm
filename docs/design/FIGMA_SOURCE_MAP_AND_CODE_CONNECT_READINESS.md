# Figma Source Map и Code Connect Readiness

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Документ продолжает issue №116 и связывает Design System v2 с production-кодом портала.

## Объём

Source map содержит:

- 14 ComponentSet;
- 119 вариантов;
- 9 экранов;
- production selectors;
- HTML, CSS и JavaScript sources;
- Figma generators;
- Code Connect prerequisites.

## Типы соответствия

- `direct` — самостоятельный production-аналог;
- `composed` — паттерн собирается из общей разметки;
- `gap` — поведение или структура ещё расходятся.

После внедрения FAQ:

- direct — 8 компонентов;
- composed — 6 компонентов;
- gap — 0 компонентов;
- screen gaps — 0.

## FAQ Accordion: gap closed

FAQ Accordion теперь имеет прямое production-соответствие.

Production использует semantic details/summary:

- контейнер `.faq-list`;
- элемент `.faq-item`;
- интерактивный `summary`;
- ответ `.faq-item__answer`;
- первый вопрос открыт по умолчанию;
- остальные вопросы закрыты;
- клавиатурное управление предоставляется браузером;
- `:focus-visible` показывает фокус;
- текст остаётся в HTML и доступен поисковым системам;
- FAQPage JSON-LD сохраняет те же шесть вопросов и ответов.

Figma Open/Closed variants и production disclosure теперь совпадают по смыслу.

## Production sources

Основные источники:

- `index.html`;
- `assets/css/styles.css`;
- `assets/css/home-polish.css`;
- `assets/css/leadgen.css`;
- `assets/css/faq-accordion.css`;
- `assets/js/main.js`.

## Проверка

Локально:

`node tools/validate-homepage-faq-accordion.mjs`

`node tools/validate-figma-source-map-readiness.mjs`

CI workflows:

- `Homepage FAQ accordion`;
- `Figma source map readiness`;
- `Figma visual QA pack`;
- `Portal guards`.

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

## Экран Catalog

Source-map содержит 9 экранов. `26 Screen · Catalog` имеет mapping `composed` и связан с `catalog/index.html`, `assets/js/catalog-rule-quiz.js` и `assets/css/project-conversion.css`. Экран отслеживается для design-to-code drift; Code Connect применяется только к опубликованным ComponentSet.


## Экран Project Detail

Source-map содержит 9 экранов. `27 Screen · Project Detail` имеет mapping `composed` и связан с тремя production-страницами объектов, `assets/css/project-conversion.css`, `assets/js/project-intent-prefill.js` и `assets/js/project-verification-summary.js`. Шесть frames сохраняют три уровня доказательности и отслеживаются для design-to-code drift.
