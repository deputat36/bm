# Figma Source Map and Code Connect Readiness

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Продолжает issue №116 и связывает Design System v2 «Городской навигатор» с фактической production-разметкой портала.

## Задача

Execution Pack описывает, как физически создать дизайн. Visual QA Pack описывает, как проверить созданные страницы. Source Map отвечает на другой вопрос: где находится production-источник каждого Figma-компонента и экрана.

Источник реестра:

`data/design/portal-v2.source-map.json`

Реестр покрывает:

- 14 ComponentSet;
- 119 вариантов;
- 7 экранов;
- `index.html`;
- `assets/css/styles.css`;
- `assets/css/home-polish.css`;
- `assets/css/leadgen.css`;
- `assets/js/main.js`;
- все 14 component generators;
- все 7 screen generators.

## Типы соответствия

### direct

Figma-компонент имеет самостоятельный production-аналог с устойчивым selector или классом.

Примеры:

- Button — `.button`, `.button--ghost`;
- Brand — `.brand`;
- Top Navigation — `.topbar`, `.nav`;
- Fact Card — `.fact`;
- Link Card — `a.card.card--shadow`;
- Site Footer — `.footer`;
- Form Field — `.form input`, `.form select`, `.form textarea`.

### composed

Production-аналог существует, но собирается из общей карточки, сетки, eyebrow, формы или другого базового паттерна и не имеет самостоятельного корневого класса.

Примеры:

- Verification Status находится внутри карточек объектов как `.eyebrow`;
- Project Card строится из `#objects .card.card--shadow`;
- Scenario Card строится из `[data-homepage-routes] .card.card--shadow`;
- Content Card имеет Selection и Outcome представления в разных секциях;
- Step Card используется в сетках из трёх и четырёх карточек;
- Lead Form Card сочетает `.hero-quick-card`, `.hero-quick-form` и подробную форму `#lead .form`.

### gap

Figma и production отличаются по поведению или структуре. Такое соответствие нельзя обозначать как прямое до исправления production или изменения дизайна.

## Выявленный gap: FAQ Accordion

В Figma:

- FAQ Accordion имеет Closed/Open variants;
- первый вопрос на экране открыт;
- остальные вопросы закрыты;
- предполагается disclosure interaction.

В production:

- FAQ представлен как six static cards;
- все ответы постоянно видимы;
- кнопки раскрытия отсутствуют;
- JavaScript disclosure behavior отсутствует.

Поэтому `faq-accordion` и `homepage-faq-lead` имеют mapping `gap`.

До устранения разрыва запрещено утверждать, что production FAQ соответствует интерактивному Figma Accordion.

## Code Connect

Code Connect сейчас имеет статус `blocked`.

Причины:

1. текущий Figma-план — Starter;
2. Code Connect требует Organization or Enterprise;
3. месячный лимит Figma MCP исчерпан;
4. ComponentSet node IDs недоступны;
5. физическое создание библиотеки ещё не выполнено;
6. публикация компонентов не подтверждена.

Правило:

`Never invent or guess a nodeId.`

Поле `nodeId` для всех 14 компонентов остаётся `null` до чтения реального ID из Figma metadata.

Поле `published` остаётся `false` до подтверждённой публикации библиотеки.

## Почему не создаются .figma.ts файлы

Шаблон Code Connect без опубликованного ComponentSet и реального nodeId будет недостоверным и непубликуемым.

Кроме того, текущий production-проект использует статические HTML/CSS/JS-паттерны, а не отдельный React/Vue/Svelte component layer. Поэтому перед созданием template mappings требуется вручную подтвердить, какой source path должен считаться кодовым компонентом:

- отдельный будущий Web Component;
- HTML template fragment;
- Markdown mapping;
- JavaScript component abstraction;
- или иной согласованный слой.

Source Map фиксирует кандидатов, но не подменяет это решение.

## Сборка readiness artifact

```bash
node tools/build-figma-code-connect-readiness.mjs
```

По умолчанию создаётся:

`build/figma-code-connect-readiness/`

Содержимое:

- `manifest.json`;
- `source-map.json`;
- `pending-code-connect.json`;
- `screen-source-map.json`;
- `gaps.json`;
- `README.md`.

### pending-code-connect.json

Содержит 14 записей.

Для каждой записи:

- ComponentSet;
- Figma page;
- generator;
- production selectors;
- source candidates;
- `nodeId: null`;
- `published: false`;
- три блокирующих условия;
- следующий безопасный шаг.

### screen-source-map.json

Содержит 7 экранов. Экраны используются для design-to-code drift и не объявляются Code Connect component mappings.

### gaps.json

Содержит подтверждённые несовпадения. На текущем этапе это:

- FAQ Accordion;
- Homepage FAQ & Lead.

## Проверка

```bash
node tools/validate-figma-source-map-readiness.mjs
```

Validator проверяет:

- JSON schemaVersion;
- Figma file key;
- 14 ComponentSet;
- 119 вариантов;
- 7 экранов;
- уникальность IDs и страниц;
- существование всех production paths;
- наличие обязательных markers в HTML/CSS/JS;
- существование component и screen generators;
- успешную генерацию Figma JavaScript;
- лимит 50 000 символов;
- один `setCurrentPageAsync` на generator;
- 7 direct mappings;
- 6 composed mappings;
- один component gap;
- обязательный FAQ gap;
- `nodeId: null` для всех компонентов;
- `published: false`;
- успешную сборку readiness artifact.

## Порядок дальнейших действий

1. Выполнить Figma Execution Pack.
2. Выполнить Figma Visual QA Pack.
3. Исправить найденные Figma-дефекты.
4. Опубликовать ComponentSet как библиотеку.
5. Получить реальные ComponentSet node IDs.
6. Обновить `portal-v2.source-map.json` отдельным PR.
7. При необходимости перейти на Organization or Enterprise.
8. Получить Code Connect suggestions.
9. Проверить source candidate для каждого компонента.
10. Только после подтверждения создать mappings.

## Связанные документы

- `docs/design/FIGMA_EXECUTION_PACK.md` — Figma Execution Pack;
- `docs/design/FIGMA_VISUAL_QA_PACK.md` — Figma Visual QA Pack;
- `docs/design/FIGMA_ATOMIC_COMPONENTS_HANDOFF.md`;
- `docs/design/FIGMA_HOMEPAGE_FULL_HANDOFF.md`;
- issue №116.

## Ограничения

Source Map не означает, что физические Figma nodes созданы.

Readiness artifact не означает, что Code Connect включён.

Production selectors не являются автоматически подтверждёнными Code Connect sources.

FAQ Accordion остаётся gap до внедрения доступного disclosure behavior или пересмотра Figma-компонента.
