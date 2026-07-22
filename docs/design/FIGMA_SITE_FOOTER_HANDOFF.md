# Figma Site Footer Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Продолжает issue №116 и Design System v2 «Городской навигатор».

## Назначение

`Site Footer` завершает страницы независимого городского каталога и сохраняет три обязательных смысла:

1. портал посвящён новостройкам Борисоглебска;
2. портал не является официальным сайтом застройщика;
3. сведения уточняются по публичным источникам.

Footer не используется как рекламный блок одного жилого комплекса или застройщика.

## Страница

`24 Component · Site Footer`

## Варианты

2 варианта:

- `Layout=Desktop`;
- `Layout=Mobile`.

Искусственные Default/Hover варианты не создаются, потому что Footer является композиционным контейнером, а состояния ссылок принадлежат интерактивным элементам production-кода.

## Размеры

- Desktop — 1200 px;
- Mobile — 336 px.

Desktop использует горизонтальную двухколоночную структуру. Mobile использует вертикальный поток.

## Зависимости

- `Brand / Context=Dark / Size=Desktop`;
- `Brand / Context=Dark / Size=Mobile`;
- Foundations variables;
- `Typography/Body`;
- `Typography/Label`.

Code Connect-файлы для Footer и Brand в текущем чистом HTML/CSS проекте отсутствуют. Handoff работает через локальные Figma components и production-источники.

## Component properties

- `Tagline` — TEXT;
- `Phone` — TEXT;
- `Disclaimer` — TEXT;
- `Links` — TEXT.

Brand title остаётся свойством вложенного Brand instance.

## Production-контент

Tagline:

`Городской каталог новых домов и квартир.`

Phone:

`8 903 857-69-09`

Disclaimer:

`Не является официальным сайтом застройщика. Информация уточняется по публичным источникам.`

Links:

`Источники · Политика данных · Контакты`

## Route metadata

На каждом варианте сохраняются:

```text
namespace: portal-v2
phone-route: tel:+79038576909
sources-route: sources/
privacy-route: privacy/
contacts-route: contacts/
```

Маршруты хранятся отдельно от текста, чтобы будущий handoff не превращал весь Footer в одну неоднозначную ссылку.

## Токены

- background — `surface/emphasis`;
- основной текст — `text/inverse`;
- телефон и юридические ссылки — `coral/100`;
- spacing — `sm`, `md`, `xl`, `2xl`.

Hardcoded HEX запрещён.

## Юридические ограничения

Footer обязательно сохраняет независимый статус портала.

Запрещено:

- добавлять «официальный сайт»;
- создавать впечатление работы от имени застройщика;
- заменять Brand портала брендом одного ЖК;
- обещать актуальность цены или наличия без повторной проверки;
- скрывать ссылки на источники и политику данных.

## Генератор

```bash
node tools/figma/generate-portal-v2-site-footer-components.mjs
```

Полученный JavaScript выполняется отдельным вызовом `Figma.use_figma`.

```text
skillNames: resource:figma-use,resource:figma-generate-library
```

## Идемпотентность

Root создаётся с shared plugin data:

```text
namespace: portal-v2
component-key: site-footer
```

Повторный запуск удаляет только ранее созданный root Footer.

## Visual QA

После физического запуска в Figma:

1. проверить Desktop шириной 1200 px;
2. проверить Mobile шириной 336 px;
3. проверить Brand Context=Dark;
4. проверить читаемость текста на `surface/emphasis`;
5. проверить TEXT properties;
6. проверить route metadata;
7. сравнить с production Footer;
8. записать page ID, root ID и ComponentSet ID в issue №116.

До Visual QA Footer считается подготовленным в GitHub, но не завершённым в Figma.
