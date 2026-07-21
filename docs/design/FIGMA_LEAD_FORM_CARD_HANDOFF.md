# Figma Lead Form Card Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Продолжает Phase 3 issue №116.

## Страница

`13 Component · Lead Form Card`

## ComponentSet

`Lead Form Card` содержит 4 варианта:

- Layout: `Desktop`, `Mobile`;
- Scope: `Quick`, `Detailed`.

## Назначение вариантов

### Quick

Используется в hero, каталоге и карточках объектов.

Поля:

1. Имя.
2. Телефон.
3. Интересующий объект.

Desktop-карточка имеет ширину 438 px и использует `Form Field / Size=Compact` шириной 378 px.

### Detailed

Используется после того, как посетитель готов сообщить параметры покупки.

Поля:

1. Имя.
2. Телефон.
3. Интересующий объект.
4. Комнатность.
5. Бюджет.
6. Способ покупки.
7. Срок покупки.
8. Комментарий.

Desktop-карточка имеет ширину 576 px и использует `Form Field / Size=Wide` шириной 520 px.

### Mobile

Оба сценария имеют ширину 336 px, padding 22 px и используют настоящие `Form Field / Size=Mobile` шириной 292 px.

Desktop-поля не масштабируются и не обрезаются.

## Component properties

Реально связаны с видимыми слоями:

- `Eyebrow` — TEXT;
- `Show eyebrow` — BOOLEAN;
- `Title` — TEXT;
- `Description` — TEXT;
- `Consent text` — TEXT;
- `Hint` — TEXT;
- `Show hint` — BOOLEAN;
- `Footer note` — TEXT;
- `Show footer note` — BOOLEAN.

Текст CTA редактируется через `Label` вложенного Button `Context=Light` instance. Фиктивное внешнее свойство для вложенного текста не создаётся.

## Зависимости

- локальный ComponentSet `Form Field`;
- локальный ComponentSet `Button`, вариант `Context=Light`;
- `Effects/Floating` для Quick;
- `Effects/Card` для Detailed;
- semantic colors поверхности, текста и границ;
- primitive `coral/100` для типа заявки.

## Согласие

Согласие располагается непосредственно перед CTA и обязательно в Quick и Detailed.

Текст должен сообщать:

- цель обработки персональных данных;
- что заявка нужна для ответа и обратной связи;
- что заявка не является бронью;
- что заявка не фиксирует цену.

Компонент соответствует runtime-функции `addConsent()` из `assets/js/main.js`.

## Юридически безопасные правила

Lead Form Card не обещает:

- актуальную цену;
- наличие квартиры;
- бронирование;
- одобрение ипотеки;
- юридический результат;
- конкретный срок ответа, если он не обеспечен процессом.

В смысловом блоке используется один Primary CTA.

## Генераторы

Сначала обновить Button и Form Field:

```bash
node tools/figma/generate-portal-v2-button-components.mjs
node tools/figma/generate-portal-v2-form-field-components.mjs
```

Затем создать Lead Form Card:

```bash
node tools/figma/generate-portal-v2-lead-form-card-components.mjs
```

Каждая команда выводит JavaScript для отдельного последовательного вызова `Figma.use_figma`.

Параметр навыков:

```text
skillNames: resource:figma-use,resource:figma-generate-library
```

## Visual QA

После физического запуска в Figma:

1. проверить 16 вариантов Button;
2. проверить 27 вариантов Form Field;
3. проверить все 4 варианта Lead Form Card;
4. проверить отсутствие обрезки русских текстов;
5. проверить ширины 520, 378 и 292 px;
6. проверить, что согласие видно перед CTA;
7. проверить, что Quick содержит 3 поля, Detailed — 8;
8. проверить вложенные Form Field/Button instances;
9. проверить TEXT и BOOLEAN properties;
10. сравнить с главной, каталогом и `assets/css/leadgen.css`;
11. записать page ID, root ID и component set ID в issue №116.

До Visual QA компонент считается подготовленным в GitHub, но не завершённым в Figma.