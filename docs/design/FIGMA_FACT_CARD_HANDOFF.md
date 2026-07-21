# Figma Fact Card Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Этот handoff продолжает Phase 3 issue №116 и добавляет восьмое семейство компонентов Design System v2 «Городской навигатор».

## Страница

`12 Component · Fact Card`

Component set `Fact Card` содержит 4 варианта:

- Context: `Light`, `Hero`;
- Size: `Desktop`, `Mobile`.

## Component properties

- `Value` — TEXT;
- `Label` — TEXT.

## Production-связь

Компонент повторяет структуру `.fact` на главной странице и в `/design-system/`:

- одно короткое выделенное значение;
- одно пояснение максимум в две строки;
- Desktop ориентирован на четырёхколоночную сетку фактов;
- Mobile соответствует одноколоночному состоянию при ширине до 640 px;
- Light использует светлую поверхность и `Effects/Card`;
- Hero использует контрастную тёмную поверхность без карточной тени.

Размеры:

- Desktop — 278 px, ориентир по высоте 124 px, padding 24 px;
- Mobile — 336 px, ориентир по высоте 104 px, padding 16 px;
- radius Desktop — 24 px;
- radius Mobile — 18 px.

## Правила содержания

Fact Card допускает:

- количество объектов;
- категорию или тип сценария покупки;
- короткий нейтральный ориентир;
- отсутствие конкретного действия, например «без брони».

Fact Card не должен использоваться как подтверждение:

- актуальной цены;
- наличия квартиры;
- срока строительства;
- ипотечной ставки;
- одобрения банка;
- юридического статуса объекта.

Для достоверности и состояния источника используется отдельный компонент `Verification Status`. Цвет Fact Card обозначает только контекст поверхности, а не степень подтверждения данных.

## Генератор

```bash
node tools/figma/generate-portal-v2-fact-card-components.mjs
```

Генератор запускается после Foundations. Зависимостей от других ComponentSet нет.

Параметр навыков:

```text
skillNames: resource:figma-use,resource:figma-generate-library
```

## Проверка

Локально:

```bash
node tools/validate-figma-atomic-components-handoff.mjs fact
```

Validator контролирует:

- 4 варианта Context × Size;
- component properties `Value` и `Label`;
- variable bindings цветов, spacing и radius;
- `Effects/Card` для Light;
- отсутствие hardcoded HEX;
- один `setCurrentPageAsync`;
- синтаксис исходного и итогового JavaScript;
- лимит 50 000 символов для `Figma.use_figma`.

## Visual QA

После физического запуска в Figma необходимо:

1. проверить metadata страницы `12 Component · Fact Card`;
2. сделать screenshot всех четырёх вариантов;
3. проверить контраст Light и Hero;
4. проверить значения из одного и двух слов;
5. проверить пояснения в одну и две строки;
6. убедиться, что длинные тексты не используются вместо короткого факта;
7. сравнить Desktop и Mobile с `.fact` на главной странице;
8. записать page ID, root ID и component set ID в issue №116.

До Visual QA компонент считается подготовленным в GitHub, но не завершённым в Figma из-за лимита MCP тарифа Starter.
