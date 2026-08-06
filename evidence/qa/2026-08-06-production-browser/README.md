# Production-domain browser-приёмка — 6 августа 2026 года

## Результат

На публичном домене `https://novostroyki-borisoglebsk.ru` выполнена автоматизированная desktop Chromium-приёмка всех форм в подтверждённом dry-run режиме без реальной отправки.

Подтверждено:

- 14 уникальных сценариев;
- 15/15 browser-прогонов passed;
- подробная форма Аэродромной 18Г выполнена дважды — 2/2;
- `storage_fail=local` и `storage_fail=session` — 2/2;
- запросы к lead endpoint — 0;
- внешние XHR/fetch с данными — 0;
- console errors — 0;
- page errors — 0;
- PII/privacy violations — 0;
- строгий artifact-validator passed;
- 18 JSON-файлов исходного artifact валидны;
- 35 файлов исходного artifact отражены в manifest.

## Среда

- origin: `https://novostroyki-borisoglebsk.ru`;
- режим: `allowlisted_remote`;
- Playwright 1.62.0;
- Chromium 151;
- профиль: `desktop_chromium_emulation`;
- физическое устройство: нет;
- dry-run: да;
- analytics debug: да;
- реальная серверная отправка: нет.

## Точная цепочка источника

- проверенный branch head: `0dcb51b850065318743599cf9c9199b422fc9283`;
- Actions merge-ref в summary: `4f6e73484678b6bf0c18d48185e17473f7deb01f`;
- финальный head PR №156 после удаления одноразового workflow: `f1a729a688210f01023f1ca1862977efde1c5fc3`;
- squash-коммит PR №156 в `main`: `02e27cd32ea8bf871fa15db8b7e83479feb42b4e`.

Постоянные runner/validator/workflow-файлы между проверенным head и финальным head не менялись; был удалён только одноразовый production workflow.

## Artifact

- workflow run: `31088606944`;
- artifact ID: `8962486372`;
- artifact digest: `sha256:69872b5a301684b1219c33525badf5a820a4692763f7d34df13604e53097e8c5`;
- срок хранения GitHub artifact: до 20 августа 2026 года;
- digest повторно подтверждён после скачивания.

`manifest.json` содержит SHA-256 и размер каждого из 35 файлов, включая 17 скриншотов, 17 полных event logs и исходный summary. `event-contexts.json` сохраняет агрегированный privacy-safe контекст всех журналов: последовательность событий, form_id, form_role, lead_type, object_id и placement. Бинарные скриншоты, исходный summary и полные event logs остаются в GitHub artifact и не дублируются в Git.

## Диагностический первый запуск

Первый production-run `31087744065` показал 14/15: `catalog_primary` начал проверку 9-значного телефона раньше, чем асинхронный `form-accessibility.js` установил pattern и maxlength.

Причина локализована как race condition QA-runner. Runner дополнен обязательным ожиданием:

- `data-accessibility-enhanced="true"`;
- установленного телефонного `pattern`;
- `maxlength=24`.

После исправления production-run и параллельный local-static контроль `31088917434` прошли полностью.

## Ограничения

Evidence не подтверждает физические Android/iPhone устройства, реальную доставку заявки в Supabase, рабочий внешний аналитический счётчик, legal, operations или campaign launch gates.

Исторические материалы `evidence/qa/2026-08-03/` и local-static evidence `evidence/qa/2026-08-06-browser/` не изменялись.
