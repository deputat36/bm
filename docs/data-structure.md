# Структура данных портала

Дата фиксации: 2026-07-05

## 1. Назначение

Папка `data` хранит структурированные данные портала «Новостройки Борисоглебска». Сейчас сайт остаётся статическим, но JSON-файлы нужны для будущих фильтров, сравнения, генерации sitemap, карточек ЖК и интеграции с CRM.

## 2. Текущие файлы

```text
/data/site.json
/data/pages/index.json
/data/projects/index.json
/data/projects/tellermanov-sad.json
/data/builders/index.json
/data/builders/bm-group.json
/data/apartment-types/tellermanov-sad.json
/data/layouts/tellermanov-sad.json
/data/documents/tellermanov-sad.json
```

## 3. site.json

Общий профиль портала:

- название;
- описание;
- текущий домен;
- будущий домен;
- телефон;
- путь к политике обработки данных;
- путь к странице благодарности;
- основные разделы;
- общий дисклеймер.

## 4. pages/index.json

Индекс страниц портала. Нужен для будущей генерации sitemap и контроля статуса страниц.

Поля:

```text
url
title
page_type
project_id
builder_id
robots
status
```

Статусы:

```text
draft      — черновик, обычно noindex
ready      — готово к ручной проверке
published  — можно включать в sitemap
archived   — устарело или не используется
```

## 5. projects/index.json

Краткий индекс ЖК и новостроек для каталога и сравнения.

Поля:

```text
id
slug
name
city
address
builder_id
status
sales_status
class
apartments_total
area_min
area_max
handover
detail_url
data_file
is_featured
is_active
```

## 6. projects/{slug}.json

Подробная карточка ЖК. Используется как единый источник характеристик объекта.

Сейчас создан:

```text
/data/projects/tellermanov-sad.json
```

## 7. builders/index.json

Краткий индекс застройщиков.

Поля:

```text
id
slug
name
brand_name
city
region
logo
projects
detail_url
data_file
is_active
```

## 8. builders/{slug}.json

Подробная карточка застройщика.

Сейчас создан:

```text
/data/builders/bm-group.json
```

## 9. apartment-types/{project}.json

Квартирография объекта:

```text
project_id
type
title
rooms
count
area_min
area_max
description
landing_url
is_active
```

Сейчас создан:

```text
/data/apartment-types/tellermanov-sad.json
```

## 10. layouts/{project}.json

Черновые или подтвержденные планировки объекта:

```text
id
project_id
apartment_type
title
rooms
area
area_min
area_max
count
image
schema_image
description
advantages
limitations
is_verified
is_active
```

Сейчас создан:

```text
/data/layouts/tellermanov-sad.json
```

Важно: если `is_verified = false`, такую планировку нельзя публиковать как официальную. Её можно использовать только как внутреннюю заготовку для структуры сайта.

## 11. documents/{project}.json

Реестр документов объекта:

```text
id
project_id
title
type
number
date
source_name
source_url
local_file
description
is_verified
is_active
```

Важно: `is_verified = false` означает, что перед публикацией ссылки или документа требуется ручная сверка с официальным источником.

## 12. Правила обновления данных

1. Не менять площади, сроки, номера документов и статусы без проверки источника.
2. Если данные предварительные, явно указывать это в описании или статусе.
3. Для новых ЖК сначала добавлять `projects/{slug}.json`, затем запись в `projects/index.json`.
4. Для нового застройщика сначала добавлять `builders/{slug}.json`, затем запись в `builders/index.json`.
5. Все страницы, которые ещё не готовы к индексации, должны иметь `robots = noindex,follow` в `pages/index.json` и meta robots в HTML.
6. Перед включением страницы в sitemap её статус должен быть переведён в `published`.
7. Нельзя использовать неподтвержденные планировки, схемы и изображения как официальные материалы.
