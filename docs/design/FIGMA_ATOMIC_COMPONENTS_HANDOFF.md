# Figma Atomic Components Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Этот handoff продолжает Phase 3 issue №116 и создаёт атомарные компоненты Design System v2 «Городской навигатор».

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

### 08 Component · FAQ Accordion

Component set `FAQ Accordion` содержит 4 варианта:

- State: `Closed`, `Open`
- Size: `Desktop`, `Mobile`

Component properties:

- `Question` — TEXT
- `Answer` — TEXT

Правила:

- один элемент отвечает на один конкретный вопрос;
- закрытый вопрос остаётся читаемым и имеет крупную зону нажатия;
- открытый ответ не обещает цену, наличие, ипотеку или юридический результат без проверки;
- знак `+` используется для закрытого состояния, `−` — для открытого;
- размеры синхронизированы с production CSS через общую шкалу 12/16/24/32/48/64 px;
- desktop и mobile variants не зависят от ручного изменения внутренних отступов.

Генератор:

```bash
node tools/figma/generate-portal-v2-faq-accordion-components.mjs
```

Production-связь:

- `assets/css/project-conversion.css` использует radius 18 px;
- Closed использует `Effects/Card`;
- Open и hover используют `Effects/Card Hover`;
- icon size — 32 px;
- desktop padding — 24 px;
- mobile padding — 16 px.

### 09 Component · Brand

Component set `Brand` содержит 4 варианта:

- Context: `Light`, `Dark`
- Size: `Desktop`, `Mobile`

Component properties:

- `Title` — TEXT
- `Show title` — BOOLEAN

Правила:

- название всегда остаётся «Новостройки Борисоглебска» и не подменяется брендом застройщика;
- Light используется на светлом header и нейтральных поверхностях;
- Dark применяется на тёмном hero, footer и контрастных секциях;
- Desktop повторяет production mark 42 px, Mobile — 36 px;
- `Typography/Brand` фиксирует 16 px, weight 900, line-height 105%, letter-spacing −2.5%;
- `Effects/Brand Mark` повторяет production-тень;
- фирменный знак является закрытым SVG-artwork с точным коралловым градиентом и сеткой и не перекрашивается статусными цветами.

Генератор:

```bash
node tools/figma/generate-portal-v2-brand-components.mjs
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
9. Выполнить генератор FAQ Accordion.
10. Получить metadata и screenshot страницы FAQ Accordion.
11. Выполнить генератор Brand.
12. Получить metadata и screenshot страницы Brand.

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

Исключение — закрытый SVG-artwork фирменного знака. Его градиент является частью идентичности, а не семантическим интерфейсным цветом. Вокруг artwork все размеры, текстовые цвета, typography и effect style управляются Foundations.

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
- полный набор из 29 вариантов.

## Visual QA

После физического запуска в Figma необходимо:

1. проверить metadata каждой страницы;
2. сделать screenshot всех пяти component sets;
3. убедиться, что variants не накладываются друг на друга;
4. проверить русские переносы и отсутствие обрезанного текста;
5. проверить минимальные зоны нажатия;
6. проверить контраст Default, Hover, Focus, Disabled, Closed, Open, Light и Dark;
7. проверить component properties на экземплярах;
8. сравнить компоненты с `/design-system/` и production CSS;
9. проверить FAQ и Brand на ширине Desktop и Mobile;
10. проверить точность градиента, сетки и тени Brand mark;
11. записать page IDs, root IDs и component set IDs в issue №116.

До Visual QA компоненты считаются подготовленными в GitHub, но не завершёнными в Figma.
