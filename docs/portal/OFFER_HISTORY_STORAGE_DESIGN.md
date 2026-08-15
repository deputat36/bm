# Offer history storage design

Дата: 2026-08-09

## Назначение

История цены и наличия уже имеет канонический append-only/hash-chain contract, но ранее не был выбран конкретный managed store.

Теперь выбран design:

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

Таблица design хранит 13 полей канонического event contract:

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

Важно: текущий SQL-preview намеренно НЕ содержит INSERT writer.

Причина — live offer source ещё не выбран. До него невозможно безопасно спроектировать окончательную server-side логику, которая:

1. сериализует канонические поля строго в заданном порядке;
2. читает последний hash той же квартиры;
3. проверяет previous hash;
4. вычисляет SHA-256;
5. вставляет событие идемпотентно.

Поэтому `hash_chain_writer_available=false` остаётся обязательным.

## SQL preview

`tools/build-offer-history-storage-sql.mjs` генерирует только review-only DDL для таблицы, RLS и append-only trigger.

Preview начинается и заканчивается:

```text
PREVIEW ONLY - NOT DEPLOYED
```

Он не записывается в `supabase/migrations/` и не исполняется CI.

## Retention и backup/export

Срок хранения намеренно не придуман:

```text
retention_days = null
```

До deployment нужно определить:

- ценность глубины истории для аналитики;
- ожидаемый объём событий;
- допустимую стоимость хранения;
- backup/export требования;
- restore-test policy.

Поэтому:

```text
retention_policy_selected=false
backup_export_policy_selected=false
```

Автоматическое удаление выключено.

## Связь с current feed

Выбор history store не подключает live source.

Current offer contract сохраняет:

```text
live_source_connected=false
public_render_enabled=false
```

Current feed остаётся пустым.

History writes не могут быть активированы раньше, чем выбран managed current-offer source и проверено mapping квартиры/секции.

## Следующий controlled этап

После выбора live source:

1. зафиксировать mapping `offer_identity`;
2. утвердить retention policy;
3. утвердить backup/export policy;
4. спроектировать protected hash-chain writer;
5. провести security review;
6. создать migration отдельным explicit change;
7. применить только в разрешённое environment;
8. проверить append-only/idempotency/hash chain;
9. повторить security advisor;
10. только после evidence перевести storage/writes в available.

## Граница этого этапа

Store selected != store deployed.

SQL preview != migration.

Append-only table preview != hash-chain writer.

Выбор store не разрешает публикацию текущих цен и наличия и не снимает source/legal/project-readiness gates.
