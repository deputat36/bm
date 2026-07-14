# Runtime аналитики активных форм

Дата обновления: 2026-07-14

## Как подключаются скрипты

На семи основных страницах с формами статически подключены:

```text
main.js
schema.js
```

`schema.js` обнаруживает `form[data-lead-form]` и динамически подключает:

```text
priority-leads.js
mobile-lead-bar.js
form-accessibility.js
conversion-tracking.js
```

В безопасном режиме:

```text
?lead_test=dry-run&analytics_test=debug&test_ack=1
```

сначала загружается `analytics-debug.js`, затем `conversion-tracking.js`.

## Почему tracking не добавляется в HTML напрямую

На активных страницах `conversion-tracking.js` и `analytics-debug.js` не должны подключаться отдельными тегами. Иначе общий загрузчик `schema.js` создаст повторное подключение и одно действие может превратиться в два аналитических события.

## Охват

Источник списка страниц и форм:

```text
data/qa/form-scenarios.json
```

Проверяется:

```text
7 страниц
14 форм
```

Страницы:

```text
/
/catalog/
/catalog/prostornaya-4a/
/catalog/aerodromnaya-18g/
/catalog/sennaya-76/
/contacts/
/ipoteka/
```

## Телефонные CTA

Каждая ссылка `tel:` в активном контуре обязана содержать:

```text
data-track-action="phone"
data-track-placement="..."
```

На объектной странице дополнительно требуется правильный:

```text
data-track-object="<residential_complex_id>"
```

Номер в `href` хранится в нормализованном виде:

```text
tel:+7XXXXXXXXXX
```

## События runtime

После загрузки `conversion-tracking.js` доступны:

```text
lead_cta_click
lead_form_view
lead_form_start
lead_submit_classified
```

Канонический `lead_submit` формируется в `main.js`.

## Автоматическая проверка

```bash
npm run validate:conversion-runtime
```

Validator контролирует:

- семь страниц из QA-матрицы;
- все 14 `form_id`;
- наличие ровно одного `main.js` и `schema.js`;
- порядок `main.js → schema.js`;
- отсутствие прямого дублирующего подключения tracking/debug;
- наличие загрузчика tracking, accessibility, mobile bar и object sync;
- порядок debug перед conversion tracking;
- состав событий tracking;
- локальное хранилище debug и лимит 100 событий;
- разметку и формат всех телефонных ссылок.

## Ограничение

Guard подтверждает структуру и подключение кода, но не заменяет физическую проверку в браузере и рабочем счётчике аналитики.
