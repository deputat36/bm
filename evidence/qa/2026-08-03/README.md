# QA evidence — 3 августа 2026 года

Проверяемый commit: `8b9845d9cb89c464a1de321393a055b6c0863a61`.

Среда: `https://novostroyki-borisoglebsk.ru/`.

Параметры: `lead_test=dry-run&analytics_test=debug&test_ack=1`.

## Результат

- desktop: 14 failed;
- Android: 14 blocked;
- iPhone: 14 blocked;
- storage failures: 6 blocked;
- passed: 0;
- not_run: 0.

Desktop — удалённый Chrome-профиль; версия браузера и ОС средой не раскрыты. Android и iPhone не эмулировались и не выдавались за физические устройства.

## Что подтверждено

- формы открываются;
- пустая отправка блокируется и передаёт фокус;
- телефон 9/16 цифр отклоняется, 10/15 принимается;
- форматированный номер валиден;
- `inputmode=tel` и `autocomplete=tel`;
- поля сохраняют значения;
- dry-run открывает test thank-you;
- реальная доставка не вызывается;
- повторный submit блокируется;
- PII, user agent и URL с query отсутствуют в event log.

## Причина failed

Во всех 14 desktop-журналах обязательный `placement` отсутствует. Для `catalog_aerodromnaya_18g_priority_lead` два независимых прогона не создали целевой `lead_form_view`.

## Серверная сверка

- health до и после: `ok`;
- schema: `2.0`;
- Edge Function: ACTIVE version 2;
- `newbuild_leads`: 0 до и 0 после;
- реальных записей не создано.

## Файлы

- `form-qa-evidence.json` — 42 слота и шесть storage-статусов;
- `event-log-desktop.json` — обезличенные целевые события;
- `bm-qa-*-desktop.jpg` — 14 обезличенных экранов test thank-you.

Исправление production-кода вынесено в issue #151.
