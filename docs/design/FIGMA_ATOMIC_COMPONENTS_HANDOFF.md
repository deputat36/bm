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

Properties:

- `Title` — TEXT;
- `Detail` — TEXT;
- `Show detail` — BOOLEAN.

Verified разрешён только после проверки источника. Pending объясняет, что требует уточнения.

### 07 Component · Form Field

27 вариантов:

- Size: `Wide`, `Compact`, `Mobile`;
- Control: `Input`, `Select`, `Textarea`;
- State: `Default`, `Focus`, `Disabled`.

Размеры:

- Wide — 520 px;
- Compact — 378 px;
- Mobile — 292 px.

Properties:

- `Label` — TEXT;
- `Value` — TEXT;
- `Helper` — TEXT;
- `Show helper` — BOOLEAN.

Label не заменяется placeholder. Минимальная интерактивная высота — 48 px. Mobile является отдельным вариантом, а не масштабированным desktop-полем.

### 08 Component · FAQ Accordion

4 варианта:

- State: `Closed`, `Open`;
- Size: `Desktop`, `Mobile`.

Properties: `Question`, `Answer` — TEXT.

Ответ не обещает цену, наличие, ипотеку или юридический результат без проверки.

### 09 Component · Brand

4 варианта:

- Context: `Light`, `Dark`;
- Size: `Desktop`, `Mobile`.

Properties:

- `Title` — TEXT;
- `Show title` — BOOLEAN.

Название портала не подменяется брендом застройщика.

### 10 Component · Top Navigation

14 вариантов:

- Layout: `Desktop`, `Mobile`;
- Active: `None`, `Catalog`, `Developers`, `Mortgage`, `Guide`, `News`, `Contacts`.

Использует настоящие Brand и Button `Context=Light` instances. Mobile содержит горизонтальный viewport 336 px.

### 11 Component · Project Card

8 вариантов:

- Layout: `Desktop`, `Mobile`;
- Verification: `Verified`, `Pending`;
- State: `Default`, `Hover`.

Использует Verification Status и Button `Context=Light` instances. Pending CTA «Оставить заявку» означает обращение за консультацией, а не бронь, фиксацию цены или подтверждение наличия. Компонент не публикует неподтверждённые цены и сроки.

### 12 Component · Fact Card

4 варианта:

- Context: `Light`, `Hero`;
- Size: `Desktop`, `Mobile`.

Properties: `Value`, `Label` — TEXT.

Цвет поверхности не означает подтверждение данных. Подробности: `docs/design/FIGMA_FACT_CARD_HANDOFF.md`.

### 13 Component · Lead Form Card

4 варианта:

- Layout: `Desktop`, `Mobile`;
- Scope: `Quick`, `Detailed`.

Quick содержит 3 поля, Detailed — 8. Оба варианта содержат обязательное согласие перед CTA и используют реальные Form Field/Button `Context=Light` instances.

Подробности: `docs/design/FIGMA_LEAD_FORM_CARD_HANDOFF.md`.

### 15 Component · Scenario Card

12 вариантов:

- Layout: `Desktop`, `Mobile`;
- Intent: `Object`, `Selection`, `Mortgage`;
- State: `Default`, `Hover`.

Properties:

- `Title` — TEXT;
- `Description` — TEXT;
- `Show action` — BOOLEAN.

Scenario Card используется только для выбора следующего маршрута и не дублирует Project Card. Вложенная кнопка всегда использует `Context=Light`.

Подробности: `docs/design/FIGMA_SCENARIO_CARD_HANDOFF.md`.

### 17 Component · Content Card

8 вариантов:

- Layout: `Desktop`, `Mobile`;
- Purpose: `Selection`, `Outcome`;
- State: `Default`, `Hover`.

Properties:

- `Title` — TEXT;
- `Description` — TEXT;
- `Show action` — BOOLEAN.

Selection использует Button `Context=Light` как exposed instance, поэтому Label вложенной кнопки меняется без фиктивного свойства родительского компонента. Outcome содержит токенизированный вертикальный акцент и не имеет собственного CTA.

Подробности: `docs/design/FIGMA_CONTENT_CARD_HANDOFF.md`.

### 19 Component · Step Card

8 вариантов:

- Layout: `Desktop`, `Mobile`;
- Grid: `Three`, `Four`;
- State: `Default`, `Hover`.

Properties:

- `Step label` — TEXT;
- `Title` — TEXT;
- `Description` — TEXT;
- `Show step label` — BOOLEAN.

Grid Three повторяет production-сетку из трёх карточек по 384 px. Grid Four повторяет сетку из четырёх карточек по 284 px. Mobile использует ширину 336 px. Компонент не содержит CTA и не обещает бронь, цену, наличие, одобрение банка или юридический результат.

Подробности: `docs/design/FIGMA_STEP_CARD_HANDOFF.md`.

## Итог

Подготовлено 12 ComponentSet и 113 вариантов:

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
- Step Card — 8.

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

Зависимости:

- Top Navigation запускается после Button и Brand;
- Project Card запускается после Verification Status и Button;
- Lead Form Card запускается после Form Field и Button;
- Scenario Card запускается после Button;
- Content Card запускается после Button;
- Step Card не имеет компонентных зависимостей, кроме foundations.

После компонентов создаются составные экраны:

- `14 Screen · Homepage Hero` по `docs/design/FIGMA_HOMEPAGE_HERO_HANDOFF.md`;
- `16 Screen · Homepage Start & Objects` по `docs/design/FIGMA_HOMEPAGE_START_OBJECTS_HANDOFF.md`;
- `18 Screen · Homepage Apartments & Outcomes` по `docs/design/FIGMA_HOMEPAGE_APARTMENTS_OUTCOMES_HANDOFF.md`;
- `20 Screen · Homepage Process & Purchase` по `docs/design/FIGMA_HOMEPAGE_PROCESS_PURCHASE_HANDOFF.md`.

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
- spacing и системные radius через `setBoundVariable`;
- `Typography/*`;
- `Effects/*`;
- component properties;
- локальные component instances.

Исключения допускаются только для точных production-размеров, которые пока не входят в общую шкалу, и закрытого SVG-artwork Brand.

Hardcoded HEX, неподписанные варианты, неоднозначный nested variant lookup и фиктивные properties запрещены.

## Проверка

Локально:

```bash
node tools/validate-figma-atomic-components-handoff.mjs
```

CI workflow:

```text
Figma atomic components handoff
```

Проверяется:

- синтаксис исходных генераторов и итогового JavaScript;
- лимит 50 000 символов на вызов;
- один `setCurrentPageAsync`;
- отсутствие unsupported API и hardcoded HEX;
- создание ComponentNode/ComponentSetNode;
- variants, properties и variable bindings;
- вложенные component instances;
- явный Light Button context в Top Navigation, Project Card, Lead Form Card, Scenario Card и Content Card;
- exposed instance в Content Card;
- Step Card Grid Three и Grid Four;
- полный набор из 113 вариантов.

## Visual QA

После физического запуска в Figma необходимо:

1. проверить metadata всех страниц;
2. сделать screenshots всех двенадцати component sets;
3. проверить переносы и отсутствие обрезки;
4. проверить minimum touch target;
5. проверить все variant axes;
6. проверить TEXT/BOOLEAN properties;
7. проверить вложенные instances;
8. сравнить с `/design-system/` и production CSS;
9. проверить Button в Light и Hero contexts;
10. проверить Form Field на ширинах 520, 378 и 292 px;
11. проверить Quick/Detailed Lead Form Card на Desktop/Mobile;
12. проверить обязательное согласие перед CTA;
13. проверить Scenario Card во всех Intent и State;
14. проверить Pending CTA Project Card «Оставить заявку»;
15. проверить Content Card в Selection и Outcome;
16. проверить exposed Button Label на комнатных карточках;
17. проверить вертикальный акцент Outcome;
18. проверить Step Card на ширинах 384, 284 и 336 px;
19. проверить `Show step label`;
20. записать page IDs, root IDs и component set IDs в issue №116.

До Visual QA компоненты считаются подготовленными в GitHub, но не завершёнными в Figma.
