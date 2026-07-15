# Жизненный цикл первичного обращения

Дата обновления: 2026-07-15

## Статус

```text
draft_contract_not_connected
```

Контракт не подключён к CRM или backend и не меняет состояние реальных заявок.

Источник:

```text
data/operations/lead-lifecycle.json
```

## Область действия

Контракт описывает только первичную обработку:

```text
получение
→ техническая квалификация
→ очередь контакта
→ попытка связи
→ квалифицированный контакт
→ проверка источника или консультация
→ повторный контакт либо закрытие
```

Не входят в контракт:

```text
бронь
договор
задаток
сделка
ипотечное одобрение
передача квартиры
```

## Состояния

### received

Обращение получено техническим каналом.

Обязательные поля:

```text
lead_id
received_at
lead_type
form_id
```

### triage_ready

Определены:

```text
form_role
residential_complex_id
qualification_status
```

### contact_pending

Обращение поставлено в очередь первой или повторной связи.

### contact_attempted

Зафиксирована попытка контакта и её результат.

### contacted_qualified

Связь состоялась, потребность уточнена и выбрано следующее действие.

### source_check_pending

Перед предметным ответом требуется открыть или принять первичный источник.

### consultation_active

Начата консультация по объекту, подбору или ипотечному сценарию.

### follow_up_scheduled

Согласован следующий контакт или дата возврата.

### Терминальные состояния

```text
duplicate
invalid_or_spam
do_not_contact
closed_no_action
```

Терминальное состояние не имеет исходящих переходов.

## Ключевые переходы

```text
received → triage_ready
triage_ready → contact_pending
contact_pending → contact_attempted
contact_attempted → contacted_qualified
contact_attempted → follow_up_scheduled
contacted_qualified → source_check_pending
contacted_qualified → consultation_active
contacted_qualified → follow_up_scheduled
source_check_pending → consultation_active
consultation_active → follow_up_scheduled
follow_up_scheduled → contact_pending
```

Также предусмотрены закрывающие переходы в duplicate, invalid_or_spam, do_not_contact и closed_no_action.

## Связь с операционной картой

Контракт использует результаты из:

```text
data/operations/lead-handling.json
```

Переходы могут требовать конкретный результат:

```text
contacted_qualified
contacted_follow_up_scheduled
no_answer_follow_up_planned
source_check_required
duplicate
invalid_or_spam
do_not_contact
```

Guard не позволит использовать результат, которого нет в операционной карте.

## Ограничения

```text
crm_connected=false
automatic_transition_enabled=false
approved_sla_exists=false
live_owner_assignment_exists=false
deal_pipeline_not_in_scope=true
```

Контракт не содержит реальных сотрудников, контактных данных или утверждённых нормативов реакции.

## Генерация отчёта

```bash
node tools/build-lead-lifecycle-report.mjs
node tools/build-lead-lifecycle-report.mjs --format=json
node tools/build-lead-lifecycle-report.mjs --format=csv
node tools/build-lead-lifecycle-report.mjs --state=source_check_pending
node tools/build-lead-lifecycle-report.mjs --terminal=true
```

## Проверка

```bash
node tools/validate-lead-lifecycle.mjs
```

Validator проверяет:

- 12 уникальных состояний;
- 18 уникальных переходов;
- достижимость каждого состояния из `received`;
- отсутствие входящих переходов у начального состояния;
- отсутствие исходящих переходов у терминальных состояний;
- существование всех ссылок на результаты контакта;
- отсутствие этапов сделки;
- отсутствие действующего SLA, назначения ответственных и автоматических переходов;
- отсутствие контактных данных в спецификации.

## Следующий этап после отдельного решения

Для подключения к CRM потребуется определить:

1. Фактический идентификатор записи.
2. Реальные роли и ответственных.
3. Утверждённые сроки реакции.
4. Правила повторных попыток связи.
5. Историю изменений состояния.
6. Права доступа и аудит изменений.
7. Правила дедупликации.

До этого момента контракт остаётся документацией и CI-guard.
