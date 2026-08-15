# Операционный gate запуска портала

Дата обновления: 2026-08-16

## Назначение

Подготовленные формы и рекламные ссылки не означают, что портал готов принимать управляемый рекламный трафик. До запуска должно быть определено, кто принимает обращения, когда действует SLA и где фиксируется результат контакта.

Launch-readiness использует отдельное производное ворото:

```text
lead_operations_approval
```

Оно строится из:

```text
data/operations/lead-operations-approval.json
```

## Условия прохождения

Gate становится `passed` только одновременно при выполнении условий:

- в реестре ровно восемь обязательных решений;
- все восемь имеют статус `approved`;
- нет решений `requires_owner_decision`;
- нет решений `rejected`;
- нет решений `superseded`;
- `operational_activation_enabled=true`.

Одного назначения ответственного недостаточно. Необходимо утвердить весь пакет:

1. основной владелец;
2. резервный владелец;
3. рабочий график и часовой пояс;
4. SLA первого действия;
5. правила маршрутизации;
6. политика попыток связи;
7. причины закрытия;
8. единая система учёта.

## Текущее состояние

На 16 августа 2026 года:

```text
approved=1
pending=7
rejected=0
superseded=0
activation_enabled=false
status=blocked
```

Утверждено только решение `system_of_record=supabase:newbuild_leads`.

## Безопасное частичное утверждение

Approval registry и CI теперь допускают постепенное принятие owner decisions.

Например, переход с `1 approved / 7 pending` на `2 approved / 6 pending` является корректным состоянием при наличии валидного approved value/secure reference. Он:

- увеличивает `evidence_count` gate;
- уменьшает pending count;
- не включает operational activation;
- не переводит `lead_operations_approval` в `passed`;
- не разрешает campaign launch.

Таким образом, первое реальное решение владельца больше не должно ломать CI из-за исторического ожидания точного количества `1/7`.

## Отдельный activation stage

Этот контракт разделяет два этапа:

1. последовательное утверждение 8 owner decisions;
2. отдельная операционная активация после 8/8 approved и необходимых runtime/evidence проверок.

Пока `operational_activation_enabled=false`, gate остаётся blocked даже при полностью утверждённом наборе решений. При достижении 8/8 approval top-level approval status должен перейти в `ready_for_activation_not_operational`; фактическая activation выполняется отдельным контролируемым изменением.

## Связь с рекламным запуском

Профиль `campaign_launch` на 16 августа 2026 года требует:

```text
form_manual_qa
mobile_qa_release_policy
lead_operations_approval
real_lead_delivery
live_analytics_debug
legal_owner_review
campaign_links_prepared
campaign_publication_approval
```

Даже если формы, аналитика и рекламные ссылки готовы, профиль остаётся `BLOCKED`, пока обработка обращений не утверждена и не активирована.

## Что не меняется

Техническое изменение progression validation не:

- утверждает ни одно новое owner decision;
- назначает конкретного человека;
- включает SLA;
- включает автоматическое owner assignment;
- включает CRM mutation;
- отправляет заявку;
- публикует рекламу;
- сохраняет персональные данные в GitHub.

## Проверка

Команды:

```bash
npm run validate:lead-operations-approval
npm run validate:launch-operations-gate
npm run validate:launch-readiness
```

Validator проверяет структурно:

- ровно 8 зарегистрированных decisions;
- сумму approved/pending/rejected/superseded = 8;
- валидность каждого approved decision;
- неизменность утверждённого `system_of_record`;
- запрет activation до 8/8 approved;
- соответствие `lead_operations_approval` фактическим counts и activation flag;
- включение gate в `campaign_launch`;
- согласованность launch-readiness summary с реально сгенерированным количеством gates, без hardcoded числа.

CI также содержит отрицательный/переходный сценарий: один дополнительный owner decision временно переводится в `approved`; validators обязаны принять новое распределение `2/6`, но сохранить operations gate blocked.

## Изменение статуса в будущем

Нельзя менять итоговый gate вручную. Сначала обновляется approval registry с разрешёнными безопасными значениями и evidence. После 8/8 approved выполняется отдельная activation review. Launch-readiness пересчитывает состояние автоматически.
