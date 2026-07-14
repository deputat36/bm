# UTM-кампании портала «Новостройки Борисоглебска»

Дата обновления: 2026-07-14

## Назначение

Единый реестр исключает произвольные названия рекламных кампаний и помогает связать:

```text
рекламный канал → посадочная страница → объект → форма → lead_type → задача отдела продаж
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
3. `expected_form_id` и `expected_lead_type` должны реально присутствовать на посадочной странице.
4. Значения UTM записываются строчными латинскими буквами, цифрами, дефисами и подчёркиваниями.
5. Для одного набора `landing_path + utm_source + utm_medium + utm_campaign + utm_content` допускается только одна запись.
6. Кампания не подтверждает наличие, цену, срок или бронь. Эти сведения проверяются отдельно.

## Формирование ссылки

Шаблон:

```text
https://novostroyki-borisoglebsk.ru{landing_path}?utm_source={utm_source}&utm_medium={utm_medium}&utm_campaign={utm_campaign}&utm_content={utm_content}
```

Пример для публикации ВКонтакте по Просторной 4А:

```text
https://novostroyki-borisoglebsk.ru/catalog/prostornaya-4a/?utm_source=vk&utm_medium=social&utm_campaign=prostornaya_4a_launch&utm_content=launch_post
```

Пример общего каталога для Telegram:

```text
https://novostroyki-borisoglebsk.ru/catalog/?utm_source=telegram&utm_medium=social&utm_campaign=portal_catalog&utm_content=catalog_post
```

## Действующие направления

| Объект или задача | Каналы | Посадочная страница | Целевая форма |
|---|---|---|---|
| Общий каталог | ВКонтакте, Telegram | `/catalog/` | `catalog_priority_selection` |
| Печатные материалы и QR | офлайн | `/` | `homepage_priority_selection` |
| Просторная 4А | ВКонтакте, Telegram | `/catalog/prostornaya-4a/` | `catalog_prostornaya_4a_priority_lead` |
| Аэродромная 18Г | ВКонтакте, Telegram | `/catalog/aerodromnaya-18g/` | `catalog_aerodromnaya_18g_priority_lead` |
| Сенная 76 | ВКонтакте, Telegram | `/catalog/sennaya-76/` | `catalog_sennaya_76_priority_lead` |
| Ипотечная консультация | ВКонтакте | `/ipoteka/` | `portal_mortgage_consultation` |

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

После изменения реестра обязательны:

```bash
npm run validate:utm
npm run validate:leads
npm run validate:form-scope
```

## Использование отделом продаж

`utm_source`, `utm_medium`, `utm_campaign` и `utm_content` сохраняются системой заявок вместе с первым и последним касанием. Поле `sales_note` в реестре задаёт ожидаемый сценарий обработки обращения, но не передаётся клиенту как рекламное обещание.
