# Figma Homepage Start & Objects Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Продолжает Phase 4 issue №116.

## Страница

`16 Screen · Homepage Start & Objects`

Создаются два самостоятельных фрейма:

- `Homepage Start and Objects / Desktop` — ширина 1440 px;
- `Homepage Start and Objects / Mobile` — ширина 360 px.

## Источник

Production-разметка:

- `index.html`, секция `[data-homepage-routes]`;
- `index.html`, секция `#objects`;
- `assets/css/home-polish.css`;
- сетки `.grid.grid--3`;
- карточки `.card.card--shadow`.

Внешних изображений в этих двух секциях нет. Параллельный capture через `generate_figma_design` для переноса imageHash не требуется.

## Состав экрана

### 1. С чего начать

Заголовок:

- eyebrow: «С чего начать»;
- H2: «Выберите свою задачу»;
- пояснение: цена, наличие и применимость программы проверяются на дату обращения.

В Desktop располагаются три Scenario Card в строку:

1. Object — «Интересует конкретный дом».
2. Selection — «Нужен подбор новостройки».
3. Mortgage — «Нужно рассчитать покупку».

В Mobile карточки располагаются вертикально и используют настоящие `Layout=Mobile` варианты.

### 2. Приоритетные объекты

Заголовок:

- eyebrow: «Приоритет сбора заявок»;
- H2: «Выберите интересующий объект»;
- пояснение о привязке обращения к конкретному адресу.

Используются три Project Card:

1. Просторная 4А.
2. Аэродромная 18Г.
3. Сенная 76.

Все три карточки используют:

- Verification: `Pending`;
- State: `Default`;
- статус «Данные уточняются»;
- Primary CTA «Оставить заявку»;
- Secondary CTA «Подробнее».

Под сеткой располагается Secondary Button «Посмотреть другие новостройки».

## Зависимости

Перед экраном должны быть физически созданы:

- `05 Component · Button`;
- `11 Component · Project Card`;
- `15 Component · Scenario Card`.

Экран использует только локальные instances:

- Scenario Card — 3 на Desktop и 3 на Mobile;
- Project Card — 3 на Desktop и 3 на Mobile;
- Button `Context=Light`, `Type=Secondary`, `State=Default`.

Внутренние слои компонентов не копируются и не detatch-ятся.

## Размеры

### Desktop

- screen width — 1440 px;
- content width — 1200 px;
- три колонки;
- расстояние между карточками — 22 px;
- section padding — 88 px;
- Scenario Card — 384 px;
- Project Card — 384 px.

### Mobile

- screen width — 360 px;
- content width — 336 px;
- вертикальный поток;
- расстояние между карточками — 18 px;
- section padding — 62 px;
- Scenario Card — 336 px;
- Project Card — 336 px.

## Юридически безопасный контракт

Экран не утверждает без проверки:

- актуальную цену;
- наличие квартиры;
- срок строительства;
- ставку;
- одобрение ипотеки;
- возможность бронирования.

CTA «Оставить заявку» означает обращение за консультацией. Он не фиксирует цену, не создаёт бронь и не подтверждает наличие.

Scenario Card используется только для выбора маршрута. Project Card сообщает статус проверки до описания объекта.

## Генератор

```bash
node tools/figma/generate-portal-v2-homepage-start-objects-screen.mjs
```

Команда выводит JavaScript для отдельного вызова `Figma.use_figma`.

Параметр навыков:

```text
skillNames: resource:figma-use,resource:figma-generate-design
```

## Идемпотентность

Корневой frame страницы получает shared plugin data:

```text
namespace: portal-v2
key: component-key
value: homepage-start-objects-screen
```

Каждый screen frame получает `screen-key`:

- `homepage-start-objects-desktop`;
- `homepage-start-objects-mobile`.

Повторный запуск удаляет только ранее созданный root этого handoff.

## Проверка

Локально:

```bash
node tools/validate-figma-homepage-start-objects-handoff.mjs
```

CI workflow:

```text
Figma homepage start objects handoff
```

Validator контролирует:

- source syntax и итоговый JavaScript;
- лимит 50 000 символов;
- один `setCurrentPageAsync`;
- отсутствие hardcoded HEX и unsupported API;
- локальные Scenario Card, Project Card и Button instances;
- Desktop 1440/1200 и Mobile 360/336;
- три сценария и три объекта;
- Pending verification;
- CTA «Оставить заявку»;
- production-тексты и безопасные формулировки.

## Visual QA

После физического запуска в Figma:

1. получить metadata страницы;
2. записать page ID и root ID;
3. получить screenshot Desktop;
4. получить screenshot Mobile;
5. проверить три Scenario Card;
6. проверить три Pending Project Card;
7. проверить переносы длинных русских описаний;
8. проверить CTA «Оставить заявку» и «Подробнее»;
9. проверить вторичный переход к остальным новостройкам;
10. проверить отсутствие обрезки на 360 px;
11. сравнить с production `index.html`;
12. записать результаты в issue №116.

До metadata и screenshot QA экран считается подготовленным в GitHub, но не завершённым в Figma.
