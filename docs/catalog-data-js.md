# JS-загрузчик и рендер каталога

Дата фиксации: 2026-07-07

Файл `assets/js/catalog-data.js` добавляет клиентский слой для чтения JSON-индексов каталога.

Файл `assets/js/catalog-render.js` добавляет пассивный рендер карточек ЖК. Он начинает работать только там, где на странице есть контейнер с атрибутом `data-catalog-projects`.

## Что умеет загрузчик

1. Загружает `data/projects/index.json`.
2. Загружает `data/builders/index.json`.
3. Поддерживает два формата индексов:
   - старый формат: массив объектов;
   - новый формат: объект с метаданными и массивом `items`.
4. Нормализует данные ЖК и застройщиков в единый формат для карточек, фильтров и будущей таблицы сравнения.
5. Не вмешивается в формы заявок и не меняет `assets/js/main.js`.

## Глобальные объекты

После подключения загрузчика доступен объект:

`window.NewbuildsCatalogData`

Основные методы:

- `loadCatalogData(options)` — загрузить проекты и застройщиков;
- `normalizeIndexPayload(payload)` — привести индекс к единому виду;
- `normalizeProject(item)` — нормализовать карточку ЖК;
- `normalizeBuilder(item)` — нормализовать карточку застройщика;
- `formatAreaRange(project)` — вывести диапазон площадей;
- `getActiveProjects(projects)` — получить активные объекты;
- `getFeaturedProjects(projects)` — получить избранные объекты.

После подключения рендера доступен объект:

`window.NewbuildsCatalogRender`

Основные методы:

- `renderProjectCard(project)` — вернуть HTML одной карточки;
- `renderProjects(container, projects)` — отрисовать список карточек в контейнер;
- `initCatalogRender()` — найти контейнеры и загрузить данные.

## Пример подключения

```html
<link rel="stylesheet" href="/assets/css/catalog-render.css">
<script src="/assets/js/catalog-data.js"></script>
<script src="/assets/js/catalog-render.js"></script>
```

Контейнер для карточек:

```html
<div data-catalog-projects></div>
```

Контейнер только для избранных объектов:

```html
<div data-catalog-projects data-catalog-featured="true"></div>
```

Ограничение количества карточек:

```html
<div data-catalog-projects data-catalog-limit="3"></div>
```

## Почему файлы отдельные

Логика заявок находится в `assets/js/main.js`. Загрузчик и рендер вынесены отдельно, чтобы не рисковать рабочими формами и постепенно подключать динамический каталог только на нужных страницах.

## Следующий шаг

После принятия PR можно подключить эти файлы на странице `/novostroyki/`, заменить ручную карточку на контейнер `data-catalog-projects` и оставить статический fallback на случай ошибки загрузки.
