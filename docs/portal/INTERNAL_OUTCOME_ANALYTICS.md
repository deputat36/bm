# Внутренняя outcome-аналитика

Дата: 2026-08-09

Статус: спецификация защищённой отчётности. Live export не включён.

## Цель

Связать обращения портала с фактическими коммерческими результатами, не передавая персональные данные, внутренние lead ID и owner references во внешнюю веб-аналитику.

## Что уже даёт серверный контур

`public.newbuild_leads` и `public.newbuild_lead_events` уже позволяют достоверно получить:

- создание обращения;
- назначение роли после operational activation;
- первую попытку связи;
- подтверждённый контакт;
- квалификацию;
- вход в состояние `consultation_active`.

В `newbuild_leads` уже сохраняются `lead_source`, `placement`, `residential_complex_id`, `form_id`, `lead_type` и `lead_class`.

## Подтверждённый schema gap

`form_role` существует во frontend analytics, но текущий `buildLeadRow()` не сохраняет его отдельным server field. Поэтому разрез primary/detailed нельзя считать доступным для защищённой outcome-аналитики до отдельного server-side изменения.

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

`consultation_started` доступен как производный внутренний milestone по входу в `consultation_active`, но он не подменяет `consultation_scheduled` или `consultation_completed`.

## Доступные агрегаты после operational activation

```text
contact_rate = lead_contacted / lead_received
qualified_rate = lead_qualified / lead_contacted
consultation_start_rate = consultation_started / lead_qualified
```

`deal_rate` намеренно заблокирован, пока не существует канонического `closed_won`.

## Измерения

Доступны на сервере:

- lead_source;
- placement;
- object_id через `residential_complex_id`;
- form_id;
- lead_type;
- lead_class;
- result_status.

Пока недоступен как отдельное server dimension:

- form_role.

## Privacy

Репозиторий хранит только контракт и генератор спецификации. Реальные outcome rows остаются в защищённом server contour.

В агрегированные отчёты запрещено выводить:

- lead_id/event_id;
- record_locator;
- client_fixation_id;
- owner/backup references;
- имя, телефон, email;
- комментарии и вопросы;
- page_url/referrer/user_agent.

Минимальная группа для сегментированного отчёта — 3 обращения. Меньшие группы должны подавляться, чтобы не повышать риск обратной идентификации.

## Отделение от публичной аналитики

Публичный `data/analytics/events.json` отвечает только за обезличенные browser events. Канонические internal outcome events не должны добавляться туда автоматически.

Связь между public attribution и commercial outcome выполняется только внутри защищённого server contour.

## Следующие технические этапы

1. После owner approval операционного контура подтвердить реальные `assigned_at`, `contacted_at`, `qualified_at` на тестовом lead.
2. Отдельно добавить server persistence `form_role`.
3. Спроектировать append-only события для consultation scheduled/completed, selection, showing, deposit, won/lost.
4. Не строить deal rate до появления канонического `closed_won`.
5. Подключить cost data отдельно после фактического запуска placements.
6. Строить только агрегированные отчёты по source / placement / object / form / lead type.

## Команды

```bash
node tools/validate-internal-outcomes.mjs
node tools/build-internal-outcome-report-spec.mjs
node tools/build-internal-outcome-report-spec.mjs --format=json
```
