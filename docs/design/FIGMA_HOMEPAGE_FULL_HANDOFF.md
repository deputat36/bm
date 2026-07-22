# Figma Homepage Full Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Продолжает issue №116 и объединяет все ранее подготовленные секции главной страницы.

## Страница

`25 Screen · Homepage Full`

## Frames

- `Homepage Full / Desktop` — 1440 px;
- `Homepage Full / Mobile` — 360 px.

Контейнеры:

- Desktop — 1200 px;
- Mobile — 336 px.

## Задача экрана

Отдельные screen handoff показывают секции крупно и подходят для точечной проверки. `Homepage Full` является интеграционной сборкой, которая проверяет:

- порядок секций;
- совместимость компонентов;
- единый ритм Desktop/Mobile;
- route metadata;
- lead metadata;
- юридические оговорки;
- целостность пути пользователя от первого экрана до Footer.

## Production-порядок

Экран содержит Header и 12 смысловых секций:

1. Hero;
2. выбор сценария;
3. приоритетные объекты;
4. подбор по комнатности;
5. результаты консультации;
6. процесс консультации;
7. шаги покупки;
8. способы покупки;
9. полезные разделы;
10. FAQ;
11. подробная заявка;
12. Footer.

Каждая секция получает shared plugin data:

```text
namespace: portal-v2
key: section-key
```

## Зависимости

Полная сборка использует локальные instances:

- Top Navigation;
- Button;
- Fact Card;
- Lead Form Card;
- Scenario Card;
- Project Card;
- Content Card;
- Step Card;
- Link Card;
- FAQ Accordion;
- Site Footer.

Также используются Foundations variables, Typography и Effects.

## Почему экран не клонирует другие страницы

Figma MCP работает с одной текущей страницей на вызов и не должен переключать страницы в цикле. Поэтому `Homepage Full` собирается напрямую из ComponentSet, а не копирует root frames с экранов 14, 16, 18, 20, 22 и 23.

Преимущества:

- нет зависимости от неизвестных node IDs;
- повторный запуск воспроизводим;
- все элементы остаются component instances;
- изменение компонента можно проверить на всей странице;
- один вызов использует ровно один `setCurrentPageAsync`.

## Header и Hero

Header использует Top Navigation.

Hero содержит:

- заголовок `Новостройки Борисоглебска`;
- безопасное описание;
- Quick Lead Form Card;
- четыре Fact Card;
- предупреждение о независимом статусе портала;
- действия выбора сценария, каталога и звонка.

Внешние изображения отсутствуют. Декоративный CSS не заменяется случайным рекламным рендером.

## Сценарии и объекты

Используются:

- три Scenario Card;
- три Pending Project Card.

Для Project Card сохраняются отдельные primary и secondary routes.

Pending CTA означает обращение за консультацией и не является бронью или фиксацией цены.

## Комнатность и результаты

Используются:

- три Content Card Purpose=Selection;
- четыре Content Card Purpose=Outcome.

CTA комнатных карточек меняется через exposed `Primary action`.

Outcome остаётся информационной карточкой без собственного CTA.

## Процесс и покупка

Используются:

- три Step Card Grid=Three;
- четыре Step Card Grid=Four.

Карточки не содержат обещаний одобрения банка, юридического результата или наличия квартиры.

## Способы покупки и полезные разделы

Используются шесть Link Card.

Routes:

- `ipoteka/`;
- `guides/`;
- `developers/`;
- `news/`.

Семейная ипотека описывается только как проверка актуальных условий программы на момент обращения.

## FAQ

Используются шесть FAQ Accordion instances:

- первый Open;
- остальные пять Closed.

Mobile FAQ использует ширину 336 px.

## Подробная заявка

Используется Detailed Lead Form Card:

- 8 полей;
- обязательное согласие;
- exposed Submit action;
- CTA `Получить консультацию`.

Metadata:

```text
form-id: homepage_priority_selection
lead-type: portal_selection
project: Портал Новостройки Борисоглебска
```

## Footer

Используется Site Footer:

- Desktop 1200 px;
- Mobile 336 px;
- Brand Context=Dark;
- телефон;
- независимая юридическая оговорка;
- маршруты Sources, Privacy и Contacts.

## Генератор

```bash
node tools/figma/generate-portal-v2-homepage-full-screen.mjs
```

Итоговый JavaScript выполняется отдельным вызовом `Figma.use_figma`.

```text
skillNames: resource:figma-use,resource:figma-generate-design
```

Перед экраном должны быть созданы Foundations и все 14 ComponentSet, включая Site Footer.

## Идемпотентность

Root создаётся с shared plugin data:

```text
namespace: portal-v2
component-key: homepage-full-screen
```

Frames получают:

```text
screen-key: homepage-full-desktop
screen-key: homepage-full-mobile
source: index.html
```

Повторный запуск удаляет только прежний root полной сборки.

## Проверка

Локально:

```bash
node tools/validate-figma-homepage-full-handoff.mjs
```

CI workflow:

`Figma homepage full handoff`

Проверяется:

- source syntax;
- итоговый JavaScript;
- лимит 50 000 символов;
- один `setCurrentPageAsync`;
- Desktop 1440 / Mobile 360;
- контейнеры 1200 / 336;
- все 11 зависимых семейств;
- Site Footer;
- 12 section-key;
- точные основные тексты;
- route metadata;
- form metadata;
- отсутствие hardcoded HEX;
- отсутствие запрещённых обещаний.

## Visual QA

После физического запуска в Figma:

1. получить metadata страницы 25;
2. сделать screenshots Desktop и Mobile;
3. проверить порядок 12 секций;
4. проверить отсутствие горизонтального overflow;
5. проверить переносы в Project Card и FAQ;
6. проверить exposed CTA в Content Card и Lead Form Card;
7. проверить route metadata;
8. проверить форму и обязательное согласие;
9. проверить Footer;
10. сравнить с production `index.html`;
11. записать page ID, root ID и frame IDs в issue №116.

До Visual QA экран считается подготовленным в GitHub, но не завершённым в Figma.
