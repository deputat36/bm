# Утверждение SLA и обработки обращений

Дата обновления: 2026-08-16

## Назначение

Этот пакет отделяет готовые технические контракты от решений, которые может принять только владелец процесса.

Портал уже умеет сформировать структурированное обращение, квалификацию и контекст. Но до утверждения ответственных, рабочего календаря, SLA и отдельной операционной активации нельзя считать обработку операционной.

Канонический реестр:

```text
data/operations/lead-operations-approval.json
```

## Текущее состояние

На 16 августа 2026 года:

```text
status=requires_owner_approval_not_operational
decision_phase=owner_decisions_pending
approved=1
pending=7
rejected=0
superseded=0
operational_activation_enabled=false
```

Уже утверждено только решение:

```text
system_of_record=supabase:newbuild_leads
```

Остальные семь решений остаются owner-dependent.

## Decision phases

`tools/build-lead-operations-approval-report.mjs` отдельно выводит `decision_phase`, чтобы не смешивать утверждение решений с фактической активацией.

### `owner_decisions_pending`

Есть хотя бы одно решение, которое ещё не approved. Это текущее состояние.

### `decisions_approved_activation_pending`

Все 8/8 decisions утверждены, но:

```text
operational_activation_enabled=false
```

Это важный отдельный handoff: решения уже завершены, но runtime/операционный режим ещё не активирован. В этой фазе Owner release blockers должен показывать отдельный `operational_activation_approval`.

### `activated_ready_for_controlled_test`

Все 8/8 decisions approved и отдельная операционная активация выполнена. Только после этого можно переходить к контролируемому real-lead evidence в рамках остальных launch gates.

Top-level report status пока сохраняет обратную совместимость с действующим package contract:

- до фактической activation — `owner_decisions_required_not_operational`;
- после 8/8 + activation — `operational_activation_ready_for_controlled_test`.

Точная стадия определяется по `decision_phase`.

## Решения владельца

| Решение | Что нужно утвердить | Текущий статус |
|---|---|---|
| Основной владелец | Операционная роль или защищённый идентификатор | Требует решения |
| Резервный владелец | Роль эскалации при недоступности основного | Требует решения |
| Рабочий график | Дни, часы, выходные и часовой пояс | Требует решения |
| SLA первого действия | Срок в рабочее и нерабочее время | Требует решения |
| Распределение | Правила по объекту, типу, квалификации и нагрузке | Требует решения |
| Попытки связи | Количество, каналы и интервалы | Требует решения |
| Причины закрытия | Контролируемый словарь и обязательность комментария | Требует решения |
| Система учёта | `supabase:newbuild_leads` | Утверждено |

## Как утверждать безопасно

Для ответственных в репозиторий нельзя записывать ФИО, телефон или email.

Допустимые варианты:

```text
role:lead_operator_primary
role:lead_operator_backup
secure_reference:crm://team/newbuild-leads
```

Фактическое соответствие роли конкретному сотруднику хранится только в защищённой системе, доступной менеджеру.

## Стартовые гипотезы

Гипотезы помогают принять решение, но не являются утверждённым SLA.

### Первое действие

Roadmap содержит стартовую гипотезу:

```text
не позднее 10 минут в утверждённые рабочие часы
```

После первых 30 реальных обращений значение нужно пересмотреть по фактической нагрузке и contact rate.

### Единая очередь

Безопасная стартовая модель:

```text
новое обращение
→ единая очередь
→ основной владелец
→ распределение по объекту / задаче / нагрузке
→ резерв при просрочке
```

### Попытки связи

Нужно утвердить:

- максимальное число попыток;
- допустимые каналы;
- интервалы;
- правило для нерабочего времени;
- обязательное следующее действие после каждой попытки.

### Причины закрытия

Кандидаты для утверждения:

```text
duplicate
invalid_or_spam
do_not_contact
no_answer_after_policy
not_interested
postponed
no_suitable_option
financing_not_available
other_with_comment
```

## Обязательные поля операционного контура

После активации у каждого тестового обращения должны быть:

```text
lead_id
received_at
lead_owner_ref
backup_owner_ref
assigned_at
first_action_due_at
first_action_at
contact_outcome
next_action
next_action_at
close_reason
source_system
record_locator
```

Портал не заменяет CRM. Эти поля должны храниться в выбранной защищённой системе.

## Условия активации

Операционный режим нельзя включать, пока одновременно не выполнены условия:

1. Утверждены все восемь решений.
2. Роли ответственных разрешаются в защищённой системе.
3. Утверждены рабочий график и часовой пояс.
4. Доступна единая система учёта.
5. Тестовое обращение имеет владельца, первое действие, результат и следующий шаг.
6. Выполнен security review CRM или endpoint.
7. Операционная активация включена отдельным явным изменением.

## Что не изменяется этим пакетом

- реальная заявка не отправляется;
- operational activation не включается автоматически;
- ответственный автоматически не назначается;
- CRM mutation выключен;
- персональные данные в отчёты и GitHub не попадают;
- SLA не объявляется утверждённым;
- реклама и снятие `noindex` не выполняются.

## Проверка

```text
node tools/validate-lead-operations-approval.mjs
node tools/build-lead-operations-approval-report.mjs
node tools/build-lead-operations-approval-report.mjs --format=json
```

Guard:

```text
.github/workflows/lead-operations-approval-guard.yml
```

CI дополнительно моделирует future state `8/8 approved + activation=false` и требует:

```text
decision_phase=decisions_approved_activation_pending
activation_required=true
```

Это гарантирует, что завершённые owner decisions не будут ошибочно смешаны с уже активированным операционным режимом.
