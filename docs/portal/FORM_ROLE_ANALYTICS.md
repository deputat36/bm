# Роли коротких и подробных форм в аналитике

Дата обновления: 2026-07-14

## Задача

В активном контуре портала работают 14 форм на семи основных страницах.

До этого аналитика различала их только по конкретному `form_id`. Для общего сравнения коротких и подробных сценариев требовалось вручную поддерживать список форм.

Добавлен единый признак:

```text
form_role=primary | detailed
```

## Определение роли

Роль определяется автоматически в `assets/js/conversion-tracking.js`.

```text
форма находится внутри data-primary-lead → primary
остальная активная форма страницы → detailed
```

На каждой основной странице действует одна пара:

```text
короткая форма = primary
подробная форма = detailed
```

Роль не дублируется вручную во всех HTML-файлах. Это снижает риск, что разметка и аналитика разойдутся после изменения страницы.

## Активные пары

| Страница | Primary | Detailed |
|---|---|---|
| `/` | `homepage_quick_selection` | `homepage_priority_selection` |
| `/catalog/` | `catalog_quick_selection` | `catalog_priority_selection` |
| `/catalog/prostornaya-4a/` | `catalog_prostornaya_4a_quick_consultation` | `catalog_prostornaya_4a_priority_lead` |
| `/catalog/aerodromnaya-18g/` | `catalog_aerodromnaya_18g_quick_consultation` | `catalog_aerodromnaya_18g_priority_lead` |
| `/catalog/sennaya-76/` | `catalog_sennaya_76_quick_consultation` | `catalog_sennaya_76_priority_lead` |
| `/contacts/` | `contacts_quick_selection` | `contacts_priority_selection` |
| `/ipoteka/` | `portal_mortgage_quick_consultation` | `portal_mortgage_consultation` |

## Передача в заявке

При загрузке страницы скрипт:

1. определяет роль формы;
2. записывает её в `data-form-role`;
3. создаёт скрытое поле `form_role`;
4. передаёт значение вместе с остальными полями формы.

Это означает, что `form_role` доступен:

```text
в FormData
в fields_json письма Web3Forms
в custom endpoint после его подключения
в локальной записи последней заявки
```

Отдельный серверный endpoint или CRM для этого этапа не подключались.

## События просмотра и начала

События:

```text
lead_form_view
lead_form_start
```

получают:

```text
form_id
form_role
lead_type
residential_complex
residential_complex_id
```

Так можно сравнивать, какая доля пользователей видит и начинает:

```text
primary
versus
detailed
```

## Отправка заявки

Основное событие:

```text
lead_submit
```

остаётся единственной общей конверсией отправки. Его нужно использовать для общего количества заявок.

После него создаётся дополнительное событие:

```text
lead_submit_classified
```

Поля события:

```text
form_id
form_role
lead_type
residential_complex_id
qualification_status
blocked
offline
```

`blocked` позволяет исключить заявки, остановленные honeypot-защитой.

`offline` позволяет отдельно видеть обращения, которые были сохранены локально из-за отсутствия настроенного канала доставки.

Событие не содержит:

```text
имя
телефон
комментарий
бюджет
технический ID фиксации
```

## Правило отчётности

Нельзя складывать `lead_submit` и `lead_submit_classified` как две разные заявки.

Правильное использование:

```text
общее число заявок → lead_submit с blocked=false
разрез primary/detailed → lead_submit_classified с blocked=false
```

Статус `offline=true` нужно показывать отдельно от подтверждённо доставленных обращений.

Пример отчёта:

| Метрика | Событие | Фильтр |
|---|---|---|
| Все незаблокированные отправки | `lead_submit` | `blocked=false` |
| Заявки с коротких форм | `lead_submit_classified` | `form_role=primary`, `blocked=false` |
| Заявки с подробных форм | `lead_submit_classified` | `form_role=detailed`, `blocked=false` |
| Локально сохранённые обращения | `lead_submit_classified` | `offline=true`, `blocked=false` |
| Конверсия просмотра в старт | `lead_form_view` → `lead_form_start` | по `form_role` |
| Конверсия старта в отправку | `lead_form_start` → `lead_submit_classified` | по `form_role`, `blocked=false` |

## Страница благодарности

Локальная запись заявки получает `form_role` после отправки.

На `/spasibo/` роль используется только при точном совпадении `client_fixation_id` локальной записи и URL.

Пользователь видит:

```text
Сценарий: Короткая форма
```

или:

```text
Сценарий: Подробная форма
```

События:

```text
lead_thankyou_view
lead_postsubmit_action
```

также получают `form_role`.

Это позволяет сравнить, что пользователь делает после короткой и подробной заявки:

```text
возвращается к объекту
открывает каталог
оставляет новую заявку
звонит
```

Заблокированная или локально сохранённая заявка не перенаправляется на обычную страницу благодарности существующей логикой формы.

## Dry-run

В безопасном режиме:

```text
?lead_test=dry-run&test_ack=1
```

роль формы определяется и сохраняется локально для проверки сценария.

При этом не создаются:

```text
lead_submit
lead_submit_classified
lead_thankyou_view
lead_postsubmit_action
```

Тестовые действия не должны попадать в реальную аналитику.

## Автоматическая проверка

Файл:

```text
tools/validate-form-role-analytics.mjs
```

Команда:

```bash
npm run validate:form-roles
```

Guard проверяет:

- семь страниц с 14 активными формами;
- ровно одну primary- и одну detailed-форму на странице;
- размещение primary внутри `data-primary-lead`;
- отсутствие detailed внутри первичного контейнера;
- порядок форм;
- автоматическое добавление `form_role`;
- состав `lead_submit_classified`;
- наличие `blocked` и `offline`;
- нормализацию этих признаков в boolean;
- отсутствие персональных данных в событии;
- отсутствие аналитических событий в dry-run.

Проверка включена в общий `npm run validate` и отдельным шагом в Portal guards.

## Ограничения

Автоматические проверки не подтверждают:

- фактическую настройку Google Analytics или Яндекс Метрики;
- поступление событий в реальный счётчик;
- корректность готового внешнего дашборда;
- реальную доставку заявок;
- поведение на физических Android и iPhone.

После запуска трафика необходимо проверить события в режиме отладки аналитической системы и только затем строить операционный отчёт.
