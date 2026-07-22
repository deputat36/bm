# Figma Homepage Apartments & Outcomes Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Продолжает issue №116 и Phase 4 Design System v2.

## Страница

`18 Screen · Homepage Apartments & Outcomes`

## Экраны

- `Homepage Apartments & Outcomes / Desktop` — 1440 px;
- `Homepage Apartments & Outcomes / Mobile` — 360 px.

Контейнеры:

- Desktop — 1200 px;
- Mobile — 336 px.

## Источники production

- `index.html`;
- `assets/css/home-polish.css`;
- `assets/css/portal-v2.tokens.css`.

Внешних изображений нет. `generate_figma_design` не требуется для переноса imageHash.

## Code Connect и библиотеки

Code Connect-файлы в репозитории отсутствуют.

Existing-screen inspection, metadata и library search недоступны из-за лимита Figma MCP Starter. Экран использует локальные ComponentSet по точным именам:

- `Content Card`;
- `Button`.

## Секция комнатности

Eyebrow:

`Подбор по комнатности`

Заголовок:

`Квартиры в новостройках Борисоглебска`

Описание:

`Укажите нужную комнатность, бюджет и способ покупки. Специалист проверит, какие варианты и сведения доступны на дату обращения.`

Карточки:

1. `1-комнатные квартиры` — `Подобрать 1-комнатную`;
2. `2-комнатные квартиры` — `Подобрать 2-комнатную`;
3. `3-комнатные квартиры` — `Подобрать 3-комнатную`.

Каждая карточка использует:

- Content Card Purpose=`Selection`;
- State=`Default`;
- Show action=`true`;
- exposed Button instance для изменения Label.

Дополнительные действия:

- `Ответить на 5 вопросов без телефона`;
- `Позвонить: 8 903 857-69-09`.

Оба используют Button Context=`Light`, Type=`Secondary`.

## Секция результатов консультации

Eyebrow:

`Польза консультации`

Заголовок:

`Что решим за один разговор`

Описание:

`Поможем собрать разрозненные сведения в понятный сценарий покупки — без обещаний неподтверждённых цен и наличия.`

Карточки:

1. `Подходящие объекты`;
2. `Финансовый сценарий`;
3. `Проверенные данные`;
4. `Следующий шаг`.

Каждая карточка использует:

- Content Card Purpose=`Outcome`;
- State=`Default`;
- Show action=`false`;
- вертикальный акцент из токенов Sage и Amber.

Действия секции:

- `Получить консультацию` — Primary;
- `Изучить справочник` — Secondary.

## Desktop

Сетка комнатности:

- 3 карточки по 384 px;
- gap 22–24 px;
- секция на мягком фоне.

Сетка результатов:

- 4 карточки по 284 px;
- gap 22–24 px;
- белая поверхность.

## Mobile

- ширина экрана 360 px;
- контейнер 336 px;
- обе сетки переходят в вертикальный поток;
- карточки используют настоящие Layout=`Mobile` варианты;
- кнопки секций занимают доступную ширину.

## Юридическая безопасность

Экран не обещает:

- наличие конкретной квартиры;
- фиксированную цену;
- одобрение или ставку ипотеки;
- обязательный результат консультации.

Подбор по комнатности означает запрос на проверку вариантов на дату обращения.

Формулировка результатов консультации описывает задачи разговора, а не гарантированный итог.

## Генератор

```bash
node tools/figma/generate-portal-v2-homepage-apartments-outcomes-screen.mjs
```

Параметр навыков:

```text
skillNames: resource:figma-use,resource:figma-generate-design
```

Перед запуском должны существовать:

1. Foundations;
2. Button;
3. Content Card.

## Проверка

Локально:

```bash
node tools/validate-figma-homepage-apartments-outcomes-handoff.mjs
```

CI workflow:

```text
Figma homepage apartments outcomes handoff
```

## Visual QA

После снятия лимита Figma MCP:

1. запустить генератор Content Card;
2. проверить 8 вариантов Content Card;
3. запустить генератор экрана;
4. получить metadata страницы 18;
5. сделать screenshot Desktop;
6. сделать screenshot Mobile;
7. проверить три комнатные CTA;
8. проверить четыре Outcome-карточки;
9. проверить exposed Button overrides;
10. проверить переносы длинных русских текстов;
11. проверить отсутствие скрытого CTA в Outcome;
12. проверить ширины 384, 284 и 336 px;
13. сравнить с `index.html` и `home-polish.css`;
14. записать page ID, root ID и screen IDs в issue №116.

До Visual QA экран считается подготовленным в GitHub, но не завершённым в Figma.