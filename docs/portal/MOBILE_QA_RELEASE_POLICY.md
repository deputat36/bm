# Mobile QA release policy

## Зачем нужен отдельный контракт

У портала есть два разных класса QA evidence, которые нельзя смешивать.

1. `data/qa/form-results.json` — исторический журнал ручной проверки от 3 августа 2026 года. Он содержит фактически выполненные failed/blocked результаты и не переписывается задним числом.
2. Новые browser-automation evidence:
   - production-domain desktop Chromium — 15/15 + storage 2/2;
   - Android Chromium / Pixel 7 emulation — 15/15 + storage 2/2;
   - iPhone WebKit / iPhone 13 emulation — 15/15 + storage 2/2.

Мобильные evidence прямо классифицированы как `physical_device=false`.

## Не решённый вопрос

До следующего release-policy изменения владелец должен выбрать один из двух вариантов:

- `emulation_sufficient_for_controlled_launch` — эмуляционные Android/iPhone прогоны достаточны для ограниченного запуска;
- `physical_android_and_iphone_required_before_campaign_launch` — физические Android и iPhone являются обязательным отдельным gate до рекламного запуска.

Текущее состояние: `requires_owner_decision`.

## Что решение не делает автоматически

Ни один вариант сам по себе:

- не переписывает `data/qa/form-results.json`;
- не превращает исторические failed/blocked слоты в passed;
- не меняет `real_lead_delivery`;
- не меняет `live_analytics_debug`;
- не меняет legal/operations/campaign gates;
- не публикует рекламу.

Если владелец разрешит ограниченный запуск на основе эмуляции, потребуется отдельный review/PR, который явно изменит launch-readiness semantics и сохранит разделение historical manual evidence и browser automation evidence.

Если физические устройства обязательны, сначала нужен новый privacy-safe evidence фактического Android и iPhone QA.

## Источники

- `evidence/qa/2026-08-06-production-browser/README.md`;
- `evidence/qa/2026-08-09-mobile-emulation/README.md`;
- `data/qa/form-results.json`;
- `data/qa/form-execution-contract.json`;
- issue #71.

## Fail-closed правило

Пока `data/qa/mobile-release-policy.json.status=requires_owner_decision`, единый owner-release report обязан показывать `mobile_device_release_policy` как незавершённое QA-решение. Этот контракт не является QA evidence и не повышает `form_manual_qa`.
