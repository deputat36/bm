# Figma Visual QA Pack

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Пакет продолжает issue №116 и используется после полного выполнения Figma Execution Pack.

## Назначение

Execution Pack создаёт foundations, документационные страницы, 14 ComponentSet и семь составных экранов. Visual QA Pack проверяет уже созданные Figma-объекты и формирует данные для финального визуального аудита.

Пакет не изменяет canvas. Все скрипты read-only.

## Состав

Всего формируется 23 audit payload:

- 1 глобальная проверка foundations и общей библиотеки;
- 14 компонентных страниц;
- 8 экранных страниц.

Глобальная проверка ожидает:

- 4 variable collections;
- 53 variables;
- 8 text styles;
- 6 effect styles;
- 14 ComponentSet;
- 119 вариантов.

Компонентные страницы:

1. Button;
2. Verification Status;
3. Form Field;
4. FAQ Accordion;
5. Brand;
6. Top Navigation;
7. Project Card;
8. Fact Card;
9. Lead Form Card;
10. Scenario Card;
11. Content Card;
12. Step Card;
13. Link Card;
14. Site Footer.

Экранные страницы:

1. Homepage Hero;
2. Homepage Start & Objects;
3. Homepage Apartments & Outcomes;
4. Homepage Process & Purchase;
5. Homepage Purchase & Resources;
6. Homepage FAQ & Lead;
7. Homepage Full.

## Сборка

```bash
node tools/build-figma-visual-qa-pack.mjs
```

По умолчанию пакет создаётся в:

```text
build/figma-visual-qa-pack/
```

Можно передать другую папку:

```bash
node tools/build-figma-visual-qa-pack.mjs /tmp/figma-visual-qa-pack
```

## Файлы пакета

- `manifest.json` — порядок, ожидаемые страницы, варианты, screen-key, section-key, размеры payload и SHA-256;
- `ledger.template.json` — журнал выполнения и screenshot QA;
- `README.md` — краткая инструкция;
- 22 пронумерованных JavaScript-файла.

## Выполнение

Перед началом должны быть полностью выполнены все 27 шагов Figma Execution Pack.

Каждый JavaScript-файл запускается отдельным вызовом:

```text
Figma.use_figma
skillNames: resource:figma-use
```

Порядок сохраняется. Первый файл выполняет глобальную проверку без переключения страницы. Каждый следующий audit переключается ровно на одну целевую страницу.

Результат каждого вызова нужно сохранить как отдельный JSON и занести в `ledger.template.json`.

## Что возвращает глобальная проверка

- ID и названия четырёх variable collections;
- число Portal v2 variables;
- ID text styles;
- ID effect styles;
- ID и число вариантов каждого ComponentSet;
- итоговое количество вариантов;
- errors и warnings.

Дополнительные коллекции или стили не удаляются. Они отражаются как предупреждение, если не относятся к Portal v2.

## Что возвращает page-level audit

Для каждой страницы возвращаются:

- page ID и page name;
- generated root IDs;
- `component-key` и `run-id`;
- ComponentSet IDs и variant count;
- screen IDs и `screen-key`;
- section IDs и `section-key`;
- количество instances и text nodes;
- route metadata;
- form metadata;
- screenshot targets.

Также выполняются эвристические проверки:

- `missingFonts` — текстовые узлы с отсутствующим шрифтом;
- `detachedInstances` — экземпляры без main component;
- `overflowCandidates` — дочерние узлы, выходящие за границы родителя с включённым `clipsContent`;
- дубли generated root;
- отсутствующие ComponentSet, screen-key и section-key.

`overflowCandidates` является сигналом для ручной проверки, а не автоматическим доказательством дефекта. Декоративные элементы могут намеренно выходить за границы, но не должны обрезать важный текст или действия.

## Screenshot QA

Manifest содержит 30 screenshot targets:

- по одному ComponentSet на каждой из 14 компонентных страниц;
- Desktop и Mobile на каждой из семи экранных страниц.

После выполнения page-level audit нужно взять возвращённый node ID и вызвать:

```text
Figma.get_screenshot
```

Рекомендуемые размеры:

- ComponentSet — `maxDimension: 2600`;
- обычные составные экраны — `maxDimension: 4096`;
- FAQ & Lead — `maxDimension: 6144`;
- Homepage Full — `maxDimension: 12000`.

Для полной главной нужно отдельно проверить:

1. Header и Hero;
2. порядок 12 секций;
3. отсутствие горизонтального overflow;
4. переносы в Project Card, FAQ и формах;
5. Desktop 1440 px и Mobile 360 px;
6. контейнеры 1200 и 336 px;
7. exposed CTA;
8. обязательное согласие;
9. независимую юридическую оговорку;
10. Footer.

## Ledger

`ledger.template.json` содержит запись для каждого audit:

- статус;
- время выполнения;
- имя result-файла;
- errors и warnings;
- page ID;
- root IDs;
- screenshot node IDs;
- имена screenshot-файлов.

Допустимые рабочие статусы:

- `not_started`;
- `passed`;
- `warning`;
- `failed`;
- `blocked`.

Финальный статус `passed` допускается только после просмотра screenshot и сверки с production.

## Проверка пакета

```bash
node tools/validate-figma-visual-qa-pack.mjs
```

Validator:

- реально собирает пакет во временную папку;
- проверяет 23 audit payload;
- проверяет 30 screenshot targets;
- пересчитывает SHA-256;
- проверяет итоговый JavaScript;
- ограничивает payload 50 000 символами;
- требует ноль или одно переключение страницы;
- запрещает canvas mutations;
- проверяет 14 ComponentSet и 119 вариантов;
- проверяет Desktop/Mobile screen-key;
- требует 12 section-key для Homepage Full.

CI workflow:

```text
Figma visual QA pack
```

Workflow публикует artifact `figma-visual-qa-pack` на 30 дней.

## Блокировка Starter

На текущем тарифе Figma Starter исчерпан месячный лимит MCP. Заблокированы `get_metadata` и `use_figma`, поэтому физический запуск audit пока невозможен.

Пакет не подменяет Visual QA. Он сокращает число ручных действий и обеспечивает одинаковые проверки после восстановления доступа.

## Завершение issue

После выполнения всех проверок в issue №116 нужно записать:

- IDs всех 14 ComponentSet;
- page/root IDs семи экранов;
- Desktop/Mobile frame IDs;
- результаты errors/warnings;
- ссылки или имена screenshots;
- итог сверки с `index.html`;
- найденные исправления и связанные PR.

## Catalog audit

Visual QA Pack содержит 23 audit payload: один глобальный, 14 компонентных и 8 экранных. Добавлены `catalog-desktop` и `catalog-mobile`, девять section-key и два screenshot targets. Общее количество screenshot targets — 30.
