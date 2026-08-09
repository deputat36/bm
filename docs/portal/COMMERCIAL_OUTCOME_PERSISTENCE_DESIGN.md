# Commercial outcome persistence design

Дата: 2026-08-09

## Назначение

Канонические commercial outcome events уже определены, но до этого шага для них не был выбран конкретный защищённый server store.

Этот design выбирает хранилище и форму write API, но намеренно не создаёт migration, не применяет DDL и не включает запись событий.

Источник design: `data/operations/commercial-outcome-persistence.json`.

## Почему отдельная таблица

Существующий `public.newbuild_lead_events` — операционный append-only log переходов основного lead lifecycle.

Commercial milestones имеют другой смысл и дополнительные поля:

- `object_id`;
- `scheduled_for`;
- `reason_code`;
- `evidence_ref`;
- `protected_note`;
- отдельную idempotency semantics.

Поэтому выбран отдельный store:

```text
public.newbuild_commercial_events
```

Это не меняет правило `deal_pipeline_not_in_scope=true` у primary lead lifecycle и не перегружает operational event log.

## Структура

Таблица design покрывает все 13 канонических event fields:

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

Плюс два server-store поля:

```text
idempotency_key
created_at
```

Generic JSON metadata/payload column намеренно запрещён, чтобы PII и произвольный frontend context не просачивались в outcome store.

## Security model

Design следует portal-owned Supabase security contract:

- table prefix `newbuild_`;
- RLS enabled;
- RLS forced;
- `PUBLIC`, `anon`, `authenticated` не получают table access;
- `service_role` получает только `SELECT` + `INSERT`;
- прямого browser access нет;
- functions — `SECURITY INVOKER`;
- `search_path=public` фиксирован;
- public/anon/authenticated EXECUTE запрещён;
- service-role writer работает только из защищённого server contour.

## Append-only

UPDATE и DELETE должны блокироваться trigger-функцией:

```text
public.newbuild_commercial_events_append_only()
```

И таблица, и write API используют `(lead_id, idempotency_key)` как idempotency boundary.

Повтор с тем же key и тем же типом события возвращает уже существующий event. Повтор с другим `event_type` должен завершаться конфликтом.

## Write API design

Выбрана server-only функция:

```text
public.newbuild_record_commercial_event(...)
```

Она должна:

1. принимать только один из 8 canonical event types;
2. требовать `actor_ref`, `source_system` и `idempotency_key`;
3. валидировать event-specific required fields из canonical contract;
4. использовать server timestamp;
5. возвращать только защищённый технический результат;
6. не экспортировать `protected_note`;
7. не принимать PII/UTM/browser context.

### closed_lost

`closure_reason_policy` всё ещё требует решения владельца.

Поэтому SQL-preview не пытается угадать допустимую policy. Для `closed_lost` preview fail-closed и генерирует ошибку:

```text
commercial_closed_lost_owner_policy_not_activated
```

Перед реальным deployment owner-approved controlled dictionary должен быть встроен отдельным review/change.

## SQL preview

`tools/build-commercial-outcome-persistence-sql.mjs` генерирует review-only SQL.

Каждый preview начинается и заканчивается баннером:

```text
PREVIEW ONLY - NOT DEPLOYED
```

Генератор сам отказывается работать, если contract уже утверждает migration/production DDL/write activation.

Preview нужен для:

- security review;
- schema review;
- idempotency review;
- проверки field mapping;
- подготовки будущей migration.

Он не должен автоматически записываться в `supabase/migrations/` и никогда не исполняется CI.

## Что остаётся false

На этом этапе:

```text
migration_file_created=false
production_ddl_applied=false
write_api_deployed=false
event_write_enabled=false
server_persistence_available=false
protected_write_api_available=false
commercial_events_available_in_internal_outcomes=false
```

Все 8 commercial outcome events продолжают иметь `coverage=schema_gap` и `source=null` в protected internal analytics.

## Следующий controlled этап

После owner operations decisions и отдельного разрешения на server deployment:

1. утвердить actor reference policy;
2. утвердить closure reason policy;
3. провести security review SQL-preview;
4. создать migration через штатный Supabase migration workflow;
5. применить migration только в разрешённое environment;
6. повторить Security Advisor;
7. проверить append-only/idempotency на synthetic lead;
8. только после фактического evidence изменить `persistence_connected`;
9. отдельно развернуть/проверить protected write interface;
10. только потом менять 8 internal outcome events из `schema_gap`.

## Граница этого PR

Design selection не является deployment.

Наличие SQL-preview не является migration.

Наличие имени функции не означает, что функция существует в production.

Ни один production outcome event не создаётся этим этапом.
