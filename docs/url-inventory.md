# Инвентаризация URL перед sitemap и миграцией

Дата фиксации: 2026-07-07

## 1. Назначение

До переноса `/portal-preview/` в корневую главную и до обновления `sitemap.xml` нужно видеть полную картину:

- какие страницы портала уже заведены в `data/pages/index.json`;
- какие страницы можно включать в sitemap;
- какие страницы пока закрыты от sitemap;
- какие старые URL планируется перенаправить;
- какие редиректы требуют отдельного решения.

Для этого добавлен инструмент:

```text
tools/build-url-inventory.mjs
```

## 2. Запуск

Из корня проекта:

```bash
npm run urls:inventory
```

По умолчанию используются базовые адреса:

```text
PORTAL_BASE_URL=https://novostroyki-borisoglebsk.ru
LEGACY_BASE_URL=https://tellermanovsad.ru
```

При необходимости их можно переопределить:

```bash
PORTAL_BASE_URL=https://example.ru LEGACY_BASE_URL=https://old.example.ru npm run urls:inventory
```

## 3. Что читает инструмент

```text
data/pages/index.json
data/pages/legacy-redirects.json
```

## 4. Что выводит инструмент

Отчёт выводится в JSON и содержит:

```text
generated_at
portal_base_url
legacy_base_url
summary
sitemap_candidates
sitemap_blocked_pages
legacy_redirects_ready_or_active
legacy_redirects_blocked
```

## 5. Логика sitemap

Страница считается кандидатом для sitemap только если одновременно выполнено:

```text
status = published
robots не равен noindex,follow
```

Все черновые страницы со статусом `draft` или `ready` не попадают в кандидаты sitemap.

## 6. Логика редиректов

Редирект считается готовым к включению только если его статус:

```text
ready
```

или:

```text
active
```

Записи со статусами `planned` и `requires_decision` остаются заблокированными для активации.

## 7. Как использовать перед публикацией

Перед обновлением sitemap нужно:

1. Запустить `npm run validate`.
2. Запустить `npm run urls:inventory`.
3. Убедиться, что в `sitemap_candidates` попали только те страницы, которые действительно готовы к индексации.
4. Проверить `sitemap_blocked_pages` и понять, какие страницы ещё нельзя публиковать.
5. Проверить `legacy_redirects_blocked`, особенно записи со статусом `requires_decision`.
6. Только после этого готовить новый `sitemap.xml`.

## 8. Важное ограничение

Этот инструмент не меняет `sitemap.xml` автоматически. Он только показывает будущую картину и помогает не включить черновые или юридически неготовые страницы в индекс.
