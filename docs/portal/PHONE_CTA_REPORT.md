# Отчёт по телефонным CTA

Дата обновления: 2026-07-14

## Цель

Отдельно учитывать интерес пользователей к телефонному контакту:

```text
lead_cta_click where action=phone
```

Клик по номеру не подтверждает:

```text
фактический звонок
соединение
ответ специалиста
продолжительность разговора
уникального звонящего
заявку или сделку
```

Поэтому показатель называется «клики по номеру», а не «звонки».

## Метрики

### Клики по номеру

```text
phone_cta_clicks
= count(lead_cta_click where action=phone)
```

Разрезы:

```text
page_path
placement
object_id
```

### Доля телефонных действий

```text
phone_cta_share
= phone_cta_clicks / cta_clicks
```

При нулевом знаменателе возвращается `null`, а не 0%.

## Представления

```text
phone_overview
phone_by_placement
phone_by_object
```

## Инвентарь ссылок

Генератор проверяет семь активных страниц из `data/qa/form-scenarios.json` и выводит:

```text
page_file
page_path
placement
object_id
action
phone_target
href_normalized
```

Фактический номер телефона намеренно не экспортируется. Используется технический идентификатор:

```text
primary_sales_phone
```

## Требования к HTML

Каждая активная ссылка `tel:` должна содержать:

```text
data-track-action="phone"
data-track-placement="..."
```

На объектной странице дополнительно:

```text
data-track-object="<ID объекта>"
```

Формат `href`:

```text
tel:+7XXXXXXXXXX
```

## Проверка

```bash
node tools/validate-phone-cta-report.mjs
```

Markdown-отчёт:

```bash
node tools/build-phone-cta-report.mjs
```

JSON:

```bash
node tools/build-phone-cta-report.mjs --format=json
```

CSV:

```bash
node tools/build-phone-cta-report.mjs --format=csv
```

Фильтр по странице:

```bash
node tools/build-phone-cta-report.mjs --page=/catalog/prostornaya-4a/
```

Фильтр по объекту:

```bash
node tools/build-phone-cta-report.mjs --object=prostornaya-4a
```

## CI

Workflow:

```text
.github/workflows/phone-cta-guard.yml
```

Он проверяет спецификацию и генерирует обезличенный инвентарь телефонных CTA при изменениях активных страниц, QA-матрицы и аналитических файлов.

## Ограничения

Для подтверждения реальных звонков потребуется отдельный источник данных: коллтрекинг, журнал телефонии или CRM. Такое подключение в текущем этапе не выполнялось.
