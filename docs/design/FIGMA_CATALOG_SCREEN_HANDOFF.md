# Figma Catalog Screen Handoff

## Назначение

`26 Screen · Catalog` переносит действующую страницу `catalog/index.html` в Figma Design System v2 «Городской навигатор».

Экран не создаёт новую продуктовую логику. Он документирует существующие сценарии каталога и собирается из уже подготовленных Portal v2 components.

## Figma-файл

- File key: `rhFYa5gPDhF009hZsfEGSX`
- Страница: `26 Screen · Catalog`
- Generator: `tools/figma/generate-portal-v2-catalog-screen.mjs`
- Generated root key: `catalog-screen`

Физический запуск выполняется одним атомарным `Figma.use_figma` call. При ошибке вызов необходимо остановить; частичные изменения не считаются созданными.

## Экраны

Generator создаёт:

- `Catalog / Desktop` — 1440 px, content width 1200 px;
- `Catalog / Mobile` — 360 px, content width 336 px.

Shared plugin data:

- `portal-v2/screen-key = catalog-desktop`;
- `portal-v2/screen-key = catalog-mobile`;
- `portal-v2/source = catalog/index.html`.

## Порядок секций

1. `header` — Top Navigation, активный раздел Catalog.
2. `hero` — заголовок, четыре CTA и короткая форма.
3. `catalog-navigator` — четыре якорных маршрута по странице.
4. `questions` — пять главных вопросов покупателя.
5. `quiz` — initial-state квиза из пяти шагов.
6. `priority` — сравнение Просторной 4А, Аэродромной 18Г и Сенной 76.
7. `reference` — правила справочного каталога.
8. `lead` — подробный подбор квартиры.
9. `footer` — независимый городской портал и публичные источники.

Каждая секция хранит `portal-v2/section-key`.

## Использованные ComponentSet

- Top Navigation;
- Button;
- Lead Form Card;
- Link Card;
- Project Card;
- Site Footer.

Компонентные зависимости должны существовать до запуска generator. Экран не создаёт новый ComponentSet и не меняет итог 14 ComponentSet / 119 вариантов.

## Реальные маршруты

Hero:

- `#quiz`;
- `#questions`;
- `#priority`;
- `tel:+79038576909`.

Catalog Navigator:

- `#questions`;
- `#quiz`;
- `#priority`;
- `#reference`.

Карточки вопросов ведут к `#quick-lead` и хранят `portal-v2/prefill-interest`.

Карточки объектов хранят:

- `primary-route` — форма конкретного объекта;
- `secondary-route` — карточка объекта;
- `verification-profile` — JSON-профиль проверки.

## Формы

Короткая форма:

- `form-id = catalog_quick_selection`;
- `lead-type = portal_selection`;
- `project = Портал Новостройки Борисоглебска`.

Подробная форма:

- `form-id = catalog_priority_selection`;
- `lead-type = portal_selection`;
- `project = Портал Новостройки Борисоглебска`.

## Квиз

В полном экране показывается production initial state:

- `quiz-state = intro`;
- `quiz-version = catalog-rule-v1`;
- кнопка `Начать подбор` хранит action route `action:catalog_quiz_start`.

Пять шагов:

1. приоритет проверки;
2. комнатность;
3. бюджет;
4. способ покупки;
5. срок покупки.

Result не является подтверждением наличия квартиры, цены, статуса объекта или решения банка. Поведение реализовано в `assets/js/catalog-rule-quiz.js` и не симулируется ложной интерактивностью в статическом Figma-экране.

## Юридическая безопасность

Экран сохраняет production-ограничения:

- цена и наличие уточняются на дату обращения;
- заявка не является бронью;
- заявка не фиксирует стоимость;
- квиз не обещает фактически свободную квартиру;
- квиз не обещает одобрение ипотеки;
- рабочие значения документов и характеристик не публикуются без проверки;
- портал не позиционируется как официальный сайт застройщика.

## Интеграция в пакеты

После применения migration:

- Figma Execution Pack содержит 28 атомарных шагов;
- последний шаг создаёт `26 Screen · Catalog`;
- Figma Visual QA Pack содержит 23 audit payload;
- screen page audits: 8;
- screenshot targets: 30;
- source-map содержит 8 экранов;
- ComponentSet остаётся 14, вариантов — 119.

## Visual QA

После восстановления Figma MCP необходимо получить:

- metadata страницы;
- root ID;
- IDs `Catalog / Desktop` и `Catalog / Mobile`;
- screenshots обоих экранов;
- список missingFonts;
- список detachedInstances;
- overflowCandidates;
- routeNodes и formNodes;
- все девять section-key.

Desktop и Mobile проверяются отдельно. Результат фиксируется в issue №116.

## Ограничение Figma Starter

На момент подготовки handoff месячный лимит Figma MCP Starter исчерпан. Generator и validators готовы, но физические Figma-слои, node IDs и screenshots не заявляются до успешного выполнения Execution Pack.
