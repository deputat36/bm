# Figma Homepage Purchase & Resources Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Страница:

`22 Screen · Homepage Purchase & Resources`

## Назначение

Экран воспроизводит две последовательные секции главной страницы:

1. «Способы покупки»;
2. «Полезные разделы».

Экран собирается из локальных Link Card instances и не дублирует внутреннюю структуру компонента.

## Форматы

- Desktop — 1440 px, контейнер 1200 px;
- Mobile — 360 px, контейнер 336 px.

Desktop использует две сетки по три карточки шириной 384 px. Mobile использует вертикальный поток карточек шириной 336 px.

## Способы покупки

Заголовок:

`Способы покупки`

Описание:

`Можно заранее обсудить бюджет и подготовиться к сделке.`

Карточки:

1. `Ипотека`
   - `Предварительный расчёт бюджета, взноса и платежа.`
   - route: `ipoteka/`
2. `Семейная ипотека`
   - `Проверка актуальных условий программы на момент обращения.`
   - route: `ipoteka/`
3. `Господдержка и обмен`
   - `Материнский капитал, сертификат «Молодая семья» и продажа своей недвижимости.`
   - route: `guides/`

## Полезные разделы

Заголовок:

`Полезные разделы`

Описание:

`Каталог дополняется справочной информацией для покупателей.`

Карточки:

1. `Застройщики`
   - `Связанные объекты и статус проверки данных.`
   - route: `developers/`
2. `Справочник покупателя`
   - `Документы, ДДУ, сроки, ипотека и безопасная покупка.`
   - route: `guides/`
3. `Новости и обновления`
   - `Документы, ход строительства и изменения по объектам.`
   - route: `news/`

## Route contract

Каждый Link Card instance содержит:

```text
namespace: portal-v2
key: route
value: destination из production HTML
```

Маршрут не выводится как визуальный CTA и не создаёт дополнительного текста, отсутствующего на сайте.

## Юридические ограничения

Экран не должен сообщать:

- гарантированную ставку;
- гарантированное одобрение;
- подтверждённую применимость семейной ипотеки;
- фиксированную цену;
- наличие конкретной квартиры.

Фраза «Проверка актуальных условий программы на момент обращения» обязательна для карточки семейной ипотеки.

## Генератор

```bash
node tools/figma/generate-portal-v2-homepage-purchase-resources-screen.mjs
```

Запускается после Link Card.

Параметр навыков:

```text
skillNames: resource:figma-use,resource:figma-generate-library,resource:figma-generate-design
```

## Идемпотентность

Корневой frame использует shared plugin data:

```text
namespace: portal-v2
key: component-key
value: homepage-purchase-resources-screen
```

Desktop и Mobile frames используют screen-key:

- `homepage-purchase-resources-desktop`;
- `homepage-purchase-resources-mobile`.

## Проверка

```bash
node tools/validate-figma-homepage-purchase-resources-handoff.mjs
```

CI workflow:

`Figma homepage purchase resources handoff`

## Visual QA

После физического запуска в Figma:

1. проверить Desktop 1440 px и Mobile 360 px;
2. проверить две сетки по три карточки;
3. проверить все шесть Link Card instances;
4. проверить точные заголовки и описания;
5. проверить `portal-v2/route` на каждом instance;
6. проверить отсутствие отдельного CTA;
7. проверить перенос длинных описаний;
8. сделать screenshots Desktop и Mobile;
9. записать page ID, root ID и screen IDs в issue №116.

До Visual QA экран считается подготовленным в GitHub, но не завершённым в Figma.