# Актуальное состояние портала

Дата фиксации: 6 августа 2026 года.

## Фактическая архитектура

- независимый городской каталог на `novostroyki-borisoglebsk.ru`;
- три приоритетных объекта: Просторная 4А, Аэродромная 18Г и Сенная 76;
- 14 форм на семи страницах;
- обязательная запись только через Supabase Edge Function `newbuild-lead`;
- основное хранилище `public.newbuild_leads`;
- защищённый журнал, rate limit, RLS, серверная валидация и автоматический триаж;
- live smoke-test и автоматическая GitHub-тревога;
- активного прямого браузерного маршрута через Web3Forms нет.

## Историческая P0-приёмка на commit 8b9845d

Production проверялся только с параметрами:

`lead_test=dry-run&analytics_test=debug&test_ack=1`.

Зафиксированный результат browser QA:

- passed: 0;
- failed: 14 desktop-слотов;
- blocked: 28 Android/iPhone-слотов;
- not_run: 0.

Все 14 desktop-форм фактически открывались и отправлялись в dry-run. Валидация телефона 9/10/15/16 цифр, фокус, элементы формы, test thank-you, privacy и защита от повторного submit были проверены. Слоты получили `failed`, потому что обязательный `placement` отсутствовал в локальных событиях; у подробной формы Аэродромной 18Г дважды не сформировался целевой `lead_form_view`.

Android и iPhone отмечены `blocked`: доступная среда не предоставила физические устройства или эмуляцию. Эмуляция не выдавалась за физическое устройство.

Шесть первоначальных storage-сценариев отмечены `blocked`: на момент прогона безопасного способа отключить выбранное хранилище без изменения production-кода не было.

Эти результаты являются evidence состояния до исправлений и не переписываются задним числом.

## Исправления после приёмки

PR #153 слит в `main` squash-коммитом `6fa7c1e8af86d6a25ea2917a7d8571dfb16ede4b`.

Реализовано:

- единый нормализованный `placement`;
- общий контекст `form_id`, `form_role`, `lead_type`, `object_id` для обязательных событий формы;
- стабильный `lead_form_view` для переходов на `#quick-lead` и `#lead` с дедупликацией по форме;
- безопасный allowlist-режим `storage_fail=local|session`, доступный только при тройном подтверждении dry-run/debug;
- fail-safe работа с localStorage и sessionStorage;
- восстановление формы при отказе storage без fetch, PII-черновиков, обходной отправки и переноса персональных значений в URL;
- динамические launch-readiness инварианты вместо исторически зафиксированных чисел;
- согласованные analytics, privacy, storage и thank-you validators.

На head PR #153 успешно завершились все 17 GitHub Actions, включая Portal guards, оба Validate static site, Form QA execution pack, analytics, privacy, fail-closed, primary-route и launch-readiness проверки.

Issue #151 остаётся открытым только до повторного browser QA на версии после `6fa7c1e8`.

## Серверный контроль

- Edge Function `newbuild-lead`: ACTIVE, version 2;
- health при первоначальной приёмке: `status=ok`, schema `2.0`;
- storage, event log и rate limit готовы;
- активная операционная политика отсутствует;
- количество записей `public.newbuild_leads`: 0 до и 0 после первоначального dry-run;
- реальная заявка не создавалась;
- PR #153 не менял Supabase schema, Edge Function, RLS или основной endpoint.

## Gates

- повторный desktop browser QA после исправлений: pending;
- Android/iPhone QA: blocked до доступности честной эмуляции или устройств;
- real lead delivery: blocked;
- live analytics: blocked;
- legal owner review: blocked;
- operations activation: blocked;
- campaign publication: blocked;
- source/publication gates: не пройдены;
- `noindex` сохраняется.

## Следующий шаг

1. Повторно выполнить 14 desktop-сценариев на версии после `6fa7c1e8`.
2. Отдельно проверить `catalog_aerodromnaya_18g_priority_lead`.
3. Фактически выполнить desktop-проверки `storage_fail=local` и `storage_fail=session`.
4. Добавить новый evidence отдельным датированным набором, не изменяя исторические результаты от 3 августа.
5. После успешной повторной приёмки обновить issue #151 и решить судьбу evidence PR #152.
6. Реальная контрольная заявка, live analytics, legal и operations gates остаются отдельными решениями владельца.
