# Figma Atomic Components Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Этот handoff продолжает Phase 3 issue №116 и создаёт первые атомарные компоненты Design System v2 «Городской навигатор».

## Предварительные условия

Сначала должны быть физически созданы Foundations и документационные страницы:

1. `01 Primitives · Color`
2. `02 Semantic · Color`
3. `03 Dimensions · Spacing`
4. `04 Dimensions · Radius`
5. text styles `Typography/*`
6. effect styles `Effects/*`
7. страницы `00 Cover` — `04 Utilities`

Источники:

- `data/design/portal-v2.tokens.json`
- `tools/figma/generate-portal-v2-foundations.mjs`
- `docs/design/FIGMA_DOCUMENTATION_HANDOFF.md`

## Создаваемые страницы

### 05 Component · Button

Component set `Button` содержит 8 вариантов:

- Type: `Primary`, `Secondary`
- State: `Default`, `Hover`, `Focus`, `Disabled`

Component property:

- `Label` — TEXT

Правила:

- Primary используется для одного главного действия в смысловом блоке;
- Secondary применяется для просмотра, сравнения и перехода к источнику;
- Focus обязателен для клавиатурной навигации;
- Disabled не заменяет объяснение причины недоступности.

Генератор:

```bash
node tools/figma/generate-portal-v2-button-components.mjs
```

### 06 Component · Verification Status

Component set `Verification Status` содержит 4 варианта:

- Tone: `Verified`, `Pending`
- Layout: `Compact`, `Card`

Component properties:

- `Title` — TEXT
- `Detail` — TEXT
- `Show detail` — BOOLEAN

Правила:

- Verified разрешён только после сверки с первичным или официально предоставленным источником;
- Pending используется для цены, наличия, сроков и условий, которые надо уточнить на дату обращения;
- ни один статус не является гарантией сделки.

Генератор:

```bash
node tools/figma/generate-portal-v2-verification-status-components.mjs
```

### 07 Component · Form Field

Component set `Form Field` содержит 9 вариантов:

- Control: `Input`, `Select`, `Textarea`
- State: `Default`, `Focus`, `Disabled`

Component properties:

- `Label` — TEXT
- `Value` — TEXT
- `Helper` — TEXT
- `Show helper` — BOOLEAN

Правила:

- Label не заменяется placeholder;
- высота интерактивного поля не меньше 48 px;
- Focus не меняет размер компонента;
- согласие на обработку данных остаётся отдельным обязательным элементом формы.

Генератор:

```bash
node tools/figma/generate-portal-v2-form-field-components.mjs
```

## Порядок запуска

Каждая команда выводит готовый JavaScript для отдельного последовательного вызова `Figma.use_figma`.

1. Запустить Foundations.
2. Запустить структуру и документационные страницы.
3. Выполнить генератор Button.
4. Получить metadata и screenshot страницы Button.
5. Выполнить генератор Verification Status.
6. Получить metadata и screenshot страницы Verification Status.
7. Выполнить генератор Form Field.
8. Получить metadata и screenshot страницы Form Field.

Параметр навыков:

```text
skillNames: resource:figma-use,resource:figma-generate-library
```

## Идемпотентность

Каждая страница содержит один корневой frame с shared plugin data:

```text
namespace: portal-v2
key: component-key
```

Повторный запуск удаляет только ранее созданный root frame того же семейства. Посторонние страницы, ручные комментарии и другие компоненты не удаляются.

## Связь с production-кодом

Компоненты используют локальные variables и styles:

- colors — через `setBoundVariableForPaint`;
- spacing и radius — через `setBoundVariable`;
- typography — через `Typography/*`;
- shadows и focus — через `Effects/*`;
- тексты и видимость — через component properties.

Hardcoded HEX, неподписанные варианты и случайные локальные стили запрещены.

## Проверка

Локально:

```bash
node tools/validate-figma-atomic-components-handoff.mjs
```

CI workflow:

```text
Figma atomic components handoff
```

Проверка контролирует:

- синтаксис генераторов и итогового JavaScript;
- лимит 50 000 символов на каждый `Figma.use_figma`;
- один `setCurrentPageAsync` на генератор;
- отсутствие hardcoded HEX;
- отсутствие `notify`, `closePlugin`, sync currentPage и pluginData API;
- создание реальных ComponentNode и ComponentSetNode;
- наличие variants, component properties и variable bindings;
- полный набор из 21 варианта.

## Visual QA

После физического запуска в Figma необходимо:

1. проверить metadata каждой страницы;
2. сделать screenshot всех трёх component sets;
3. убедиться, что variants не накладываются друг на друга;
4. проверить русские переносы и отсутствие обрезанного текста;
5. проверить минимальные зоны нажатия;
6. проверить контраст Default, Hover, Focus и Disabled;
7. проверить component properties на экземплярах;
8. сравнить компоненты с `/design-system/` и production CSS;
9. записать page IDs, root IDs и component set IDs в issue №116.

До Visual QA компоненты считаются подготовленными в GitHub, но не завершёнными в Figma.
