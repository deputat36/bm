# Инвентаризация URL перед sitemap и миграцией

Дата обновления: 2026-09-27

## Назначение

Команда `npm run urls:inventory` строит единый отчёт по активным страницам портала и legacy-маршрутам перед изменением sitemap или выпуском серверных редиректов.

## Источники истины

Инструмент читает только:

```text
data/pages/index.json
data/migration/legacy-routes.json
```

Файл `data/pages/legacy-redirects.json` выведен из эксплуатации и удалён. Его ранняя модель `planned/requires_decision/ready` больше не используется.

## Базовый домен

По умолчанию:

```text
PORTAL_BASE_URL=https://novostroyki-borisoglebsk.ru
```

И source, и target URL migration registry считаются маршрутами текущего портала. Отдельная судьба домена `tellermanovsad.ru` не выводится из route registry и решается отдельным release/approval контуром.

## Что выводит отчёт

```text
generated_at
portal_base_url
legacy_registry
legacy_registry_schema
summary
sitemap_candidates
sitemap_blocked_pages
legacy_routes_ready
legacy_routes_blocked
```

Readiness legacy-маршрута определяется каноническими полями `migration_action`, `content_migration_status` и `redirect_ready`. Сам inventory ничего не публикует и не создаёт редиректы.

## Перед выпуском

1. `npm run validate`.
2. `npm run urls:inventory`.
3. `npm run redirects:preview`.
4. Проверить, что sitemap содержит только published/indexable страницы.
5. Выпускать серверные правила только для маршрутов, где canonical registry разрешает release.
