# Согласованность аналитических каналов

Дата обновления: 2026-07-15

## Проблема

Каноническое событие заявки `lead_submit` отправляется в несколько каналов:

```text
dataLayer
gtag
Яндекс Метрика
внутренний CustomEvent
```

До исправления полный `eventPayload` с полями `blocked` и `offline` передавался в `dataLayer`, Метрику и внутреннее событие, но прямой вызов `gtag` содержал только форму, источник и score.

Это создавало риск:

- honeypot-попытка могла выглядеть в GA4 как обычная заявка;
- offline-событие нельзя было отделить от подтверждённой доставки;
- фильтр `blocked=false`, закреплённый в аналитическом реестре, нельзя было применить к прямому GA4-событию.

## Канонические правила

Событие:

```text
lead_submit
```

Единственная каноническая метрика валидных заявок:

```text
count(lead_submit where blocked=false)
```

Offline-заявки учитываются отдельно:

```text
blocked=false AND offline=true
```

Подтверждённые внешним каналом отправки:

```text
blocked=false AND offline=false
```

## Поля прямого gtag

Прямой вызов GA4 теперь получает:

```text
form_id
residential_complex_id
qualification_status
lead_source
placement
blocked
offline
value
```

`value` остаётся техническим qualification score и не является ценой объекта, суммой сделки или доходом.

## Конфиденциальность

В прямой `gtag` запрещено передавать:

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

`client_fixation_id` остаётся ограниченным техническим полем канонического `eventPayload`, но не отправляется как параметр прямого GA4-вызова.

## Каналы

### dataLayer

Получает полный технический `eventPayload`.

### gtag

Получает обезличенные параметры, достаточные для фильтрации валидных, blocked и offline-событий.

### Яндекс Метрика

Получает полный технический `eventPayload` через `reachGoal`.

### CustomEvent

`newbuildLeadSubmit` передаёт тот же `eventPayload` в `conversion-tracking.js`, где создаётся неаддитивное событие `lead_submit_classified`.

## Подсчёт

Нельзя складывать:

```text
lead_submit + lead_submit_classified
```

`lead_submit_classified` используется только для разреза по `form_role`.

Blocked и offline должны фильтроваться одинаково независимо от выбранного аналитического канала.

## Автоматическая проверка

Файл:

```text
tools/validate-analytics-delivery-consistency.mjs
```

Workflow:

```text
Analytics delivery consistency guard
```

Guard проверяет:

- реестр оставляет `lead_submit` канонической конверсией;
- обязательные поля включают `blocked` и `offline`;
- `dataLayer` получает полный `eventPayload`;
- прямой `gtag` получает `blocked` и `offline`;
- прямой `gtag` получает ID объекта и статус квалификации;
- Метрика получает полный `eventPayload`;
- внутренний CustomEvent получает тот же payload;
- прямой `gtag` не содержит персональных или ограниченных технических полей.

## Ограничения

CI не подтверждает:

- наличие рабочего GA4-счётчика;
- регистрацию custom dimensions в GA4;
- фактическое отображение полей в DebugView;
- корректность фильтров в производственном отчёте;
- получение события внешним счётчиком.

Фактическая проверка рабочего счётчика остаётся отдельным launch gate.
