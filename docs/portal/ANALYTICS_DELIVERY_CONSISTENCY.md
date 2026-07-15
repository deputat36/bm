# Согласованность аналитических каналов

Дата обновления: 2026-07-15

## Каноническое событие

Событие:

```text
lead_submit
```

Метрика валидных заявок:

```text
count(lead_submit where blocked=false)
```

Подтверждённая внешняя отправка:

```text
blocked=false AND offline=false
```

Локальное сохранение учитывается отдельно:

```text
blocked=false AND offline=true
```

## Публичный payload

`dataLayer`, прямой `gtag` и Яндекс Метрика получают только обезличенный `publicPayload`:

```text
event
lead_type
form_id
project_id
project_name
residential_complex
residential_complex_id
qualification_status
qualification_score
lead_source
placement
blocked
offline
```

Поле `value` прямого GA4-вызова остаётся техническим qualification score. Оно не является ценой объекта, суммой сделки или доходом.

## Запрещённые поля

Во внешние аналитические каналы нельзя передавать:

```text
name
phone
phone_normalized
email
budget
comment
question
consent_text
user_agent
client_fixation_id
```

`client_fixation_id` больше не является полем публичного `lead_submit`.

## Внутренний CustomEvent

Браузерное событие:

```text
newbuildLeadSubmit
```

получает тот же обезличенный payload и дополнительно:

```text
client_fixation_id
```

ID нужен только для локальной связи:

```text
последняя техническая запись заявки
→ form_role
→ страница благодарности
```

Внутренний `CustomEvent` не отправляется в `dataLayer`, прямой GA4-вызов или Метрику.

## Каналы

### dataLayer

Получает `publicPayload` без внутреннего ID.

### gtag

Получает обезличенные параметры и одинаковые признаки `blocked/offline`.

### Яндекс Метрика

Получает `publicPayload` через `reachGoal` без внутреннего ID.

### CustomEvent

Получает внутренний payload с ID обращения для локальной синхронизации.

## Подсчёт

Нельзя складывать:

```text
lead_submit + lead_submit_classified
```

`lead_submit_classified` используется только для разреза по роли формы.

## Реестр

`data/analytics/events.json` использует schema version 1.4.

Закреплено:

```text
restricted_field_allowed_events=[]
restricted_field_internal_event=newbuildLeadSubmit
restricted_field_external_channels_forbidden=true
```

## Автоматическая проверка

Workflow:

```text
Analytics delivery consistency guard
```

Проверки:

```text
tools/validate-analytics-delivery-consistency.mjs
tools/validate-internal-lead-id-privacy.mjs
```

Guard проверяет:

- `lead_submit` остаётся канонической конверсией;
- `blocked/offline` присутствуют во всех публичных каналах;
- публичные каналы используют только `publicPayload`;
- `client_fixation_id` отсутствует в публичном блоке;
- ID присутствует только во внутреннем `CustomEvent`;
- privacy-override устанавливается до раннего выхода мобильного runtime;
- реестр не разрешает restricted ID ни одному внешнему событию.

## Ограничения

CI не подтверждает:

- наличие рабочего GA4-счётчика;
- регистрацию custom dimensions;
- фактическое отображение событий в DebugView;
- получение цели Метрикой;
- сетевой payload в реальном браузере.

Production analytics debug остаётся отдельным launch gate.