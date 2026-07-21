# Figma Atomic Components Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Этот handoff продолжает Phase 3 issue №116 и описывает Design System v2 «Городской навигатор».

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

8 вариантов:

- Type: `Primary`, `Secondary`;
- State: `Default`, `Hover`, `Focus`, `Disabled`.

Property: `Label` — TEXT.

Primary используется для одного главного действия. Secondary не конкурирует с ним. Focus обязателен.

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

Использует настоящие Brand и Button instances. Mobile содержит горизонтальный viewport 336 px.

### 11 Component · Project Card

8 вариантов:

- Layout: `Desktop`, `Mobile`;
- Verification: `Verified`, `Pending`;
- State: `Default`, `Hover`.

Использует Verification Status и Button instances. Не публикует неподтверждённые цены, наличие и сроки.

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

Quick содержит 3 поля, Detailed — 8. Оба варианта содержат обязательное согласие перед CTA и используют реальные Form Field/Button instances.

Подробности: `docs/design/FIGMA_LEAD_FORM_CARD_HANDOFF.md`.

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

Top Navigation запускается после Button и Brand.

Project Card запускается после Verification Status и Button.

Lead Form Card запускается после обновлённого Form Field и Button.

Параметр навыков:

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

Hardcoded HEX, неподписанные варианты и фиктивные properties запрещены.

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
- полный набор из 77 вариантов.

## Visual QA

После физического запуска в Figma необходимо:

1. проверить metadata всех страниц;
2. сделать screenshots всех девяти component sets;
3. проверить переносы и отсутствие обрезки;
4. проверить minimum touch target;
5. проверить все variant axes;
6. проверить TEXT/BOOLEAN properties;
7. проверить вложенные instances;
8. сравнить с `/design-system/` и production CSS;
9. проверить Form Field на ширинах 520, 378 и 292 px;
10. проверить Quick/Detailed Lead Form Card на Desktop/Mobile;
11. проверить обязательное согласие перед CTA;
12. записать page IDs, root IDs и component set IDs в issue №116.

До Visual QA компоненты считаются подготовленными в GitHub, но не завершёнными в Figma.