# Реестр аналитических событий портала

Дата обновления: 2026-07-14

## Назначение

Реестр объединяет техническую реализацию событий и правила будущего отчёта:

```text
код события
→ этап воронки
→ обязательные измерения
→ правило подсчёта
→ фильтр качества
→ источник реализации
```

Источник:

```text
data/analytics/events.json
```

## Зарегистрированные события

| Событие | Этап | Назначение |
|---|---|---|
| `lead_cta_click` | CTA | клики по призывам к действию |
| `lead_form_view` | просмотр формы | видимость формы |
| `lead_form_start` | начало формы | первое взаимодействие |
| `lead_submit` | отправка | каноническое число отправок |
| `lead_submit_classified` | отправка | разрез primary/detailed |
| `lead_thankyou_view` | результат | открытие страницы благодарности |
| `lead_postsubmit_action` | после отправки | звонок, каталог, объект или новая заявка |

## Главные правила

### Общая конверсия

```text
canonical_submission_event=lead_submit
```

Для рабочих отправок используется фильтр:

```text
blocked=false
```

### Разрез форм

```text
classified_submission_event=lead_submit_classified
```

Это событие не является второй заявкой и не складывается с `lead_submit`.

Правильный отчёт:

```text
общее число отправок → lead_submit, blocked=false
короткие формы → lead_submit_classified, form_role=primary, blocked=false
подробные формы → lead_submit_classified, form_role=detailed, blocked=false
```

### Локально сохранённые обращения

```text
offline=true
```

показывается отдельно от подтверждённо доставленных обращений.

### Dry-run

Технический режим не должен создавать реальные события воронки.

```text
dry_run_events_forbidden=true
```

## Защита данных

В реестре установлен запрет:

```text
personal_data_in_analytics_forbidden=true
```

Запрещённые поля включают:

```text
name
phone
phone_normalized
budget
comment
question
consent_text
client_fixation_id
user_agent
```

Каждое событие обязано иметь:

```text
contains_personal_data=false
```

## Проверка реализации

Файл:

```text
tools/validate-analytics-events.mjs
```

Команда:

```bash
npm run validate:analytics
```

Validator проверяет:

- наличие семи ожидаемых событий;
- отсутствие неизвестных событий в реестре;
- уникальность ID;
- каноническую роль `lead_submit`;
- неаддитивность `lead_submit_classified`;
- фильтр `blocked=false`;
- наличие `form_role`, `blocked` и `offline`;
- запрет персональных полей;
- существование исходного файла;
- наличие контрольных фрагментов реализации в коде.

## Генератор спецификации

Команда:

```bash
npm run analytics:spec
```

Markdown выводится по умолчанию.

JSON:

```bash
npm run analytics:spec -- --format=json
```

CSV:

```bash
npm run analytics:spec -- --format=csv
```

Выгрузка содержит:

```text
event_id
stage
metric_role
count_rule
count_filter
required_fields
optional_fields
source_file
purpose
additive
```

Эта спецификация может использоваться как основа для настройки Google Analytics, Яндекс Метрики, Looker Studio или внутреннего отчёта после подключения фактической системы аналитики.

## Portal guards

CI выполняет:

```text
синтаксическую проверку validator и generator
npm run validate:analytics
контрольную генерацию JSON
проверку количества событий = 7
```

Изменения в `data/analytics/**` автоматически запускают Portal guards.

## Ограничения

Реестр и CI не подтверждают:

- наличие установленного счётчика на рабочем домене;
- поступление событий в фактическую аналитическую систему;
- правильность настроенных конверсий в интерфейсе счётчика;
- отсутствие блокировки аналитики браузером;
- реальную доставку заявки.

Перед запуском операционного дашборда события необходимо проверить в debug-режиме выбранной аналитической системы.
