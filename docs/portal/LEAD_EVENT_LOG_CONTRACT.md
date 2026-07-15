# Журнал событий первичного обращения

Дата обновления: 2026-07-15

## Назначение

Контракт описывает будущую append-only историю обработки заявки.

Он нужен, чтобы endpoint или CRM могли восстановить:

```text
когда произошло действие
кто выполнил его на уровне роли
из какого состояния обращение перешло
в какое состояние перешло
какой результат и следующий шаг зафиксированы
```

Статус:

```text
draft_contract_not_connected
```

## Главный принцип

```text
событие добавляется один раз
→ не переписывается
→ не удаляется
```

Исправление ошибочной записи в будущем должно оформляться новым корректирующим событием, а не изменением старого.

## Обязательные поля события

```text
event_id
lead_id
occurred_at
event_type
from_state
to_state
actor_role
source_system
payload_version
```

## Дополнительные поля

```text
contact_outcome
next_action
next_action_at
source_check_required
evidence_ref
reason_code
```

## Роли

Контракт хранит роль, а не имя сотрудника:

```text
portal_system
lead_operator
manager
source_reviewer
```

Назначение конкретного человека относится к будущей CRM и правам доступа.

## Источники записи

```text
portal_form
manual_register
future_endpoint
future_crm
```

Названия `future_endpoint` и `future_crm` являются зарезервированными значениями контракта. Интеграции сейчас не подключены.

## Матрица событий

Контракт автоматически строится из 18 разрешённых переходов lifecycle:

```text
received → triage_ready
triage_ready → contact_pending
contact_pending → contact_attempted
contact_attempted → результат контакта
contacted_qualified → проверка источника, консультация или follow-up
source_check_pending → консультация, follow-up или закрытие
consultation_active → follow-up или закрытие
follow_up_scheduled → contact_pending
```

## Конфиденциальность

В контракте и генерируемых отчётах запрещены:

```text
имя
телефон
email
комментарий клиента
вопрос клиента
текст разговора
client_fixation_id
```

`lead_id` в будущей системе должен быть внутренним идентификатором записи и не использоваться как публичное аналитическое измерение.

## GitHub

В репозитории разрешено хранить только:

```text
схему
validator
генератор
документацию
пустые примеры без персональных значений
```

Реальные события обработки лидов в GitHub хранить запрещено.

## Команды

```bash
node tools/validate-lead-event-log.mjs
node tools/build-lead-event-log-report.mjs
node tools/build-lead-event-log-report.mjs --format=json
node tools/build-lead-event-log-report.mjs --format=csv
node tools/build-lead-event-log-report.mjs --event=contact_qualified
node tools/build-lead-event-log-report.mjs --from=contact_attempted
node tools/build-lead-event-log-report.mjs --to=follow_up_scheduled
```

## Что проверяет guard

- ровно 18 событий по lifecycle-переходам;
- уникальность типов событий;
- отсутствие исходящих переходов из терминальных состояний;
- существование обязательных результатов в операционной карте;
- append-only правила;
- отсутствие изменения или удаления событий;
- отсутствие реальных event records в репозитории;
- отсутствие персональных значений;
- отсутствие действующего SLA и назначенных владельцев;
- отсутствие CRM и автоматических переходов.

## Ограничения

Пока не реализованы:

```text
таблица событий
endpoint записи
авторизация
права ролей
история реальных попыток связи
автоматическая постановка следующей задачи
CRM
```

Контракт готовит структуру, но не создаёт операционную систему хранения лидов.
