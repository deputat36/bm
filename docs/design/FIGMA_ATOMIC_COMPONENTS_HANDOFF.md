# Figma Atomic Components Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Этот handoff продолжает Phase 3 issue №116 и создаёт компоненты Design System v2 «Городской навигатор».

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

### 10 Component · Top Navigation

Component set `Top Navigation` содержит 14 вариантов:

- Layout: `Desktop`, `Mobile`
- Active: `None`, `Catalog`, `Developers`, `Mortgage`, `Guide`, `News`, `Contacts`

Component properties:

- `Catalog label` — TEXT
- `Developers label` — TEXT
- `Mortgage label` — TEXT
- `Guide label` — TEXT
- `News label` — TEXT
- `Contacts label` — TEXT
- `Show CTA` — BOOLEAN

Зависимости:

- локальный ComponentSet `Brand`;
- локальный ComponentSet `Button`;
- `Typography/Label`;
- `Effects/Header`.

Правила:

- Brand ведёт на главную страницу, поэтому отдельный пункт «Главная» не создаётся;
- на внутренних страницах используется ровно один Active variant;
- `None` используется на главной странице и нейтральных служебных экранах;
- Desktop повторяет контейнер 1200 px и шапку высотой 84 px;
- Mobile использует ширину 360 px и прокручиваемый viewport 336 px;
- пункты меню не сжимаются до нечитаемого размера;
- внутри используются реальные instances Brand и Button, а не копии их слоёв;
- главный CTA остаётся один и не обещает цену, наличие, бронь или одобрение ипотеки;
- `Effects/Header` легче карточной тени и используется только для верхней навигации.

Генератор:

```bash
node tools/figma/generate-portal-v2-top-navigation-components.mjs
```

### 11 Component · Project Card

Component set `Project Card` содержит 8 вариантов:

- Layout: `Desktop`, `Mobile`
- Verification: `Verified`, `Pending`
- State: `Default`, `Hover`

Component properties:

- `Project title` — TEXT
- `Description` — TEXT
- `Fact 1` — TEXT
- `Fact 2` — TEXT
- `Fact 3` — TEXT
- `Show secondary action` — BOOLEAN

Зависимости:

- локальный ComponentSet `Verification Status`;
- локальный ComponentSet `Button`;
- `Typography/H3` и `Typography/Body`;
- `Effects/Card` и `Effects/Card Hover`;
- semantic colors статуса, текста, поверхности и границы.

Правила:

- статус проверки расположен до названия и описания объекта;
- Verified применяется только после сверки с первичным или официально предоставленным источником;
- Pending объясняет, какие сведения уточняются, и не создаёт искусственную срочность;
- описание и три факта не содержат неподтверждённых цен, наличия, сроков или гарантий;
- основной CTA для Verified открывает карточку, для Pending запрашивает обновление;
- вторичный CTA можно скрыть через `Show secondary action`;
- Desktop имеет ширину 384 px, Mobile — 336 px;
- Default использует `Effects/Card`, Hover — `Effects/Card Hover` и усиленную границу;
- вложенные Verification Status и Button являются настоящими instances;
- media-слот намеренно не включён, пока в production нет единого обязательного контракта изображений для всех объектов.

Production-связь:

- структура соответствует карточкам объектов на главной, в каталоге и `/design-system/`;
- desktop padding 26 px и radius 22 px повторяют текущий production `.card`;
- mobile padding 22 px и radius 18 px повторяют мобильное состояние;
- список использует зелёный маркер без интерпретации его как подтверждения всех сведений карточки;
- карточка не заменяет страницу объекта и не является офертой.

Генератор:

```bash
node tools/figma/generate-portal-v2-project-card-components.mjs
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
13. Выполнить генератор Top Navigation.
14. Получить metadata и screenshot страницы Top Navigation.
15. Выполнить генератор Project Card.
16. Получить metadata и screenshot страницы Project Card.

Top Navigation запускается только после Button и Brand, поскольку получает их через `getLocalComponentsAsync()` и создаёт вложенные instances.

Project Card запускается только после Verification Status и Button. Генератор прекращает работу с понятной ошибкой, если нужные локальные варианты отсутствуют.

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
- spacing и системные radius — через `setBoundVariable`;
- typography — через `Typography/*`;
- shadows и focus — через `Effects/*`;
- тексты и видимость — через component properties;
- зависимости — через локальные component instances.

Исключения:

- закрытый SVG-artwork фирменного знака: градиент является частью идентичности, а не семантическим интерфейсным цветом;
- Project Card сохраняет точные production padding/radius 26/22 px desktop и 22/18 px mobile, пока эти значения остаются в рабочем CSS вне общей шкалы.

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
- использование локальных Brand/Button instances в Top Navigation;
- использование локальных Verification Status/Button instances в Project Card;
- полный набор из 51 варианта.

## Visual QA

После физического запуска в Figma необходимо:

1. проверить metadata каждой страницы;
2. сделать screenshot всех семи component sets;
3. убедиться, что variants не накладываются друг на друга;
4. проверить русские переносы и отсутствие обрезанного текста;
5. проверить минимальные зоны нажатия;
6. проверить контраст Default, Hover, Focus, Disabled, Closed, Open, Light и Dark;
7. проверить component properties на экземплярах;
8. сравнить компоненты с `/design-system/` и production CSS;
9. проверить FAQ, Brand, Top Navigation и Project Card на ширине Desktop и Mobile;
10. проверить точность градиента, сетки и тени Brand mark;
11. проверить все семь значений Active в Top Navigation;
12. проверить горизонтальный mobile viewport и доступность CTA;
13. проверить оба Verification и оба State в Project Card;
14. убедиться, что длинные русские названия и факты не обрезаются;
15. проверить скрытие secondary action;
16. записать page IDs, root IDs и component set IDs в issue №116.

До Visual QA компоненты считаются подготовленными в GitHub, но не завершёнными в Figma.
