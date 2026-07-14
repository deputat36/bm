# STATUS портала novostroyki-borisoglebsk.ru

Дата обновления: 2026-07-14

## Текущий продукт

Портал развивается как независимый городской каталог новостроек Борисоглебска.

Приоритет сбора заявок:

```text
1. Просторная 4А
2. Аэродромная 18Г
3. Сенная 76
4. Общий подбор по другим новостройкам города
```

Портал не позиционируется как официальный сайт застройщика и не действует от имени отдельного жилого комплекса.

## Рабочая структура

```text
/
/catalog/
/catalog/prostornaya-4a/
/catalog/aerodromnaya-18g/
/catalog/sennaya-76/
/developers/
/developers/bm-group/
/ipoteka/
/guides/
/news/
/contacts/
/about/
/sources/
/legal/
/privacy/
/personal-data-consent/
/advertising/
/karta-sayta/
/spasibo/
```

Корневая страница индексируется. Внутренние рабочие разделы сохраняют `noindex,follow`, пока данные, формы и юридические тексты не прошли финальную проверку.

## Реализовано

- главная и основные разделы переведены на нейтральный портальный стиль;
- для трёх приоритетных объектов работают отдельные формы;
- общий каталог содержит отдельную форму подбора;
- заявки сохраняют объект, форму, тип обращения, страницу, источник и рекламные метки;
- подключены first touch и last touch;
- добавлены квалификация лида и ID фиксации клиента;
- добавлены мобильная панель действий, ARIA-статусы, контроль фокуса и мобильные настройки клавиатуры;
- создан безопасный dry-run без отправки данных во внешние сервисы;
- резервная привязка в `assets/js/main.js` заменена на «Общий подбор новостройки»;
- runtime-защита в `schema.js` сохранена для старых или закешированных значений;
- создан справочный каталог, который допускает вывод только подтверждённых карточек;
- создан реестр визуальных материалов Просторной 4А;
- создан построчный реестр проверки характеристик Просторной 4А;
- legacy-страницы переведены в переходный контур без самостоятельных форм;
- создан реестр UTM-кампаний и генератор готовых рекламных ссылок;
- Portal guards и статические проверки запускаются в GitHub Actions.

## Формы и заявки

Активные формы:

```text
homepage_priority_selection
catalog_priority_selection
catalog_prostornaya_4a_priority_lead
catalog_aerodromnaya_18g_priority_lead
catalog_sennaya_76_priority_lead
contacts_priority_selection
portal_mortgage_consultation
```

Основной fallback:

```text
SITE_CONFIG.defaultComplex = «Общий подбор новостройки»
```

Команда:

```bash
npm run validate:form-scope
```

проверяет:

```text
уникальный data-form-id
непустой data-lead-type
project_id=newbuilds-borisoglebsk
непустой data-project-name
явный data-complex
отсутствие привязки к старому ЖК
нейтральный defaultComplex в main.js
подключение main.js и schema.js
runtime-защиту резервной привязки
```

Переходная `/zayavka/` отдельно проверяется на отсутствие лид-форм.

## Безопасный dry-run

Режим включается только при одновременных параметрах:

```text
?lead_test=dry-run&test_ack=1
```

Он:

```text
не отправляет данные в Web3Forms
не отправляет данные в email или CRM
не создаёт события реальной конверсии
создаёт локальный ID NB-TEST-*
проверяет обязательные поля и системные идентификаторы
показывает отдельное тестовое состояние страницы благодарности
```

Реальная доставка заявок этим режимом не подтверждается.

Документ:

```text
docs/portal/LEAD_DRY_RUN_QA.md
```

## Просторная 4А

Рабочая карточка содержит:

```text
характеристики дома
рабочие реквизиты документов
дату последней сверки
безопасные ответы на частые вопросы
форму catalog_prostornaya_4a_priority_lead
```

Реестр проверки:

```text
data/verification/prostornaya-4a.json
```

Текущий режим:

```text
overall_status=requires_recheck
claims=working_copy
sources=reference_required
is_public_ready=false
```

Для перевода характеристики в `confirmed` требуется первичный источник с заполненной ссылкой и датой проверки. Карточка остаётся `noindex,follow`.

## Аэродромная 18Г и Сенная 76

Обе карточки:

```text
verification_status=requires_check
is_public_ready=false
robots=noindex,follow
```

Неподтверждённые цены, сроки, застройщик, планировки и характеристики не публикуются как факт.

## Визуальные материалы

Реестр:

```text
data/media/prostornaya-4a.json
```

Семь унаследованных визуализаций имеют статус:

```text
verification_status=requires_check
rights_status=unknown
is_public_ready=false
allowed_usage=[]
```

Публичный вывод возможен только при одновременном выполнении условий:

```text
verification_status=confirmed
rights_status=cleared
is_public_ready=true
source_reference заполнен
allowed_usage не пуст
```

## Рекламные кампании и ссылки

Реестр:

```text
data/marketing/utm-campaigns.json
```

Он содержит кампании для:

```text
общего каталога
Просторной 4А
Аэродромной 18Г
Сенной 76
офлайн QR
ипотечной консультации
```

Каждая кампания связана с объектом, посадочной страницей, `form_id`, `lead_type`, целью и примечанием для отдела продаж.

Проверка и генерация:

```bash
npm run validate:utm
npm run utm:links
npm run utm:links -- --format=json
npm run utm:links -- --format=csv
```

Portal guards выполняет контрольную генерацию JSON.

Документ:

```text
docs/portal/UTM_CAMPAIGNS.md
```

## Legacy-миграция

Реестр:

```text
data/migration/legacy-routes.json
```

Зарегистрировано 24 маршрута пяти очередей.

Все переходные страницы:

```text
закрыты от индексации
не содержат старого домена и прежнего брендинга
не содержат самостоятельных лид-форм
не используют meta refresh или JavaScript redirect
содержат явную ссылку на целевую страницу
```

Пятая очередь включает три старые статьи `/spravochnik/`, содержание которых перенесено в `/guides/`.

Серверные редиректы ещё не выпущены. Для них необходимо определить платформу размещения, синтаксис правил, сохранение query-параметров и план отката.

## Автоматические проверки

```bash
npm run validate
npm run validate:json
npm run validate:priority
npm run validate:reference
npm run validate:verification
npm run validate:leads
npm run validate:form-scope
npm run validate:a11y
npm run validate:dry-run
npm run validate:legal
npm run validate:trust
npm run validate:links
npm run validate:html-sitemap
npm run validate:legacy
npm run validate:media
npm run validate:utm
npm run utm:links -- --format=json
npm run audit:branding
```

Последние изменения с нейтрализацией `defaultComplex` и генератором UTM-ссылок прошли Portal guards и оба workflow статической проверки.

## Открытые риски

1. Реальная доставка заявок ещё не подтверждена контролируемой тестовой отправкой.
2. Мобильное использование не проверено на реальных Android и iPhone.
3. Для Просторной 4А не сохранены точные URL первичных документов.
4. Аэродромная 18Г и Сенная 76 остаются в статусе `requires_check`.
5. Справочный каталог пока не наполнен подтверждёнными дополнительными объектами.
6. Семь изображений требуют проверки происхождения, актуальности и разрешения на публикацию.
7. Для страниц обработки данных нужно определить фактические реквизиты владельца и провести юридическую проверку.
8. Платформа и формат серверных редиректов пока не определены.

## Следующие действия

1. Сохранить точные ссылки на карточку ЕИСЖС, декларацию и разрешение Просторной 4А.
2. Сверить critical claims по первичным источникам.
3. Проверить происхождение и права на визуализации.
4. Провести ручную мобильную проверку форм через dry-run.
5. После согласования выполнить одну реальную тестовую заявку на `/contacts/`.
6. Подготовить фактические рекламные ссылки и QR-коды из UTM-реестра.
7. Собрать источники по другим новостройкам Борисоглебска.
8. Определить платформу размещения и правила серверных редиректов.

## Основные документы

```text
docs/development-roadmap.md
docs/portal/URL_MIGRATION_MAP.md
docs/portal/LEADS_AND_CRM.md
docs/portal/LEAD_DRY_RUN_QA.md
docs/portal/FORM_ACCESSIBILITY_AND_MOBILE_QA.md
docs/portal/PROJECT_VERIFICATION_WORKFLOW.md
docs/portal/MEDIA_REVIEW_WORKFLOW.md
docs/portal/UTM_CAMPAIGNS.md
```
