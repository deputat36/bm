# Figma Homepage Hero Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Продолжает Phase 4 issue №116 и переводит первый экран главной страницы в воспроизводимую Figma-композицию.

## Страница

`14 Screen · Homepage Hero`

Экран создаётся в двух состояниях:

- `Homepage Hero / Desktop` — 1440 px;
- `Homepage Hero / Mobile` — 360 px.

Это не ComponentSet. Экран собирается из локальных component instances и уникального контента страницы.

## Источники истины

- `index.html` — тексты, порядок блоков, CTA и юридические формулировки;
- `assets/css/home-polish.css` — desktop/mobile размеры, hero, facts, notice и mobile action bar;
- `assets/css/leadgen.css` — форма и согласие;
- `assets/js/main.js` — обязательное согласие и конверсионный контракт;
- `data/design/portal-v2.tokens.json` — colors, typography, spacing, radius и effects;
- локальные Figma ComponentSet Design System v2.

## Discovery

### Code Connect

Code Connect-файлы в репозитории не найдены.

### Existing screens

Чтение metadata существующих экранов заблокировано лимитом Figma MCP тарифа Starter. Блокировка зафиксирована явно; структура не была выдумана по памяти.

### Library search

`search_design_system` также заблокирован Starter-лимитом. Генератор разрешает зависимости внутри целевого файла через `getLocalComponentsAsync()` и точные имена ComponentSet/variant axes.

### Изображения

Первый экран не содержит внешних `<img>` или фоновых фотографий. Визуальная архитектура hero построена CSS-градиентами и декоративной сеткой. Поэтому обязательный `generate_figma_design` capture для переноса imageHash не требуется.

CSS-декор не заменяется случайным рендером или изображением застройщика. Screen handoff приоритизирует структуру, контент и reusable instances.

## Зависимости

До экрана должны быть созданы:

1. Foundations;
2. `05 Component · Button` с Context `Light` и `Hero`;
3. `10 Component · Top Navigation`;
4. `12 Component · Fact Card`;
5. `13 Component · Lead Form Card`.

Используемые варианты:

- Top Navigation: `Layout=Desktop/Mobile`, `Active=None`;
- Button: `Context=Hero`, Primary/Secondary, Default;
- Button: `Context=Light`, Primary/Secondary, Default — для mobile action bar;
- Fact Card: `Context=Hero`, `Size=Desktop/Mobile`;
- Lead Form Card: `Layout=Desktop/Mobile`, `Scope=Quick`.

## Desktop

- frame — 1440 px;
- header — 84 px;
- navigation container — 1200 px;
- hero container — 1200 px;
- main layout — две колонки;
- gap между pitch и формой — 44 px;
- Quick Lead Form Card — Desktop;
- facts — 4 карточки в строку;
- notice — максимум 880 px.

Hero actions:

1. `Выбрать сценарий` — Hero Primary;
2. `Смотреть каталог` — Hero Secondary;
3. `8 903 857-69-09` — Hero Secondary.

## Mobile

- frame — 360 px;
- content — 336 px;
- navigation — Mobile с horizontal viewport;
- hero — вертикальный поток;
- Quick Lead Form Card — Mobile;
- facts — 4 карточки вертикально;
- mobile action bar — 76 px.

Mobile action bar:

- `Позвонить` — Light Secondary;
- `Оставить заявку` — Light Primary.

Он показан отдельным нижним блоком, чтобы в handoff было явно видно fixed-поведение production-интерфейса.

## Контент

### Eyebrow

`Городской каталог новых домов`

### H1

`Новостройки Борисоглебска`

### Lead

Используется точный текст production hero без неподтверждённых цен, наличия и гарантий.

### Facts

1. `3` — `приоритетных объекта`;
2. `1 каталог` — `новостроек города`;
3. `ипотека` — `и другие способы покупки`;
4. `без брони` — `консультация без фиксации цены`.

### Notice

`Портал не является официальным сайтом застройщика. Цена, наличие квартир и условия покупки уточняются перед консультацией.`

### Lead Form

- eyebrow: `Заявка за 30 секунд`;
- title: `Узнать, какие варианты вам подойдут`;
- поля: имя, телефон, интересующий объект;
- обязательное согласие расположено перед CTA;
- hint прямо сообщает, что заявка не является бронью и не фиксирует цену.

## Button Context

Для корректного hero расширяется ComponentSet Button:

- Context: `Light`, `Hero`;
- Type: `Primary`, `Secondary`;
- State: `Default`, `Hover`, `Focus`, `Disabled`.

Итого Button содержит 16 вариантов. Hero Secondary остаётся контрастным на тёмной поверхности, не требует ручной перерисовки и не конкурирует с Primary.

Top Navigation, Project Card и Lead Form Card явно запрашивают `Context=Light`, поэтому расширение не создаёт неоднозначный nested variant lookup.

## Генератор

```bash
node tools/figma/generate-portal-v2-homepage-hero-screen.mjs
```

Результат команды передаётся отдельным вызовом `Figma.use_figma`.

Параметр навыков:

```text
skillNames: resource:figma-use,resource:figma-generate-design
```

## Идемпотентность

Root страницы получает shared plugin data:

```text
namespace: portal-v2
key: component-key
value: homepage-hero-screen
```

Каждый screen frame получает `screen-key` для Desktop или Mobile. Повторный запуск удаляет только root этого handoff.

## Проверка

Локально:

```bash
node tools/validate-figma-homepage-screen-handoff.mjs
```

CI workflow:

```text
Figma homepage screen handoff
```

Проверяется:

- синтаксис generator source и итогового JavaScript;
- лимит 50 000 символов;
- ровно один `setCurrentPageAsync`;
- отсутствие hardcoded HEX и unsupported API;
- Desktop/Mobile screen markers;
- widths 1440/360 и content 1200/336;
- локальные Top Navigation, Button, Fact Card и Lead Form Card instances;
- Hero/Light Button contexts;
- точные production H1, facts, notice и legal hint;
- обязательный mobile action bar;
- документация и ссылка на issue №116.

## Visual QA

После восстановления Figma MCP необходимо:

1. выполнить component generators в dependency order;
2. выполнить Homepage Hero generator;
3. получить metadata страницы `14 Screen · Homepage Hero`;
4. сделать screenshot Desktop с maxDimension не менее 1800;
5. сделать screenshot Mobile с maxDimension не менее 1800;
6. проверить, что header и hero не выходят за ширину frame;
7. проверить перенос H1 и lead;
8. проверить три Desktop CTA и два Mobile hero CTA;
9. проверить Quick form, consent и hint;
10. проверить четыре facts без обрезки;
11. проверить notice на Desktop/Mobile;
12. проверить mobile action bar и доступность обеих кнопок;
13. сравнить с production `index.html` и `assets/css/home-polish.css`;
14. записать page ID, root ID и screen IDs в issue №116.

До Visual QA экран считается подготовленным и проверяемым в GitHub, но не физически завершённым в Figma.