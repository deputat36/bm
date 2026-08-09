# Внутренняя outcome-аналитика

Дата: 2026-08-09

Статус: спецификация защищённой отчётности. Live export не включён.

## Цель

Связать обращения портала с фактическими коммерческими результатами, не передавая персональные данные, внутренние lead ID и owner references во внешнюю веб-аналитику.

## Что уже даёт серверный контур

`public.newbuild_leads` и `public.newbuild_lead_events` позволяют достоверно получить:

- создание обращения;
- назначение роли после operational activation;
- первую попытку связи;
- подтверждённый контакт;
- квалификацию;
- вход в состояние `consultation_active`.

В `newbuild_leads` сохраняются `lead_source`, `placement`, `residential_complex_id`, `form_id`, `lead_type` и `lead_class`.

## Form role без дублирования server column

Для protected reporting отдельная колонка `form_role` в `newbuild_leads` не нужна.

Каноническая матрица `data/qa/form-scenarios.json` содержит 14 активных `form_id` и однозначное соответствие:

```text
form_id -> primary | detailed
```

На 9 августа 2026 года mapping содержит 7 primary и 7 detailed форм без дубликатов `form_id`.

Outcome report получает роль через защищённый join по сохранённому server `form_id`. Это устраняет прежний reporting gap и избегает риска рассинхронизации двух независимых полей в lead record.

При добавлении новой активной формы registry/validator должны быть обновлены одновременно; неоднозначный `form_id` запрещён.

## Каноническая воронка результата

Контракт фиксирует 12 внутренних событий:

```text
lead_received
lead_assigned
lead_contacted
lead_qualified
consultation_scheduled
consultation_completed
selection_sent
showing_scheduled
showing_completed
deposit
closed_won
closed_lost
```

Из текущей server schema напрямую доступны первые четыре. Остальные восемь нельзя выводить из догадок или текстовых комментариев — для них требуется отдельное каноническое событие/поле.

`consultation_started` доступен как производный milestone по входу в `consultation_active`, но он не подменяет `consultation_scheduled` или `consultation_completed`.

## Доступные агрегаты после operational activation

```text
contact_rate = lead_contacted / lead_received
qualified_rate = lead_qualified / lead_contacted
consultation_start_rate = consultation_started / lead_qualified
```

`deal_rate` намеренно заблокирован, пока не существует канонического `closed_won`.

## Измерения

Server record:

- lead_source;
- placement;
- object_id через `residential_complex_id`;
- form_id;
- lead_type;
- lead_class;
- result_status.

Registry-derived:

- form_role через `form_scenarios.form_id -> form_role`.

Таким образом для всех восьми предусмотренных reporting dimensions есть определённый источник; dimension schema gaps отсутствуют.

## Privacy

Репозиторий хранит только контракт, form registry и генератор спецификации. Реальные outcome rows остаются в защищённом server contour.

В агрегированные отчёты запрещено выводить:

- lead_id/event_id;
- record_locator;
- client_fixation_id;
- owner/backup references;
- имя, телефон, email;
- комментарии и вопросы;
- page_url/referrer/user_agent.

Минимальная группа для сегментированного отчёта — 3 обращения. Меньшие группы должны подавляться.

## Отделение от публичной аналитики

Публичный `data/analytics/events.json` отвечает только за обезличенные browser events. Канонические internal outcome events не добавляются туда автоматически.

Связь между public attribution и commercial outcome выполняется только внутри защищённого server contour.

## Следующие технические этапы

1. После owner approval операционного контура подтвердить реальные `assigned_at`, `contacted_at`, `qualified_at` на тестовом lead.
2. Спроектировать append-only события consultation scheduled/completed, selection, showing, deposit, won/lost.
3. Не строить deal rate до появления канонического `closed_won`.
4. Подключить cost data отдельно после фактического запуска placements.
5. Строить только агрегированные отчёты по source / placement / object / form / form role / lead type.

## Команды

```bash
node tools/validate-internal-outcomes.mjs
node tools/build-internal-outcome-report-spec.mjs
node tools/build-internal-outcome-report-spec.mjs --format=json
```
