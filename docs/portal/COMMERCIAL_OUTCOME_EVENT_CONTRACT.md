# Коммерческие outcome events

Дата: 2026-08-09

Статус: спецификация. Server-side persistence не подключён, запись событий выключена.

## Зачем отдельный контракт

Первичный lead lifecycle сейчас заканчивается на консультации/follow-up и специально содержит `deal_pipeline_not_in_scope=true`. Это правильно для текущего P0: контакт, квалификация и следующий шаг уже защищены отдельным lifecycle.

Коммерческие milestone-события после квалификации нужны для аналитики консультаций, показов и сделок, но их нельзя добавлять в действующий lifecycle незаметно или выводить из комментариев менеджера.

Поэтому создаётся отдельный защищённый контракт без изменения production DB и Edge Function.

## Канонические события

```text
consultation_scheduled
consultation_completed
selection_sent
showing_scheduled
showing_completed
deposit
closed_won
closed_lost
```

Эти восемь событий соответствуют восьми `schema_gap` в `data/analytics/internal-outcomes.json`. До реального server persistence они продолжают считаться недоступными для фактической аналитики.

## Минимальный защищённый event payload

```text
event_id
lead_id
event_type
occurred_at
actor_ref
source_system
object_id
scheduled_for
reason_code
next_action
next_action_at
evidence_ref
protected_note
```

Не каждое поле обязательно непустое для каждого события. Event contract задаёт отдельный `required_non_null_fields` для каждого milestone.

## Принципы

- события внутренние и защищённые;
- после реализации store должен быть append-only;
- `lead_id` обязателен внутри защищённого контура, но запрещён во внешней аналитике;
- actor определяется только как `role:` или `secure_reference:`, без ФИО в репозитории;
- события нельзя выводить из текста комментариев;
- PII, URL пользователя и UTM не дублируются в event payload;
- attribution берётся из защищённого lead record;
- `deposit` означает milestone, а не сумму: сумма задатка для воронки не требуется;
- `closed_won` требует object + evidence reference;
- `closed_lost` требует контролируемую причину.

## Предусловия событий

`consultation_scheduled` — только после квалификации.

`consultation_completed` — после квалификации и назначенной/начатой консультации.

`selection_sent` — после квалификации.

`showing_scheduled` — после квалификации, с обязательным object и scheduled time.

`showing_completed` — после scheduled showing.

`deposit` — после квалификации, с object и protected evidence.

`closed_won` — terminal milestone с object и protected evidence.

`closed_lost` — terminal milestone с reason code.

Контракт не заставляет клиента проходить все события линейно: например, сделка может быть закрыта после консультации без формального показа. Но unsupported переходы не должны создаваться автоматически.

## Причины closed_lost

Owner decision `closure_reason_policy` ещё не утверждён. Поэтому контракт использует только тот draft-список, который уже зафиксирован в `data/operations/lead-operations-approval.json`:

```text
duplicate
invalid_or_spam
do_not_contact
no_answer_after_policy
not_interested
postponed
no_suitable_option
financing_not_available
other_with_comment
```

Это кандидаты, а не действующая политика.

Три причины уже имеют прямое соответствие terminal states первичного lifecycle:

```text
duplicate -> duplicate
invalid_or_spam -> invalid_or_spam
do_not_contact -> do_not_contact
```

`other_with_comment` требует protected note. Этот note не должен попадать в агрегированную или внешнюю аналитику.

## Почему не меняется текущий lifecycle

`lead-lifecycle.json` остаётся первичным операционным lifecycle до консультации/follow-up. Его `deal_pipeline_not_in_scope=true` сохраняется.

Коммерческие события — отдельные milestones, которые будут подключены после выбора server event store/API. Этот PR не создаёт новые lifecycle states.

## Условия будущей активации

```text
operational_activation_enabled
commercial_event_store_selected
append_only_server_enforcement_reviewed
actor_reference_policy_approved
closure_reason_policy_approved
protected_event_write_api_reviewed
```

Пока они не выполнены:

- `persistence_connected=false`;
- `event_write_enabled=false`;
- восемь событий остаются `schema_gap` в outcome analytics.

## Следующий технический этап

После owner operations decisions можно отдельно спроектировать server persistence и transition/write API с тестовыми fixtures. Production DDL/DML и реальные события должны выполняться только отдельным контролируемым этапом с evidence.
