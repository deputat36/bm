# Figma Foundations handoff

## Назначение

Этот handoff создаёт нативный слой Foundations в существующем Figma-файле портала:

- Figma file key: `rhFYa5gPDhF009hZsfEGSX`;
- файл: https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX;
- GitHub issue: #116.

Источник значений — `data/design/portal-v2.tokens.json`. CSS-имена для WEB Code Syntax определены в `assets/css/portal-v2.tokens.css`.

## Что создаётся

### Variable collections

1. `01 Primitives · Color`
2. `02 Semantic · Color`
3. `03 Dimensions · Spacing`
4. `04 Dimensions · Radius`

Каждая коллекция содержит один режим `Light`. Это соответствует текущему светлому интерфейсу сайта и ограничению Figma Starter на количество modes.

### Variables

- 21 primitive color variable;
- 17 semantic color variables, связанные с primitives через `VARIABLE_ALIAS`;
- 9 spacing variables;
- 6 radius variables.

Primitive colors имеют пустой `scopes` и скрыты из property pickers. Semantic colors, spacing и radius получают точные scopes по назначению.

Каждая переменная получает WEB Code Syntax вида:

- `var(--color-action-primary)`;
- `var(--space-lg)`;
- `var(--radius-md)`.

### Text styles

1. `Typography/Display`
2. `Typography/H1`
3. `Typography/H2`
4. `Typography/H3`
5. `Typography/Body Large`
6. `Typography/Body`
7. `Typography/Label`

Код сайта использует системный font stack. Поскольку Figma не поддерживает CSS font stacks, скрипт выбирает первый реально доступный шрифт из списка:

1. Segoe UI;
2. Arial;
3. Inter;
4. Roboto;
5. Noto Sans.

Для каждого веса выбирается ближайший доступный стиль. Выбранный font загружается до изменения text style.

### Effect styles

1. `Effects/Card`
2. `Effects/Card Hover`
3. `Effects/Floating`
4. `Effects/Focus`

## Создание use_figma-кода

Из корня репозитория:

```bash
node tools/figma/generate-portal-v2-foundations.mjs > /tmp/portal-v2-foundations.use-figma.js
```

Проверка handoff:

```bash
node tools/validate-figma-foundations-handoff.mjs
```

Validator проверяет:

- наличие primitive target для каждого semantic alias;
- совпадение HEX semantic token и его primitive target;
- соответствие JSON и CSS Code Syntax;
- синтаксис исходного генератора;
- синтаксис сгенерированного Plugin API-кода;
- лимит `use_figma` в 50 000 символов;
- scopes;
- наличие alias, font и style API;
- отсутствие `ALL_SCOPES`, `figma.notify`, `figma.closePlugin`, sync page switching и неподдерживаемого plugin data API.

## Запуск через Figma MCP

Перед каждым запуском необходимо загрузить навыки:

- `figma-use`;
- `figma-generate-library`.

Затем содержимое `/tmp/portal-v2-foundations.use-figma.js` передаётся в:

```text
Figma.use_figma
fileKey: rhFYa5gPDhF009hZsfEGSX
skillNames: resource:figma-use,resource:figma-generate-library
```

Скрипт идемпотентный:

- ищет коллекции, variables и styles по имени;
- создаёт только отсутствующие сущности;
- обновляет существующие значения, aliases, scopes и Code Syntax;
- возвращает IDs созданных и обновлённых объектов.

Повторный запуск не должен создавать дубликаты.

## Проверка результата

После успешного запуска необходимо выполнить read-only `Figma.use_figma` и проверить:

- 4 collections;
- один mode `Light` в каждой collection;
- 53 variables;
- отсутствие `ALL_SCOPES`;
- Code Syntax на каждой variable;
- 7 text styles;
- 4 effect styles;
- отсутствие semantic colors с raw HEX вместо alias.

После этого можно переходить к Phase 2:

- Cover;
- Getting Started;
- Foundations;
- разделитель;
- Components;
- разделитель;
- Utilities.

## Текущая блокировка

На 20 июля 2026 года Figma MCP для подключённой команды Starter возвращает `tool call limit` даже при чтении metadata. До снятия лимита генератор и CI являются подготовленным, проверяемым handoff, но не доказательством фактического создания объектов в Figma.
