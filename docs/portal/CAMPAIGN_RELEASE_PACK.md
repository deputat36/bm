# Пакет рекламных ссылок портала

Дата подготовки: 2026-07-14

Статус:

```text
Подготовлено, но не опубликовано
```

Release ID:

```text
portal_campaign_links_2026_07_14
```

Все ссылки ведут на основной домен портала, используют короткие первичные формы и не содержат тестовых параметров, персональных данных или идентификаторов сотрудников.

## Общий каталог

### ВКонтакте

Campaign ID:

```text
portal_vk_catalog
```

Готовая ссылка:

```text
https://novostroyki-borisoglebsk.ru/catalog/?utm_source=vk&utm_medium=social&utm_campaign=portal_catalog&utm_content=catalog_post
```

Целевая форма:

```text
catalog_quick_selection
```

### Telegram

Campaign ID:

```text
portal_telegram_catalog
```

Готовая ссылка:

```text
https://novostroyki-borisoglebsk.ru/catalog/?utm_source=telegram&utm_medium=social&utm_campaign=portal_catalog&utm_content=catalog_post
```

Целевая форма:

```text
catalog_quick_selection
```

## Общегородской печатный QR

Campaign ID:

```text
portal_offline_qr
```

QR payload:

```text
https://novostroyki-borisoglebsk.ru/?utm_source=offline&utm_medium=qr&utm_campaign=portal_city_awareness&utm_content=printed_material
```

Целевая форма:

```text
homepage_quick_selection
```

Текущий статус:

```text
QR-изображение не создано
```

Изображение QR-кода создаётся только после выбора конкретного носителя, размера, минимальной дистанции сканирования и макета.

## Просторная 4А

### ВКонтакте

Campaign ID:

```text
prostornaya_4a_vk_launch
```

Готовая ссылка:

```text
https://novostroyki-borisoglebsk.ru/catalog/prostornaya-4a/?utm_source=vk&utm_medium=social&utm_campaign=prostornaya_4a_launch&utm_content=launch_post
```

Целевая форма:

```text
catalog_prostornaya_4a_quick_consultation
```

### Telegram

Campaign ID:

```text
prostornaya_4a_telegram_launch
```

Готовая ссылка:

```text
https://novostroyki-borisoglebsk.ru/catalog/prostornaya-4a/?utm_source=telegram&utm_medium=social&utm_campaign=prostornaya_4a_launch&utm_content=launch_post
```

Целевая форма:

```text
catalog_prostornaya_4a_quick_consultation
```

При публикации нельзя выдавать рабочие цены, сроки, квартирографию и визуальные материалы за подтверждённые без первичного источника.

## Аэродромная 18Г

### ВКонтакте

Campaign ID:

```text
aerodromnaya_18g_vk_interest
```

Готовая ссылка:

```text
https://novostroyki-borisoglebsk.ru/catalog/aerodromnaya-18g/?utm_source=vk&utm_medium=social&utm_campaign=aerodromnaya_18g_interest&utm_content=interest_post
```

Целевая форма:

```text
catalog_aerodromnaya_18g_quick_consultation
```

### Telegram

Campaign ID:

```text
aerodromnaya_18g_telegram_interest
```

Готовая ссылка:

```text
https://novostroyki-borisoglebsk.ru/catalog/aerodromnaya-18g/?utm_source=telegram&utm_medium=social&utm_campaign=aerodromnaya_18g_interest&utm_content=interest_post
```

Целевая форма:

```text
catalog_aerodromnaya_18g_quick_consultation
```

Кампания предназначена для фиксации интереса и вопросов. Она не должна обещать цену, старт продаж, срок сдачи или наличие квартиры без подтверждения.

## Сенная 76

### ВКонтакте

Campaign ID:

```text
sennaya_76_vk_interest
```

Готовая ссылка:

```text
https://novostroyki-borisoglebsk.ru/catalog/sennaya-76/?utm_source=vk&utm_medium=social&utm_campaign=sennaya_76_interest&utm_content=interest_post
```

Целевая форма:

```text
catalog_sennaya_76_quick_consultation
```

### Telegram

Campaign ID:

```text
sennaya_76_telegram_interest
```

Готовая ссылка:

```text
https://novostroyki-borisoglebsk.ru/catalog/sennaya-76/?utm_source=telegram&utm_medium=social&utm_campaign=sennaya_76_interest&utm_content=interest_post
```

Целевая форма:

```text
catalog_sennaya_76_quick_consultation
```

Кампания предназначена для фиксации интереса и главного вопроса по адресу. Неподтверждённые характеристики нельзя публиковать как факт.

## Ипотечная консультация

### ВКонтакте

Campaign ID:

```text
portal_vk_mortgage
```

Готовая ссылка:

```text
https://novostroyki-borisoglebsk.ru/ipoteka/?utm_source=vk&utm_medium=social&utm_campaign=portal_mortgage&utm_content=mortgage_post
```

Целевая форма:

```text
portal_mortgage_quick_consultation
```

### Telegram

Campaign ID:

```text
portal_telegram_mortgage
```

Готовая ссылка:

```text
https://novostroyki-borisoglebsk.ru/ipoteka/?utm_source=telegram&utm_medium=social&utm_campaign=portal_mortgage&utm_content=mortgage_post
```

Целевая форма:

```text
portal_mortgage_quick_consultation
```

Публикация не должна обещать одобрение банка, конкретную ставку, аккредитацию объекта или доступность программы без проверки.

## Правила выпуска

Перед размещением конкретной ссылки необходимо:

1. Проверить посадочную страницу в обычном режиме без debug-параметров.
2. Убедиться, что рекламный текст соответствует текущему статусу данных объекта.
3. Не сокращать ссылку внешним сервисом без отдельного решения и проверки сохранения UTM.
4. Не добавлять в URL имя, телефон, email, ID клиента, сотрудника или другие персональные параметры.
5. Не использовать тестовые параметры `lead_test`, `analytics_test` и `test_ack`.
6. После фактической публикации отдельно зафиксировать канал, дату, пост или носитель.

## Команды

```bash
npm run validate:campaign-release
npm run marketing:release-pack
npm run marketing:release-pack -- --format=json
npm run marketing:release-pack -- --format=csv
npm run marketing:release-pack -- --channel=vk
npm run marketing:release-pack -- --channel=telegram
npm run marketing:release-pack -- --object=prostornaya-4a
```

## Что не выполнено

- ссылки не опубликованы во ВКонтакте и Telegram;
- QR-изображение не создано;
- внешний сокращатель URL не используется;
- доставка реальной заявки не подтверждена;
- события не проверены в рабочем счётчике аналитики;
- цены, наличие и сроки объектов не подтверждаются этим пакетом.
