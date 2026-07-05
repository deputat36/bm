# Контентная модель портала «Новостройки Борисоглебска»

Дата фиксации: 2026-07-05

## 1. Назначение

Документ описывает, какие сущности нужны порталу, какие поля должны храниться по каждому ЖК, застройщику, странице, новости и заявке.

Даже если сайт пока остается статическим, единая модель данных позволит:

- быстрее добавлять новые ЖК;
- не дублировать характеристики вручную на разных страницах;
- готовить будущую интеграцию с CRM или базой данных;
- делать фильтры и сравнение объектов;
- уменьшить риск ошибок в ценах, сроках, площадях и контактах.

## 2. Основные сущности

```text
Project       — жилой комплекс / новостройка
Builder       — застройщик
Building      — отдельный дом или очередь внутри ЖК
ApartmentType — тип квартиры / квартирография
Document      — документы объекта
Media         — изображения, рендеры, фото хода строительства
Article       — новости и полезные материалы
Lead          — заявка с сайта
Page          — SEO-страница или посадочная страница
```

## 3. Project — жилой комплекс

Файл для статической версии:

```text
/data/projects/{slug}.json
```

Пример для ЖК «Теллерманов сад»:

```json
{
  "id": "tellermanov-sad",
  "slug": "tellermanov-sad",
  "name": "ЖК Теллерманов сад",
  "alternative_names": ["Дом на Просторной 4А", "Новостройка на Просторной 4А"],
  "city": "Борисоглебск",
  "region": "Воронежская область",
  "address": "ул. Просторная, 4А",
  "builder_id": "bm-group-chernozemye",
  "status": "Строится",
  "sales_status": "Продажи по карточке наш.дом.рф ещё не начались",
  "class": "Комфорт",
  "wall_material": "Кирпич / мелкоштучные каменные материалы",
  "floors": 9,
  "entrances": 1,
  "apartments_total": 70,
  "area_min": 27.71,
  "area_max": 63.76,
  "ceiling_height": 2.7,
  "handover": "I квартал 2028",
  "keys_until": "30.09.2028",
  "project_declaration": "36-001139",
  "nash_dom_rf_id": "72480",
  "phone_display": "8 903 857-69-09",
  "phone_href": "tel:+79038576909",
  "lead_project": "ЖК Теллерманов сад",
  "is_featured": true
}
```

## 4. Builder — застройщик

Файл:

```text
/data/builders/{slug}.json
```

Поля:

```json
{
  "id": "bm-group-chernozemye",
  "slug": "bm-group",
  "name": "СЗ БМ-ГРУПП ЧЕРНОЗЕМЬЕ",
  "brand_name": "BM Group Development",
  "city": "Борисоглебск",
  "description": "Краткое описание застройщика для карточки портала.",
  "logo": "/assets/img/bm-group-logo.svg",
  "projects": ["tellermanov-sad"]
}
```

## 5. Building — дом / очередь

Нужен, если у ЖК несколько домов или очередей.

Поля:

```json
{
  "id": "tellermanov-sad-building-1",
  "project_id": "tellermanov-sad",
  "name": "Дом на Просторной 4А",
  "address": "ул. Просторная, 4А",
  "floors": 9,
  "entrances": 1,
  "apartments_total": 70,
  "handover": "I квартал 2028",
  "keys_until": "30.09.2028",
  "status": "Строится"
}
```

## 6. ApartmentType — квартирография

Поля:

```json
[
  {
    "project_id": "tellermanov-sad",
    "type": "studio",
    "title": "Студии",
    "rooms": 0,
    "count": 9,
    "area_min": 27.71,
    "area_max": 27.71,
    "description": "Минимальный вход в новый дом."
  },
  {
    "project_id": "tellermanov-sad",
    "type": "one-room",
    "title": "1-комнатные",
    "rooms": 1,
    "count": 17,
    "area_min": 39.77,
    "area_max": 41.65,
    "description": "Формат для первого жилья, молодой семьи или покупки детям."
  },
  {
    "project_id": "tellermanov-sad",
    "type": "two-room",
    "title": "2-комнатные",
    "rooms": 2,
    "count": 35,
    "area_min": 43.28,
    "area_max": 56.93,
    "description": "Самый массовый и универсальный формат дома."
  },
  {
    "project_id": "tellermanov-sad",
    "type": "three-room",
    "title": "3-комнатные",
    "rooms": 3,
    "count": 9,
    "area_min": 63.76,
    "area_max": 63.76,
    "description": "Семейный вариант с отдельными комнатами."
  }
]
```

## 7. Document — документы объекта

Поля:

```json
{
  "id": "pd-36-001139",
  "project_id": "tellermanov-sad",
  "title": "Проектная декларация №36-001139",
  "type": "project_declaration",
  "number": "36-001139",
  "date": "2026-06-26",
  "source_name": "наш.дом.рф",
  "source_url": "",
  "local_file": "",
  "description": "Основной документ с характеристиками объекта."
}
```

## 8. Media — изображения и галерея

Поля:

```json
{
  "id": "tellermanov-render-1",
  "project_id": "tellermanov-sad",
  "type": "render",
  "title": "Визуализация фасада",
  "src": "/assets/img/renders/tellermanov-sad/render-1.jpg",
  "alt": "ЖК Теллерманов сад Борисоглебск — визуализация фасада",
  "is_cover": true,
  "sort": 10
}
```

Типы медиа:

```text
render
photo
construction_progress
document_scan
logo
map
plan
```

## 9. Article — новости и справочник

Поля:

```json
{
  "id": "kak-proverit-novostroyku-po-proektnoy-deklaratsii",
  "slug": "kak-proverit-novostroyku-po-proektnoy-deklaratsii",
  "type": "guide",
  "section": "spravochnik",
  "project_id": null,
  "title": "Как проверить новостройку по проектной декларации",
  "description": "Понятная инструкция для покупателя квартиры в новостройке.",
  "published_at": "2026-07-05",
  "updated_at": "2026-07-05",
  "is_published": true
}
```

Типы материалов:

```text
news       — новость
update     — обновление по ЖК
guide      — справочник
seo        — SEO-посадочная статья
faq        — расширенный ответ на вопрос
```

## 10. Lead — заявка

Форма заявки должна собирать единый набор полей.

Поля:

```json
{
  "name": "Иван",
  "phone": "+7...",
  "interest": "2-комнатная квартира",
  "comment": "Интересует семейная ипотека",
  "lead_type": "project_consultation",
  "project_id": "tellermanov-sad",
  "project_name": "ЖК Теллерманов сад",
  "phone_for_contact": "8 903 857-69-09",
  "source": "/zhk/tellermanov-sad/kvartiry/",
  "page_url": "https://example.ru/zhk/tellermanov-sad/kvartiry/",
  "page_title": "Квартиры в ЖК Теллерманов сад",
  "referrer": "",
  "tracking": {
    "utm_source": "vk",
    "utm_medium": "post",
    "utm_campaign": "tellermanov_start",
    "utm_content": "",
    "utm_term": "",
    "realtor": "ivanova",
    "realtor_id": "123"
  },
  "personal_data_consent": "yes",
  "created_at": "2026-07-05T12:00:00.000Z"
}
```

Типы заявок:

```text
portal_selection       — подбор квартиры в новостройке
project_consultation   — консультация по конкретному ЖК
mortgage               — ипотечная консультация
callback               — обратный звонок
document_request       — запрос документов / планировок
price_request          — запрос цены
```

## 11. Page — SEO-страница

Поля:

```json
{
  "url": "/novostroyki/",
  "title": "Новостройки Борисоглебска — квартиры в новых домах",
  "description": "Каталог новостроек Борисоглебска: жилые комплексы, сроки сдачи, планировки, ипотека и заявки на консультацию.",
  "h1": "Новостройки Борисоглебска",
  "page_type": "catalog",
  "project_id": null,
  "canonical": "/novostroyki/",
  "robots": "index,follow",
  "lastmod": "2026-07-05"
}
```

Типы страниц:

```text
home
catalog
project
builder
mortgage
guide
news
seo_landing
contacts
privacy
```

## 12. Минимальная структура JSON-файлов

На первом этапе достаточно создать:

```text
/data/projects/tellermanov-sad.json
/data/builders/bm-group.json
/data/pages/main.json
```

Затем можно расширять:

```text
/data/apartment-types/tellermanov-sad.json
/data/documents/tellermanov-sad.json
/data/media/tellermanov-sad.json
/data/articles/index.json
```

## 13. Правила качества данных

1. Все числовые значения хранить как числа, а не как текст, если они нужны для фильтров.
2. Все даты хранить в ISO-формате `YYYY-MM-DD`, а на сайте выводить в человекочитаемом формате.
3. В пользовательских текстах не обещать неподтвержденные цены, сроки и условия.
4. У каждого объекта должен быть `id`, `slug`, `name`, `status`, `address`, `builder_id`.
5. У каждой заявки должен быть источник страницы и UTM-данные.
6. Для каждого изображения должен быть осмысленный `alt`.
7. Для каждого SEO-раздела должны быть `title`, `description`, `h1`, `canonical`.
