# Дополнение к roadmap: контроль качества

Дата фиксации: 2026-07-05

## Что добавлено

- `tools/validate-static-site.mjs` — проверка HTML, локальных ссылок, `noindex` и базовых атрибутов форм.
- `tools/validate-json.mjs` — проверка синтаксиса JSON-файлов в папке `data`.
- `package.json` — скрипты:
  - `npm run validate`
  - `npm run validate:json`
- `.github/workflows/validate-static-site.yml` — workflow для ручного запуска и pull request.
- `docs/static-validation.md` — инструкция по статической проверке.
- `docs/data-quality-rules.md` — правила качества JSON-данных.

## Почему workflow не запускается на каждый push

Автоматический запуск на каждый push в `main` пока отключён, чтобы новый валидатор не блокировал текущую автономную работу до первой полной проверки старого сайта.

После ручной проверки можно вернуть запуск на push.

## Ближайшие действия

1. Запустить `npm run validate`.
2. Запустить `npm run validate:json`.
3. Исправить найденные ошибки и предупреждения.
4. После этого подключать `schema.js` к проверенным черновым страницам.
5. Только после успешной проверки обсуждать перенос `/portal-preview/` в корневой `index.html`.
