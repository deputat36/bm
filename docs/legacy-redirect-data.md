# Машинная карта миграции старых URL

Дата обновления: 2026-09-27

Единственный машиночитаемый источник истины:

```text
data/migration/legacy-routes.json
```

Ранний файл `data/pages/legacy-redirects.json` удалён и не должен восстанавливаться: он содержал устаревшие цели временной архитектуры `/zhk/tellermanov-sad/...` и противоречил текущему городскому порталу.

## Каноническая запись

Каждый маршрут содержит как минимум:

```text
source_url
source_file
target_url
target_file
target_href
status
migration_action
redirect_phase
redirect_ready
blocking_reason
```

Для `retain_content` также используется `content_migration_status`.

## Проверки

```bash
npm run validate:legacy
npm run redirects:preview
npm run urls:inventory
```

`npm run validate` также запускает canonical legacy validator.

Validator проверяет существование source/target, `noindex,follow` у transition pages, отсутствие старого домена/брендинга/лид-форм, запрет auto-redirect до release и отсутствие legacy URL в sitemap.

## Release boundary

`redirect_ready=false` не является разрешением на серверный редирект. Изменение hosting rules выполняется отдельно и только после прохождения release checklist.
