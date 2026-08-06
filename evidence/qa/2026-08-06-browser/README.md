# Повторная desktop browser-приёмка — 6 августа 2026 года

## Результат

Автоматизированная приёмка выполнена на head `d839d7e49df5fe8e04b0b4ac4f524df06244f816`; workflow проверял PR merge-ref `7842152ae7d8c42d6dae692247cafe5dc995d07f`. Изменения вошли в `main` через PR #154 и squash-коммит `bf8f405e386aecba4a964d3a8d6dbad656702436`.

Подтверждено:

- 14 уникальных сценариев;
- 15/15 browser-прогонов passed;
- подробная форма Аэродромной 18Г выполнена дважды — 2/2;
- `storage_fail=local` и `storage_fail=session` — 2/2;
- endpoint requests — 0;
- external data requests — 0;
- console errors — 0;
- page errors — 0;
- PII/privacy violations — 0;
- 18 JSON-файлов валидны;
- 35 файлов artifact зафиксированы в manifest.

## Среда

- локальная статическая версия checkout;
- Playwright 1.62.0;
- Chromium 151;
- профиль `desktop_chromium_emulation`;
- физическое устройство: нет;
- dry-run и analytics debug: да;
- реальная серверная отправка: нет.

## Artifact

- workflow run: `31085851541`;
- artifact ID: `8961381674`;
- artifact digest: `sha256:6d0831a326789aa6938af84745434bb6ec8cfc76f9d9054caeb895c1a466a7c9`;
- срок хранения artifact в GitHub: до 20 августа 2026 года;
- digest повторно подтверждён после скачивания.

`manifest.json` содержит SHA-256 и размер каждого из 35 файлов, включая 17 скриншотов. В репозитории сохраняются summary, 17 обезличенных event logs и сокращённый event context. Бинарные скриншоты остаются в GitHub artifact.

## Дополнительный дефект и исправление

Первый строгий artifact-review выявил несовместимый с HTML pattern `v`-флагом класс символов телефона. В `assets/js/form-accessibility.js` экранированы `.`, `(`, `)` и `-`. После исправления Chromium-run и строгий artifact-validator прошли без runtime errors.

## Ограничения

Этот evidence не подтверждает production-domain browser-run, физические Android/iPhone устройства, реальную доставку в Supabase, рабочую внешнюю аналитику, legal, operations или campaign launch gates.

Исторические материалы `evidence/qa/2026-08-03/` не изменялись.
