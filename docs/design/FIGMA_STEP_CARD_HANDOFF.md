# Figma Step Card Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Страница:

`19 Component · Step Card`

Компонент продолжает issue №116 и Design System v2 «Городской навигатор».

## Назначение

Step Card показывает один последовательный этап консультации или покупки. Карточка помогает объяснить процесс, но не создаёт впечатление, что действие уже выполнено, квартира забронирована или результат гарантирован.

Компонент не заменяет:

- Scenario Card — выбор маршрута;
- Content Card — выбор комнатности или результат консультации;
- Project Card — сведения о конкретном объекте;
- Verification Status — статус проверки данных.

## Варианты

Подготовлено 8 вариантов:

- Layout: `Desktop`, `Mobile`;
- Grid: `Three`, `Four`;
- State: `Default`, `Hover`.

Формула:

`2 Layout × 2 Grid × 2 State = 8 вариантов`

## Размеры

### Desktop · Grid Three

- ширина: 384 px;
- высота: 236 px;
- padding: 26 px;
- radius: 22 px.

Используется для трёх шагов консультации.

### Desktop · Grid Four

- ширина: 284 px;
- высота: 230 px;
- padding: 26 px;
- radius: 22 px.

Используется для четырёх шагов покупки.

### Mobile

- ширина: 336 px;
- высота: 220 px;
- padding: 22 px;
- radius: 18 px.

Grid сохраняется как смысловая ось, хотя обе мобильные версии имеют одинаковую ширину.

## Component properties

- `Step label` — TEXT;
- `Title` — TEXT;
- `Description` — TEXT;
- `Show step label` — BOOLEAN.

Properties связаны с реальными дочерними слоями через `componentPropertyReferences`.

## Структура

1. Step marker.
2. Title.
3. Description.

Компонент не содержит Button instance. CTA размещается на уровне секции, когда это предусмотрено production-разметкой.

## Маркер шага

Маркер собран из токенов:

- `coral/100`;
- `action/primary`;
- `action/primary/hover`;
- `Radius/pill`;
- `Typography/Label`.

Примеры:

- `Шаг 1` для консультации;
- `1` для сценария покупки.

Цвет маркера не означает юридический статус или подтверждение сведений.

## Поверхность

Используются:

- `surface/primary`;
- `border/default`;
- `border/strong`;
- `Effects/Card`;
- `Effects/Card Hover`;
- `text/primary`;
- `text/muted`.

Hardcoded HEX запрещён.

## Состояния

### Default

Обычная карточка этапа.

### Hover

- усиливается граница;
- используется `Effects/Card Hover`;
- содержание и смысл шага не меняются.

Hover не используется для создания ложной срочности.

## Контентные ограничения

Допустимо:

- объяснять последовательность действий;
- отмечать, что сведения сверяются;
- предлагать расчёт или запрос документов как следующий шаг;
- указывать отсутствие бронирования и обязательств.

Запрещено без отдельного подтверждения:

- обещать одобрение ипотеки;
- гарантировать юридический результат;
- сообщать неподтверждённую цену или наличие;
- утверждать, что заявка фиксирует стоимость;
- создавать впечатление обязательности оплаты.

## Production-связь

Источники:

- `index.html`;
- `assets/css/home-polish.css`;
- `data/design/portal-v2.tokens.json`;
- `assets/css/portal-v2.tokens.css`.

Production-сетки:

- `grid--3` — три консультационных шага;
- `grid--4` — четыре покупательских шага.

## Генератор

`tools/figma/generate-portal-v2-step-card-components.mjs`

Генератор:

- создаёт настоящие ComponentNode;
- объединяет их через `figma.combineAsVariants`;
- использует auto-layout;
- связывает paints и dimensions с variables;
- создаёт TEXT/BOOLEAN properties;
- помечает root через shared plugin data;
- переключает страницу один раз через `setCurrentPageAsync`.

## Порядок запуска

1. Foundations.
2. Button и остальные базовые компоненты.
3. Content Card.
4. Step Card.
5. `20 Screen · Homepage Process & Purchase`.

Параметр навыков:

```text
skillNames: resource:figma-use,resource:figma-generate-library
```

## Проверка

Локально:

```bash
node tools/validate-figma-atomic-components-handoff.mjs step
```

CI:

`Figma atomic components handoff`

Проверяется:

- 8 вариантов;
- оси Layout, Grid и State;
- component properties;
- variable bindings;
- отсутствие hardcoded HEX;
- один `setCurrentPageAsync`;
- итоговый JavaScript для `Figma.use_figma`.

## Visual QA

После физического запуска в Figma:

1. проверить 8 вариантов;
2. проверить ширины 384, 284 и 336 px;
3. проверить переносы длинных заголовков;
4. проверить `Step label`, `Title`, `Description`;
5. проверить `Show step label`;
6. проверить Default и Hover;
7. убедиться, что marker не воспринимается как Verification Status;
8. сделать screenshot страницы;
9. записать page ID, root ID и ComponentSet ID в issue №116.

До Visual QA компонент считается подготовленным в GitHub, но не завершённым в Figma.
