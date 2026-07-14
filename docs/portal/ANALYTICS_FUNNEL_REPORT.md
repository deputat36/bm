# Отчёт по аналитической воронке

Дата обновления: 2026-07-14

## Статус

```text
specification_only_no_live_data
```

Документ и `data/analytics/funnel-report.json` описывают формулы, допустимые разрезы и правила сверки. Они не подключают Google Analytics, Яндекс Метрику или другой рабочий счётчик и не содержат фактических значений.

## Цель

Подготовить единый отчёт по пути:

```text
источник
→ размещение
→ CTA
→ просмотр формы
→ начало заполнения
→ отправка
→ роль формы
→ объект
→ страница благодарности
→ действие после отправки
```

## Главное правило подсчёта

Общее число заявок берётся только из:

```text
valid_submissions = count(lead_submit where blocked=false)
```

Событие `lead_submit_classified` необходимо для разреза `primary | detailed`, но не является дополнительной заявкой.

Запрещено:

```text
lead_submit + lead_submit_classified
```

## Offline и онлайн

```text
online_submissions
= count(lead_submit where blocked=false AND offline=false)

offline_submissions
= count(lead_submit where blocked=false AND offline=true)
```

Offline-заявка не должна автоматически считаться доставленной во внешний канал.

## Основные конверсии

```text
view_to_start_rate
= form_starts / form_views

start_to_submit_rate
= classified_valid_submissions / form_starts

view_to_submit_rate
= classified_valid_submissions / form_views
```

Для деления на ноль возвращается `null`, а не 0%. Нулевой знаменатель означает отсутствие достаточных данных, а не отсутствие конверсии.

## Сверка событий

```text
classification_coverage_rate
= classified_valid_submissions / valid_submissions
```

Ожидаемое значение — 1. Предупреждение должно появляться ниже 0,98. Эта метрика помогает обнаружить потерю `lead_submit_classified` относительно канонического `lead_submit`.

## Справочный контент

```text
content_assisted_submissions
= count(
    lead_submit_classified
    where blocked=false
      AND lead_source=internal_content
  )
```

Разрез `placement` показывает конкретный вход:

```text
guides_hero
news_hero
developers_hero
guide_documents_footer
guide_declaration_footer
guide_layout_footer
```

## Представления отчёта

### Сводка запуска

- валидные отправки;
- онлайн-отправки;
- offline-отправки;
- доля онлайн-доставки;
- покрытие классификацией.

### Эффективность CTA

Разрезы:

```text
page_path
action
placement
object_id
```

### Воронка форм

Разрезы:

```text
form_id
form_role
lead_type
residential_complex_id
```

### Источники и размещения

Разрезы:

```text
lead_source
placement
form_id
lead_type
residential_complex_id
```

### Справочный контент

Показывает количество и долю заявок после редакционных материалов.

### После отправки

Сопоставляет классифицированные онлайн-отправки, просмотры страницы благодарности и дальнейшие действия пользователя.

## Конфиденциальность

В измерения и формулы запрещено включать:

```text
name
phone
phone_normalized
email
budget
comment
question
consent_text
user_agent
client_fixation_id
```

`client_fixation_id` остаётся допустимым только в каноническом событии по правилам реестра событий, но не используется как измерение отчёта.

## Команды

Проверка:

```bash
npm run validate:analytics-funnel
```

Markdown:

```bash
npm run analytics:funnel-report
```

JSON:

```bash
npm run analytics:funnel-report -- --format=json
```

CSV:

```bash
npm run analytics:funnel-report -- --format=csv
```

Только одно представление:

```bash
npm run analytics:funnel-report -- --view=source_performance
```

Только коэффициенты:

```bash
npm run analytics:funnel-report -- --type=ratio
```

## Перед использованием с рабочими данными

Нужно отдельно:

1. подтвердить семь событий в фактическом debug-режиме счётчика;
2. проверить одну контролируемую реальную отправку;
3. убедиться, что `lead_source`, `placement`, `form_id`, `form_role` и объект попадают в рабочую систему;
4. выбрать периодичность и владельца отчёта;
5. не импортировать персональные поля в аналитическую систему.
