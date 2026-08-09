# Supabase performance scope портала

Дата: 2026-08-09

Проект: `ofewxuqfjhamgerwzull`.

## Live Advisor

Read-only Performance Advisor не показал portal-owned WARN/ERROR.

Для `newbuild_*` найдено 17 INFO `unused_index`.

На prelaunch-этапе это не является доказательством, что индексы лишние: реальные обращения, owner queue, SLA queue, outcome reporting и rate-limit workload ещё не набрали статистику использования.

Поэтому INFO `unused_index` не даёт автоматического разрешения на `DROP INDEX`.

## Зарегистрированные prelaunch indexes

Контракт `data/performance/portal-supabase-performance.json` фиксирует 17 индексов на:

- recency/phone/status/object filters;
- tracking и qualification JSON;
- lead event timeline/type/actor role;
- rate-limit fingerprint/window;
- operational status;
- next-action и first-action-due queues;
- owner и lead-class filters.

Static validator требует, чтобы каждый индекс из live snapshot был представлен в migration history.

## Когда можно обсуждать удаление

Cleanup review разрешается только после обоих условий:

1. не менее 30 реальных обращений;
2. не менее 7 дней live-эксплуатации.

И только при наличии evidence:

```text
pg_stat_user_indexes snapshot
representative query paths
query plan/timing for cleanup candidate
повторный live Performance Advisor snapshot
```

Даже после этого удаление выполняется отдельным PR и отдельным production change.

## Fail-closed правило

Пока статус `prelaunch_observation_no_index_cleanup`, migration history не должна содержать `DROP INDEX` для зарегистрированных prelaunch indexes.

Это защищает проект от преждевременной «оптимизации» по статистике до запуска.

## Shared project

Advisor содержит множество unused-index INFO для других таблиц (`nav_*`, `parket_*`, `leader_*`, `buyers_*` и др.). Они не относятся к порталу и не меняются из portal performance work.

## После реального запуска

1. собрать первые 30 обращений;
2. дождаться минимум 7 live-дней;
3. снять `pg_stat_user_indexes`;
4. связать каждый cleanup candidate с реальным query path;
5. проверить EXPLAIN/timing;
6. повторить Performance Advisor;
7. только затем переводить отдельный индекс в cleanup candidate.

## Команды

```bash
node tools/validate-portal-supabase-performance.mjs
node tools/build-portal-supabase-performance-report.mjs
node tools/build-portal-supabase-performance-report.mjs --format=json
```
