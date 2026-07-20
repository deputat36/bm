# Figma Documentation Handoff

Файл Figma:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Этот handoff создаёт структуру файла и документационные страницы Design System v2 «Городской навигатор» после успешного запуска Phase 1 Foundations.

## Предварительное условие

В Figma должны существовать:

- `01 Primitives · Color`;
- `02 Semantic · Color`;
- `03 Dimensions · Spacing`;
- `04 Dimensions · Radius`;
- семь text styles `Typography/*`;
- четыре effect styles `Effects/*`.

Они создаются генератором:

```bash
node tools/figma/generate-portal-v2-foundations.mjs
```

## Структура страниц

Генератор skeleton создаёт и упорядочивает:

1. `00 Cover`
2. `01 Getting Started`
3. `02 Foundations`
4. `— Components`
5. `03 Components`
6. `— Utilities`
7. `04 Utilities`

Существующие посторонние страницы не удаляются. Страницы портала перемещаются в начало файла в указанном порядке.

## Порядок запуска

Каждый сгенерированный файл выполняется отдельным последовательным вызовом `Figma.use_figma`.

### 1. Skeleton

```bash
node tools/figma/generate-portal-v2-page-skeleton.mjs
```

### 2. Cover

```bash
node tools/figma/generate-portal-v2-cover.mjs
```

### 3. Getting Started

```bash
node tools/figma/generate-portal-v2-getting-started.mjs
```

### 4. Foundations

```bash
node tools/figma/generate-portal-v2-foundations-page.mjs
```

### 5. Components index

```bash
node tools/figma/generate-portal-v2-index-page.mjs components
```

### 6. Utilities index

```bash
node tools/figma/generate-portal-v2-index-page.mjs utilities
```

Вывод каждой команды передаётся в параметр `code` инструмента `Figma.use_figma`.

Для вызовов использовать:

```text
skillNames: resource:figma-use,resource:figma-generate-library,resource:figma-generate-design
```

## Идемпотентность

Каждая документационная страница содержит один корневой frame с shared plugin data:

```text
namespace: portal-v2
key: doc-key
```

При повторном запуске удаляется только frame с совпадающим `doc-key`. Посторонние слои и страницы не затрагиваются.

## Связь с variables и styles

Документация не хранит отдельные semantic HEX-значения.

- swatches используют `setBoundVariableForPaint`;
- radii используют `setBoundVariable` для четырёх углов;
- typography specimens используют локальные `Typography/*` styles;
- effect cards используют локальные `Effects/*` styles;
- layout построен на auto-layout;
- шрифт загружается до каждого изменения текста.

## Содержимое страниц

### Cover

- название портала;
- позиционирование независимого городского навигатора;
- принципы доверия, проверки источников и отсутствия давления.

### Getting Started

- источник правды;
- правила работы с подтверждёнными и проверяемыми данными;
- запрет ложного дефицита, неподтверждённых цен и гарантий;
- карта связи GitHub → Figma.

### Foundations

- primitive colors;
- semantic colors;
- typography specimens;
- spacing scale;
- radius scale;
- effect styles.

### Components

Индекс компонентов из `components_v1` в `portal-v2.tokens.json`.

### Utilities

Индекс будущих разделов accessibility, legal states, desktop/mobile screens, source attribution и visual QA.

## Проверка

Локально:

```bash
node tools/validate-figma-documentation-handoff.mjs
```

CI workflow:

```text
Figma documentation handoff
```

Validator проверяет:

- компиляцию всех сгенерированных скриптов;
- лимит 50 000 символов на каждый вызов;
- отсутствие hardcoded HEX;
- отсутствие неподдерживаемых Plugin API;
- ровно один `setCurrentPageAsync` на документационную страницу;
- отсутствие переключений страниц в skeleton;
- наличие auto-layout и variable bindings;
- полный список страниц и компонентов.

## Visual QA после запуска

После физического создания страниц необходимо:

1. получить metadata каждой страницы;
2. сделать screenshot Cover, Getting Started и Foundations;
3. проверить переносы русского текста;
4. проверить отсутствие обрезанных auto-layout frames;
5. проверить contrast semantic swatches;
6. сравнить палитру и типографику с `/design-system/`;
7. записать IDs страниц и root frames в issue №116.

До выполнения visual QA Phase 2 считается подготовленной, но не завершённой в Figma.
