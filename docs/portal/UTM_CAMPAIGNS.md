# UTM-кампании портала «Новостройки Борисоглебска»

Дата обновления: 2026-07-14

## Назначение

Единый реестр исключает произвольные названия рекламных кампаний и помогает связать:

```text
рекламный канал → посадочная страница → объект → первичная форма → lead_type → задача отдела продаж
```

Источник данных:

```text
data/marketing/utm-campaigns.json
```

Проверка:

```bash
npm run validate:utm
```

## Основные правила

1. Для рекламных кампаний используются адреса объектов, а не прежнее позиционирование одного ЖК.
2. Активная кампания может вести только на страницу со статусом `ready` или `published` в `data/pages/index.json`.
3. `expected_form_id` должен находиться внутри контейнера `data-primary-lead` на посадочной странице.
4. `expected_lead_type` проверяется непосредственно у целевой формы, а не по любому совпадению на странице.
5. Для объектной кампании `object_id` должен совпадать с `data-complex-id` формы.
6. Общая кампания должна использовать нейтральный `data-complex="Общий подбор новостройки"`.
7. Значения UTM записываются строчными латинскими буквами, цифрами, дефисами и подчёркиваниями.
8. Для одного набора `landing_path + utm_source + utm_medium + utm_campaign + utm_content` допускается только одна запись.
9. Кампания не подтверждает наличие, цену, срок или бронь. Эти сведения проверяются отдельно.

Главный принцип:

```text
активная реклама → короткая первичная форма → первый разговор → квалификация
```

Подробная форма сохраняется на странице, но не назначается входом активной рекламной кампании.

## Формирование ссылки

Шаблон:

```text
https://novostroyki-borisoglebsk.ru{landing_path}?utm_source={utm_source}&utm_medium={utm_medium}&utm_campaign={utm_campaign}&utm_content={utm_content}
```

Пример для публикации ВКонтакте по Просторной 4А:

```text
https://novostroyki-borisoglebsk.ru/catalog/prostornaya-4a/?utm_source=vk&utm_medium=social&utm_campaign=prostornaya_4a_launch&utm_content=launch_post
```

Целевая форма этой ссылки:

```text
catalog_prostornaya_4a_quick_consultation
```

Пример общего каталога для Telegram:

```text
https://novostroyki-borisoglebsk.ru/catalog/?utm_source=telegram&utm_medium=social&utm_campaign=portal_catalog&utm_content=catalog_post
```

Целевая форма:

```text
catalog_quick_selection
```

## Генератор готовых ссылок

Генератор читает реестр и собирает URL без ручного копирования параметров:

```bash
npm run utm:links
```

Markdown-таблица показывает:

```text
ID кампании
объект
канал
посадочную страницу
целевой form_id
готовую ссылку
цель
```

JSON для интеграции с другим инструментом:

```bash
npm run utm:links -- --format=json
```

CSV для таблицы или передачи сотрудникам:

```bash
npm run utm:links -- --format=csv
```

JSON и CSV дополнительно содержат:

```text
entry_point=primary_short_form
```

Вывод кампаний любого статуса:

```bash
npm run utm:links -- --format=json --status=all
```

Генератор не изменяет реестр и не публикует ссылки автоматически. В Portal guards выполняется контрольная генерация JSON, чтобы поломка формата обнаруживалась до объединения изменений.

## Действующие направления

| Объект или задача | Каналы | Посадочная страница | Целевая первичная форма |
|---|---|---|---|
| Общий каталог | ВКонтакте, Telegram | `/catalog/` | `catalog_quick_selection` |
| Печатные материалы и QR | офлайн | `/` | `homepage_quick_selection` |
| Просторная 4А | ВКонтакте, Telegram | `/catalog/prostornaya-4a/` | `catalog_prostornaya_4a_quick_consultation` |
| Аэродромная 18Г | ВКонтакте, Telegram | `/catalog/aerodromnaya-18g/` | `catalog_aerodromnaya_18g_quick_consultation` |
| Сенная 76 | ВКонтакте, Telegram | `/catalog/sennaya-76/` | `catalog_sennaya_76_quick_consultation` |
| Ипотечная консультация | ВКонтакте | `/ipoteka/` | `portal_mortgage_quick_consultation` |

## Сценарий обработки

`sales_note` теперь соответствует короткому первому шагу:

```text
1. Подтвердить объект или главный вопрос.
2. Договориться об удобном первом разговоре.
3. Уточнить комнатность, бюджет, способ и срок покупки.
4. Сообщать только подтверждённые сведения.
5. Зафиксировать следующий шаг.
```

Для ипотечной кампании программа, первоначальный взнос и комфортный платёж уточняются после первого контакта или через подробную форму.

## Добавление новой кампании

Перед добавлением нужно определить:

```text
id
status
object_id
landing_path
expected_form_id
expected_lead_type
utm_source
utm_medium
utm_campaign
utm_content
goal
sales_note
```

Для активной кампании нужно дополнительно проверить:

```text
посадочная страница ready/published
на странице есть data-primary-lead
expected_form_id находится внутри data-primary-lead
lead_type совпадает у самой формы
object_id совпадает с data-complex-id для объектной формы
```

После изменения реестра обязательны:

```bash
npm run validate:utm
npm run utm:links -- --format=json
npm run validate:leads
npm run validate:form-scope
```

## Использование отделом продаж

`utm_source`, `utm_medium`, `utm_campaign` и `utm_content` сохраняются системой заявок вместе с первым и последним касанием. Поле `sales_note` в реестре задаёт ожидаемый сценарий обработки обращения, но не передаётся клиенту как рекламное обещание.
