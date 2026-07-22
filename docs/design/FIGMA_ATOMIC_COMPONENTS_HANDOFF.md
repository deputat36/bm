# Figma Atomic Components Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Этот handoff продолжает issue №116 и описывает Design System v2 «Городской навигатор».

## Предварительные условия

До компонентов должны быть созданы:

1. `01 Primitives · Color`;
2. `02 Semantic · Color`;
3. `03 Dimensions · Spacing`;
4. `04 Dimensions · Radius`;
5. text styles `Typography/*`;
6. effect styles `Effects/*`;
7. документационные страницы `00 Cover` — `04 Utilities`.

Источники:

- `data/design/portal-v2.tokens.json`;
- `tools/figma/generate-portal-v2-foundations.mjs`;
- `docs/design/FIGMA_DOCUMENTATION_HANDOFF.md`.

## Компоненты

### 05 Component · Button

16 вариантов:

- Context: `Light`, `Hero`;
- Type: `Primary`, `Secondary`;
- State: `Default`, `Hover`, `Focus`, `Disabled`.

Property: `Label` — TEXT.

Light используется на белых и нейтральных поверхностях. Hero используется на тёмном первом экране и CTA-секциях. Primary остаётся одним главным действием, Secondary не конкурирует с ним, Focus обязателен.

### 06 Component · Verification Status

4 варианта:

- Tone: `Verified`, `Pending`;
- Layout: `Compact`, `Card`.

Properties: `Title`, `Detail`, `Show detail`.

Verified разрешён только после проверки источника. Pending объясняет, что требует уточнения.

### 07 Component · Form Field

27 вариантов:

- Size: `Wide`, `Compact`, `Mobile`;
- Control: `Input`, `Select`, `Textarea`;
- State: `Default`, `Focus`, `Disabled`.

Ширины: 520, 378 и 292 px. Properties: `Label`, `Value`, `Helper`, `Show helper`.

### 08 Component · FAQ Accordion

4 варианта:

- State: `Closed`, `Open`;
- Size: `Desktop`, `Mobile`.

Properties: `Question`, `Answer`.

Ответ не обещает цену, наличие, ипотеку или юридический результат без проверки.

### 09 Component · Brand

4 варианта:

- Context: `Light`, `Dark`;
- Size: `Desktop`, `Mobile`.

Properties: `Title`, `Show title`.

Название портала не подменяется брендом застройщика.

### 10 Component · Top Navigation

14 вариантов:

- Layout: `Desktop`, `Mobile`;
- Active: `None`, `Catalog`, `Developers`, `Mortgage`, `Guide`, `News`, `Contacts`.

Использует настоящие Brand и Button `Context=Light` instances.

### 11 Component · Project Card

8 вариантов:

- Layout: `Desktop`, `Mobile`;
- Verification: `Verified`, `Pending`;
- State: `Default`, `Hover`.

Pending CTA «Оставить заявку» означает консультацию, а не бронь, фиксацию цены или подтверждение наличия.

### 12 Component · Fact Card

4 варианта:

- Context: `Light`, `Hero`;
- Size: `Desktop`, `Mobile`.

Properties: `Value`, `Label`.

### 13 Component · Lead Form Card

4 варианта:

- Layout: `Desktop`, `Mobile`;
- Scope: `Quick`, `Detailed`.

Quick содержит 3 поля, Detailed — 8. Оба варианта содержат обязательное согласие перед CTA и реальные Form Field/Button instances.

### 15 Component · Scenario Card

12 вариантов:

- Layout: `Desktop`, `Mobile`;
- Intent: `Object`, `Selection`, `Mortgage`;
- State: `Default`, `Hover`.

Properties: `Title`, `Description`, `Show action`.

### 17 Component · Content Card

8 вариантов:

- Layout: `Desktop`, `Mobile`;
- Purpose: `Selection`, `Outcome`;
- State: `Default`, `Hover`.

Properties: `Title`, `Description`, `Show action`.

Selection использует Button `Context=Light` как exposed instance. Outcome содержит токенизированный вертикальный акцент и не имеет собственного CTA.

### 19 Component · Step Card

8 вариантов:

- Layout: `Desktop`, `Mobile`;
- Grid: `Three`, `Four`;
- State: `Default`, `Hover`.

Properties: `Step label`, `Title`, `Description`, `Show step label`.

Grid Three повторяет сетку из трёх карточек по 384 px. Grid Four — из четырёх карточек по 284 px. Mobile — 336 px.

### 21 Component · Link Card

4 варианта:

- Layout: `Desktop`, `Mobile`;
- State: `Default`, `Hover`.

Properties: `Title`, `Description`.

Link Card является полностью кликабельной карточкой-направлением без отдельного CTA. Destination хранится на экземпляре экрана через shared plugin data:

```text
namespace: portal-v2
key: route
```

Подробности: `docs/design/FIGMA_LINK_CARD_HANDOFF.md`.

## Итог

Подготовлено 13 ComponentSet и 117 вариантов:

- Button — 16;
- Verification Status — 4;
- Form Field — 27;
- FAQ Accordion — 4;
- Brand — 4;
- Top Navigation — 14;
- Project Card — 8;
- Fact Card — 4;
- Lead Form Card — 4;
- Scenario Card — 12;
- Content Card — 8;
- Step Card — 8;
- Link Card — 4.

## Порядок запуска

Каждый генератор выводит JavaScript для отдельного последовательного вызова `Figma.use_figma`.

1. Foundations.
2. Документационные страницы.
3. Button.
4. Verification Status.
5. Form Field.
6. FAQ Accordion.
7. Brand.
8. Top Navigation.
9. Project Card.
10. Fact Card.
11. Lead Form Card.
12. Scenario Card.
13. Content Card.
14. Step Card.
15. Link Card.

Зависимости:

- Top Navigation — после Button и Brand;
- Project Card — после Verification Status и Button;
- Lead Form Card — после Form Field и Button;
- Scenario Card — после Button;
- Content Card — после Button;
- Step Card и Link Card — после foundations.

После компонентов создаются составные экраны:

- `14 Screen · Homepage Hero`;
- `16 Screen · Homepage Start & Objects`;
- `18 Screen · Homepage Apartments & Outcomes`;
- `20 Screen · Homepage Process & Purchase`;
- `22 Screen · Homepage Purchase & Resources`.

Параметр навыков для компонентов:

```text
skillNames: resource:figma-use,resource:figma-generate-library
```

## Идемпотентность

Каждая страница содержит корневой frame с shared plugin data:

```text
namespace: portal-v2
key: component-key
```

Повторный запуск удаляет только ранее созданный root того же семейства.

## Связь с production

Компоненты используют:

- colors через `setBoundVariableForPaint`;
- spacing и radius через `setBoundVariable`;
- `Typography/*`;
- `Effects/*`;
- component properties;
- локальные component instances.

Hardcoded HEX, неподписанные варианты, неоднозначный nested variant lookup и фиктивные properties запрещены.

## Проверка

```bash
node tools/validate-figma-atomic-components-handoff.mjs
```

CI workflow:

`Figma atomic components handoff`

Проверяется:

- синтаксис исходных генераторов и итогового JavaScript;
- лимит 50 000 символов;
- один `setCurrentPageAsync`;
- отсутствие unsupported API и hardcoded HEX;
- ComponentNode/ComponentSetNode;
- variants, properties и variable bindings;
- вложенные instances;
- Context: `Light`, `Hero`;
- обязательное согласие в Lead Form Card;
- exposed instance в Content Card;
- `Show step label` в Step Card;
- `portal-v2/route` для Link Card;
- полный набор из 117 вариантов.

## Visual QA

После физического запуска в Figma необходимо:

1. проверить metadata всех страниц;
2. сделать screenshots всех тринадцати ComponentSet;
3. проверить переносы и отсутствие обрезки;
4. проверить minimum touch target;
5. проверить все variant axes;
6. проверить TEXT/BOOLEAN properties;
7. проверить вложенные instances;
8. сравнить с `/design-system/` и production CSS;
9. проверить Pending CTA Project Card «Оставить заявку»;
10. проверить обязательное согласие в формах;
11. проверить exposed Button Label;
12. проверить Step Card на ширинах 384, 284 и 336 px;
13. проверить Link Card на ширинах 384 и 336 px;
14. проверить отсутствие отдельного CTA в Link Card;
15. проверить route на шести экранных instances;
16. записать page IDs, root IDs и ComponentSet IDs в issue №116.

До Visual QA компоненты считаются подготовленными в GitHub, но не завершёнными в Figma.