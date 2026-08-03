# Актуальное состояние портала

Дата фиксации: 3 августа 2026 года.

## Фактическая архитектура

- независимый городской каталог на `novostroyki-borisoglebsk.ru`;
- три приоритетных объекта: Просторная 4А, Аэродромная 18Г и Сенная 76;
- 14 форм на семи страницах;
- обязательная запись только через Supabase Edge Function `newbuild-lead`;
- основное хранилище `public.newbuild_leads`;
- защищённый журнал, rate limit, RLS, серверная валидация и автоматический триаж;
- live smoke-test и автоматическая GitHub-тревога;
- активного прямого браузерного маршрута через Web3Forms нет.

## P0-приёмка на commit 8b9845d

Production проверен только с параметрами:

`lead_test=dry-run&analytics_test=debug&test_ack=1`.

Результат browser QA:

- passed: 0;
- failed: 14 desktop-слотов;
- blocked: 28 Android/iPhone-слотов;
- not_run: 0.

Все 14 desktop-форм фактически открывались и отправлялись в dry-run. Валидация телефона 9/10/15/16 цифр, фокус, элементы формы, test thank-you, privacy и защита от повторного submit проверены. Слоты имеют `failed`, потому что обязательный `placement` отсутствует в локальных событиях; у подробной формы Аэродромной 18Г дважды не сформирован целевой `lead_form_view`.

Android и iPhone отмечены `blocked`: доступная среда не предоставила физические устройства или эмуляцию. Эмуляция не выдавалась за физическое устройство.

Шесть storage-сценариев отмечены `blocked`: безопасного способа отключить выбранное хранилище без изменения production-кода не было. Требование на тестовый механизм и fail-safe storage передано в issue #151.

## Серверный контроль

- Edge Function `newbuild-lead`: ACTIVE, version 2;
- health до и после: `status=ok`, schema `2.0`;
- storage, event log и rate limit готовы;
- активная операционная политика отсутствует;
- количество записей `public.newbuild_leads`: 0 до и 0 после;
- реальная заявка не создавалась.

## Gates

- real lead delivery: blocked;
- live analytics: blocked;
- legal owner review: blocked;
- operations activation: blocked;
- campaign publication: blocked;
- source/publication gates: не пройдены;
- `noindex` сохраняется.

## Технический разрыв

Issue #151 содержит единое задание Codex:

- заполнить `placement`;
- стабилизировать `lead_form_view`;
- убрать state-locked числа из launch-readiness;
- добавить безопасные storage-failure тесты.

Documentation/evidence PR должен оставаться draft до исправления CI. Production JavaScript, Supabase и workflow в него не входят.

## Следующий шаг

1. Codex исправляет issue #151 отдельным PR.
2. Повторно выполняются 14 desktop-слотов и две desktop storage-проверки.
3. При доступности честной эмуляции или устройств выполняются Android и iPhone.
4. Реальная контрольная заявка, live analytics, legal и operations gates остаются отдельными решениями.
