# Figma Execution Pack

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Execution Pack предназначен для физического воспроизведения Design System v2 «Городской навигатор» после восстановления лимита Figma MCP Starter.

## Зачем нужен пакет

В GitHub уже подготовлены foundations, документационные страницы, 14 ComponentSet и 7 составных экранов. Каждый generator выводит готовый JavaScript для `Figma.use_figma`, но запускать файлы вручную по памяти небезопасно:

- компоненты имеют зависимости;
- один вызов не должен переключать страницу более одного раза;
- payload ограничен 50 000 символов;
- при ошибке выполнение нужно немедленно остановить;
- объединение нескольких generators в один скрипт запрещено.

Execution Pack превращает handoff в воспроизводимую последовательность из 27 атомарных шагов.

## Сборка

```bash
node tools/build-figma-execution-pack.mjs
```

По умолчанию пакет создаётся в:

```text
build/figma-execution-pack/
```

Для другой папки:

```bash
node tools/build-figma-execution-pack.mjs /tmp/figma-execution-pack
```

## Состав

Пакет содержит:

- `manifest.json`;
- `README.md`;
- 27 пронумерованных JavaScript payload-файлов.

Каждая запись `manifest.json` содержит:

- порядковый номер;
- идентификатор шага;
- фазу;
- ожидаемую страницу Figma;
- исходный generator;
- аргументы generator;
- имя payload-файла;
- размер в байтах и символах;
- SHA-256;
- обязательные skills;
- зависимости.

## Фазы

### Foundations

1 шаг:

- variables;
- semantic aliases;
- spacing и radius;
- text styles;
- effect styles.

### Documentation

5 шагов:

- `00 Cover`;
- `01 Getting Started`;
- `02 Foundations`;
- `03 Components`;
- `04 Utilities`.

### Components

14 шагов:

- Button;
- Verification Status;
- Form Field;
- FAQ Accordion;
- Brand;
- Top Navigation;
- Project Card;
- Fact Card;
- Lead Form Card;
- Scenario Card;
- Content Card;
- Step Card;
- Link Card;
- `24 Component · Site Footer`.

Итог библиотеки после выполнения:

- 14 ComponentSet;
- 119 вариантов.

### Screens

7 шагов:

- `14 Screen · Homepage Hero`;
- `16 Screen · Homepage Start & Objects`;
- `18 Screen · Homepage Apartments & Outcomes`;
- `20 Screen · Homepage Process & Purchase`;
- `22 Screen · Homepage Purchase & Resources`;
- `23 Screen · Homepage FAQ & Lead`;
- `25 Screen · Homepage Full`.

## Порядок выполнения

1. Скачать CI-artifact `figma-execution-pack` либо собрать пакет локально.
2. Открыть `manifest.json`.
3. Выполнять payload-файлы строго по номеру.
4. Для каждого файла использовать один Figma.use_figma call.
5. Перед вызовом загружать skills, указанные в `skillNames`.
6. Не объединять соседние payload-файлы.
7. После каждого вызова сохранять возвращённые page ID, root ID, ComponentSet ID и created node IDs.
8. При первой ошибке остановиться. Не запускать зависимые шаги.
9. Сверить SHA-256 payload-файла с manifest перед повторным запуском.

## Ограничения

Для каждого payload автоматически проверяется:

- не более 50 000 символов;
- не более одного `setCurrentPageAsync`;
- корректный JavaScript после обёртки в async context;
- отсутствие `figma.notify`, `figma.closePlugin`, sync currentPage, `loadAllPagesAsync`, `getPluginData` и `setPluginData`;
- существование исходного generator;
- выполнение зависимостей раньше потребителя;
- соответствие SHA-256 и размера manifest.

## Проверка

```bash
node tools/validate-figma-execution-pack.mjs
```

Validator собирает пакет во временной папке и проверяет именно итоговые JavaScript payload, а не только исходные generator-файлы.

CI workflow:

```text
Figma execution pack
```

Workflow:

1. проверяет source syntax;
2. запускает validator;
3. собирает пакет;
4. публикует artifact `figma-execution-pack`.

## Visual QA после выполнения

После шага `25 Screen · Homepage Full` необходимо:

1. получить metadata всех созданных страниц;
2. записать page IDs, root IDs и ComponentSet IDs;
3. получить screenshots `Homepage Full / Desktop` и `Homepage Full / Mobile`;
4. проверить переносы, высоты, clipping и пустые зоны;
5. проверить Desktop-контейнер 1200 px и Mobile-контент 336 px;
6. проверить все 12 смысловых секций;
7. проверить FAQ, обе формы, согласие и exposed Submit action;
8. проверить Footer и независимую юридическую оговорку;
9. проверить route/form shared plugin data;
10. зафиксировать результат и ссылки в issue №116.

## Текущая блокировка

На момент подготовки пакета Figma Starter отклоняет даже `get_metadata` сообщением о достижении MCP tool call limit. Поэтому физические страницы, node IDs и screenshots пока не могут быть созданы.

Execution Pack не считается доказательством физической записи в Figma. Он является проверенным воспроизводимым набором для выполнения сразу после восстановления лимита.
