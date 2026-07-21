# Figma Scenario Card Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Продолжает Phase 4 issue №116.

## Страница

`15 Component · Scenario Card`

## ComponentSet

`Scenario Card` содержит 12 вариантов:

- Layout: `Desktop`, `Mobile`;
- Intent: `Object`, `Selection`, `Mortgage`;
- State: `Default`, `Hover`.

## Назначение Intent

### Object

- Заголовок: «Интересует конкретный дом».
- CTA: «Выбрать дом».
- Ведёт к списку приоритетных объектов.
- Не заменяет Project Card и не сообщает характеристики дома.

### Selection

- Заголовок: «Нужен подбор новостройки».
- CTA: «Пройти подбор».
- Ведёт к маршруту с пятью вопросами.
- Не требует оставлять контакты до получения предварительного результата.

### Mortgage

- Заголовок: «Нужно рассчитать покупку».
- CTA: «Рассчитать покупку».
- Ведёт к предварительному финансовому расчёту.
- Не обещает ставку, платёж, лимит или одобрение банка.

## Размеры

### Desktop

- ширина 384 px;
- padding 26 px;
- radius 22 px;
- горизонтальная сетка из трёх карточек в контейнере 1200 px.

### Mobile

- ширина 336 px;
- padding 22 px;
- radius 18 px;
- вертикальный поток без масштабирования desktop-карточек.

## Component properties

- `Title` — TEXT;
- `Description` — TEXT;
- `Show action` — BOOLEAN.

Текст CTA задаётся соответствующим Intent через `Label` вложенного Button instance. Фиктивное внешнее свойство для вложенного текста не создаётся.

## Зависимости

- локальный ComponentSet `Button`;
- Button `Context=Light`, `Type=Primary`, `State=Default`;
- `Typography/H3`;
- `Typography/Body`;
- `Effects/Card`;
- `Effects/Card Hover`;
- semantic colors поверхности, текста и границ.

## Production-связь

Источник структуры и текстов:

- `index.html`, блок `[data-homepage-routes]`;
- `assets/css/home-polish.css`;
- production-сетка `.grid.grid--3`;
- production-карточка `.card.card--shadow`.

Scenario Card намеренно не содержит:

- статуса проверки;
- цены;
- наличия;
- срока строительства;
- характеристик квартиры;
- названия застройщика;
- формы заявки.

Для этих задач используются Project Card, Verification Status, Lead Form Card и профильные страницы.

## Генератор

```bash
node tools/figma/generate-portal-v2-scenario-card-components.mjs
```

Команда выводит JavaScript для отдельного вызова `Figma.use_figma`.

Параметр навыков:

```text
skillNames: resource:figma-use,resource:figma-generate-library
```

## Visual QA

После физического запуска в Figma:

1. проверить все 12 вариантов;
2. проверить Desktop 384 px и Mobile 336 px;
3. проверить три Intent и два State;
4. проверить `Title`, `Description`, `Show action`;
5. проверить настоящий вложенный Light Button instance;
6. проверить отсутствие обрезки длинных русских описаний;
7. сравнить с блоком «С чего начать» на главной;
8. записать page ID, root ID и component set ID в issue №116.

До Visual QA компонент считается подготовленным в GitHub, но не завершённым в Figma.
