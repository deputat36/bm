# Offer history storage design

Дата актуализации: 2026-08-25

## Назначение

История цены и наличия имеет канонический append-only/hash-chain contract и выбранный protected store design:

```text
public.newbuild_offer_history_events
```

Это только архитектурный выбор. Таблица не создана, migration отсутствует, production DDL не применялся, history writer не развёрнут.

## Почему отдельная таблица

Current feed отвечает только на вопрос «что актуально сейчас» и должен оставаться маленьким безопасным snapshot.

History store отвечает на другой вопрос: «какие подтверждённые значения цены/наличия наблюдались раньше». Поэтому история:

- хранится отдельно от `data/offers/feed.json`;
- не загружается браузером;
- не становится public API;
- не содержит PII/CRM/seller-internal identifiers;
- сохраняет append-only hash chain по одному `offer_identity`.

## Поля

Таблица design хранит канонические поля события:

```text
event_id
offer_identity
object_id
section_or_entrance
apartment_number_public
event_type
observed_at
price
availability_status
source_id
source_checked_at
previous_event_hash
event_hash
```

Плюс server-store поля:

```text
idempotency_key
created_at
```

Generic JSON payload/metadata запрещён.

## Security

Design использует portal-owned `newbuild_` scope:

- RLS enabled + forced;
- no table access для PUBLIC/anon/authenticated;
- service-role-only SELECT + INSERT;
- browser direct access=false;
- UPDATE/DELETE блокируются append-only trigger;
- trigger function — `SECURITY INVOKER` с fixed `search_path=public`.

## Hash chain

Контракт сохраняет SHA-256 цепочку по `offer_identity`.

Первый event:

```text
previous_event_hash = null
```

Каждый следующий event обязан ссылаться на exact `event_hash` предыдущего события той же квартиры/offer identity.

Текущий SQL-preview намеренно НЕ содержит INSERT writer. Live offer source ещё не выбран, поэтому окончательную server-side логику нельзя считать готовой до final offer identity mapping/source semantics.

Будущий writer обязан:

1. сериализовать канонические поля строго в заданном порядке;
2. читать последний hash той же квартиры;
3. проверять previous hash;
4. вычислять SHA-256 server-side;
5. вставлять событие идемпотентно.

Сейчас:

```text
hash_chain_writer_available=false
```

## SQL preview

`tools/build-offer-history-storage-sql.mjs` генерирует только review-only DDL для таблицы, RLS и append-only trigger.

Preview начинается и заканчивается:

```text
PREVIEW ONLY - NOT DEPLOYED
```

Он не записывается в `supabase/migrations/` и не исполняется CI.

## Retention и backup/export

Реальные policy values не выбраны.

Текущий baseline:

```text
retention.approval_status=requires_owner_decision
retention.retention_days=null
backup_export.approval_status=requires_owner_decision
backup_export.policy_mode=null
retention_policy_selected=false
backup_export_policy_selected=false
```

Автоматическое удаление, backup verification и restore verification выключены.

### Почему approval отделён от deployment

Validator теперь допускает будущий переход policy в `approved`, но только если вместе с выбранным значением сохранены:

```text
approval_status=approved
approval_reference=<safe reference>
approved_at=YYYY-MM-DD
```

Для retention дополнительно нужен положительный `retention_days`.

Для backup/export поддерживаются design modes:

```text
managed_backup_only
scheduled_export_only
managed_backup_and_export
```

Approved backup/export policy также требует положительный `restore_test_interval_days`; режим с export требует непустой `export_schedule`.

Это только policy selection. Даже после корректного approval CI продолжает требовать:

```text
migration_file_created=false
production_ddl_applied=false
history_writer_deployed=false
history_write_enabled=false
server_history_store_available=false
hash_chain_writer_available=false
production_history_write_enabled=false
```

Таким образом owner/business decision не может автоматически превратиться в deployment.

### Защита от придуманной policy

Недостаточно просто записать, например, `retention_days=365` и поставить completion flag. Без approval reference и даты такой state отклоняется validator-ом.

CI отдельно моделирует approved future-state только как временный fixture, затем восстанавливает исходный pending baseline. Fixture не является реальной рекомендацией срока хранения или backup schedule.

## Связь с current feed

Выбор history store или approval policy не подключают live source.

Current offer contract сохраняет:

```text
live_source_connected=false
public_render_enabled=false
```

Current feed остаётся пустым.

History writes не могут быть активированы раньше, чем выбран managed current-offer source и проверено mapping квартиры/секции.

## Следующий controlled этап

После фактических owner/business решений и выбора live source:

1. зафиксировать mapping `offer_identity`;
2. записать утверждённую retention policy с safe approval reference;
3. записать утверждённую backup/export policy с safe approval reference;
4. спроектировать protected hash-chain writer;
5. провести security review;
6. создать migration отдельным explicit change;
7. применить только в разрешённое environment;
8. проверить append-only/idempotency/hash chain;
9. проверить backup/export и restore procedure;
10. повторить security advisor;
11. только после evidence перевести storage/writes в available.

## Граница этапа

Store selected != store deployed.

Policy approved != policy enforced in production.

SQL preview != migration.

Append-only table preview != hash-chain writer.

Выбор store или policy не разрешает публикацию текущих цен и наличия и не снимает source/legal/project-readiness gates.
