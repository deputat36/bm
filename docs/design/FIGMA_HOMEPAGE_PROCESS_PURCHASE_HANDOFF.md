# Figma Homepage Process & Purchase Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Страница:

`20 Screen · Homepage Process & Purchase`

Экран продолжает issue №116 и собирает две production-секции главной из локальных компонентов Design System v2.

## Состав

Подготовлены два top-level frame:

- `Homepage Process & Purchase / Desktop` — 1440 px;
- `Homepage Process & Purchase / Mobile` — 360 px.

Контейнеры:

- Desktop — 1200 px;
- Mobile — 336 px.

Экран не содержит внешних изображений. Web-capture через `generate_figma_design` не требуется.

## Секция 1. Как проходит консультация

Eyebrow:

`Как проходит консультация`

Заголовок:

`От вопроса к понятному следующему шагу`

Описание:

`Без бронирования, фиксации цены и обязательств со стороны покупателя.`

Используются три Step Card:

1. `Шаг 1` — `Уточняем задачу`;
2. `Шаг 2` — `Сверяем информацию`;
3. `Шаг 3` — `Определяем действие`.

Desktop использует варианты:

`Layout=Desktop, Grid=Three, State=Default`

Mobile использует:

`Layout=Mobile, Grid=Three, State=Default`

В секции нет CTA, потому что production-разметка объясняет процесс без дополнительного давления.

## Секция 2. Как купить квартиру

Eyebrow:

`Покупка без лишней путаницы`

Заголовок:

`Как купить квартиру в новостройке Борисоглебска`

Описание:

`Начните не с передачи денег, а с определения задачи, проверки объекта и понятного финансового сценария.`

Используются четыре Step Card:

1. `Определить параметры`;
2. `Сравнить новые дома`;
3. `Проверить документы`;
4. `Рассчитать покупку`.

Desktop использует варианты:

`Layout=Desktop, Grid=Four, State=Default`

Mobile использует:

`Layout=Mobile, Grid=Four, State=Default`

После карточек размещаются Button instances:

- Primary: `Начать подбор`;
- Secondary: `Что проверить перед покупкой`.

Обе кнопки используют `Context=Light`.

## Сетка

### Desktop

Консультация:

- 3 карточки по 384 px;
- gap 22 px;
- общая ширина 1200 px.

Покупка:

- 4 карточки по 284 px;
- gap 22 px;
- общая ширина 1200 px.

### Mobile

- вертикальный поток;
- ширина карточки 336 px;
- кнопки растягиваются на ширину контейнера;
- секции сохраняют исходный порядок.

## Компонентные зависимости

Экран использует только локальные instances:

- Step Card;
- Button.

Компонентные ключи не угадываются. Генератор разрешает локальные варианты по точным фрагментам имени ComponentSet и variant properties.

Code Connect в репозитории отсутствует. Existing-screen inspection и library search должны быть повторены после снятия Starter-лимита Figma MCP.

## Юридические ограничения

Экран не должен:

- обещать бронь;
- фиксировать цену;
- гарантировать наличие квартиры;
- обещать одобрение банка;
- подменять проверку договора и документов;
- создавать впечатление обязательной оплаты после консультации.

Безопасные формулировки:

- `сверяем информацию`;
- `проверить документы`;
- `рассчитать покупку`;
- `без обязательств со стороны покупателя`.

## Источники

- `index.html`;
- `assets/css/home-polish.css`;
- `data/design/portal-v2.tokens.json`;
- `assets/css/portal-v2.tokens.css`;
- `tools/figma/generate-portal-v2-step-card-components.mjs`.

## Генератор

`tools/figma/generate-portal-v2-homepage-process-purchase-screen.mjs`

Генератор:

- создаёт Desktop и Mobile frames;
- использует настоящие Step Card и Button instances;
- сохраняет production-тексты;
- использует auto-layout;
- не содержит hardcoded HEX;
- создаёт shared plugin data screen keys;
- переключает Figma-страницу один раз.

## Порядок запуска

1. Foundations.
2. Button.
3. Step Card.
4. Screen generator.
5. Metadata QA.
6. Screenshot QA Desktop и Mobile.

Параметр навыков:

```text
skillNames: resource:figma-use,resource:figma-generate-library,resource:figma-generate-design
```

## Проверка

Локально:

```bash
node tools/validate-figma-homepage-process-purchase-handoff.mjs
```

CI:

`Figma homepage process purchase handoff`

Validator проверяет:

- page name;
- Desktop 1440 и Mobile 360;
- контейнеры 1200 и 336;
- Step Card и Button dependencies;
- Grid Three и Grid Four;
- все семь шагов;
- два покупательских CTA;
- юридически безопасные формулировки;
- отсутствие unsupported API и hardcoded HEX;
- итоговый JavaScript.

## Visual QA

После снятия Figma MCP Starter-лимита:

1. создать Step Card;
2. выполнить screen generator;
3. получить metadata страницы;
4. проверить количество Step Card instances: 7 на каждый layout;
5. проверить 3×384 и 4×284 сетки Desktop;
6. проверить вертикальный Mobile-поток;
7. проверить переносы длинных текстов;
8. проверить два CTA после покупательской секции;
9. сделать screenshots Desktop и Mobile;
10. сравнить с production HTML/CSS;
11. записать page IDs и screen IDs в issue №116.

До Visual QA экран считается подготовленным в GitHub, но не завершённым в Figma.
