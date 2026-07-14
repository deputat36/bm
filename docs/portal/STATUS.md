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

Портал не позиционируется как официальный сайт застройщика, жилого комплекса или отдела продаж.

Базовый принцип публикации:

```text
нет подтверждённого источника → нет публичного факта
```

Корневая страница индексируется. Внутренние рабочие разделы сохраняют `noindex,follow`, пока сведения, формы и юридические тексты не прошли финальную проверку.

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

## Конверсионный путь

Короткий и подробный сценарии работают на всех главных входах:

```text
главная
каталог
Просторная 4А
Аэродромная 18Г
Сенная 76
контакты
ипотека
```

Общий путь:

```text
CTA
→ короткая первичная форма
→ первый разговор
→ уточнение параметров
→ подробная форма при готовности
→ отправка
→ страница благодарности
→ возврат к объекту, каталог или звонок
```

Короткие формы запрашивают только:

```text
имя
телефон
объект или главный вопрос
```

Комнатность, бюджет, способ покупки, программа, срок и комментарий остаются в подробных формах, когда это применимо.

Мобильная панель ведёт к контейнеру `data-primary-lead`.

## Активные формы

Всего активных форм: 14.

```text
homepage_quick_selection
homepage_priority_selection
catalog_quick_selection
catalog_priority_selection
catalog_prostornaya_4a_quick_consultation
catalog_prostornaya_4a_priority_lead
catalog_aerodromnaya_18g_quick_consultation
catalog_aerodromnaya_18g_priority_lead
catalog_sennaya_76_quick_consultation
catalog_sennaya_76_priority_lead
contacts_quick_selection
contacts_priority_selection
portal_mortgage_quick_consultation
portal_mortgage_consultation
```

Основной fallback:

```text
SITE_CONFIG.defaultComplex = «Общий подбор новостройки»
```

Каждая заявка сохраняет:

```text
form_id
lead_type
project_id
project_name
residential_complex
residential_complex_id
страницу отправки
источник перехода
first touch
last touch
UTM и рекламные идентификаторы
ID фиксации клиента
квалификацию
согласие
```

## Главная и каталог

На главной работают:

```text
homepage_quick_selection
homepage_priority_selection
```

Карточки Просторной 4А, Аэродромной 18Г и Сенной 76 ведут к коротким формам объектных страниц, а не к подробным анкетам.

На `/catalog/` работают:

```text
catalog_quick_selection
catalog_priority_selection
```

Карточки каталога ведут к:

```text
/catalog/prostornaya-4a/#quick-lead
/catalog/aerodromnaya-18g/#quick-lead
/catalog/sennaya-76/#quick-lead
```

## Страницы объектов

Для Просторной 4А, Аэродромной 18Г и Сенной 76 реализован единый путь:

```text
первый экран
→ короткая консультация
→ статус сведений
→ ответы на вопросы
→ CTA консультации и ипотеки
→ подробная форма
```

На каждой странице:

- разделены доступные и уточняемые сведения;
- размещён FAQ минимум из пяти вопросов;
- разъяснено, что заявка не является бронью, очередью или фиксацией цены;
- CTA размечены по размещению и ID объекта;
- ипотечный CTA сохраняет выбранный объект.

## Контакты

На `/contacts/` работают:

```text
contacts_quick_selection
contacts_priority_selection
```

Первичная форма запрашивает имя, телефон и объект. Подробная форма дополнительно собирает комнатность, бюджет, способ и срок покупки.

## Ипотечная воронка

На `/ipoteka/` работают:

```text
portal_mortgage_quick_consultation
portal_mortgage_consultation
```

Объектная страница передаёт безопасный параметр:

```text
/ipoteka/?object=<residential_complex_id>#quick-lead
```

Обе ипотечные формы:

- принимают только объект из внутреннего разрешённого реестра;
- автоматически выбирают объект;
- синхронизируют `residential_complex` и `residential_complex_id`;
- показывают нейтральное подтверждение выбранного объекта.

Короткая форма не требует программу, первоначальный взнос, бюджет или срок. Эти сведения собираются в подробном расчёте или в разговоре.

Ипотечная консультация не обещает одобрение банка, ставку, аккредитацию или наличие квартиры.

## Аналитика

Реализованы неперсональные события:

```text
lead_cta_click
lead_form_view
lead_form_start
lead_submit
lead_thankyou_view
lead_postsubmit_action
```

`lead_postsubmit_action` фиксирует:

```text
возврат к объекту
открытие каталога
новую заявку
звонок
```

Имя, телефон и содержимое пользовательских полей в конверсионные события не передаются.

## Страница благодарности

Порядок атрибуции `/spasibo/`:

1. Локальная запись используется только при точном совпадении ID заявки.
2. ID объекта проверяется по закрытому внутреннему реестру.
3. При отсутствии совпадения допускается fallback только по same-origin referrer.
4. При недостатке данных выводится нейтральный контекст портала.

В `lead_thankyou_view` не передаётся `client_fixation_id`.

При известном объекте посетителю показывается безопасная ссылка возврата на его страницу.

## Безопасный dry-run

Режим включается только при одновременных параметрах:

```text
?lead_test=dry-run&test_ack=1
```

Он:

```text
не отправляет данные в Web3Forms
не отправляет данные в email или CRM
не создаёт событие реальной конверсии
не создаёт post-submit события
создаёт локальный ID NB-TEST-*
проверяет обязательные поля и системные идентификаторы
показывает отдельное тестовое состояние
```

Реальная доставка заявок этим режимом не подтверждается.

## Рекламные кампании

Реестр:

```text
data/marketing/utm-campaigns.json
```

Зарегистрировано 11 активных кампаний для:

```text
общего каталога
главной и офлайн QR
Просторной 4А
Аэродромной 18Г
Сенной 76
ипотечной консультации
```

Все активные кампании привязаны к коротким формам внутри `data-primary-lead`.

Целевые формы:

```text
catalog_quick_selection
homepage_quick_selection
catalog_prostornaya_4a_quick_consultation
catalog_aerodromnaya_18g_quick_consultation
catalog_sennaya_76_quick_consultation
portal_mortgage_quick_consultation
```

`validate:utm` проверяет:

- активный статус посадочной страницы;
- наличие формы;
- `lead_type` непосредственно у формы;
- размещение формы внутри `data-primary-lead`;
- совпадение `object_id` и `data-complex-id`;
- нейтральную привязку общих кампаний;
- отсутствие старого однопроектного позиционирования;
- уникальность UTM-комбинаций.

Генератор показывает целевой `form_id` и добавляет в JSON/CSV:

```text
entry_point=primary_short_form
```

Команды:

```bash
npm run validate:utm
npm run utm:links
npm run utm:links -- --format=json
npm run utm:links -- --format=csv
```

## Состояние объектов

### Просторная 4А

```text
overall_status=requires_recheck
claims=working_copy
sources=reference_required
is_public_ready=false
```

Для перевода характеристики в `confirmed` требуется первичный источник с точной ссылкой и датой проверки.

### Аэродромная 18Г и Сенная 76

```text
verification_status=requires_check
is_public_ready=false
robots=noindex,follow
```

Неподтверждённые цены, сроки, застройщик, планировки и характеристики не публикуются как факт.

## Визуальные материалы

Семь унаследованных визуализаций Просторной 4А сохраняют:

```text
verification_status=requires_check
rights_status=unknown
is_public_ready=false
allowed_usage=[]
```

Публичный вывод возможен только после подтверждения источника, актуальности и прав.

## Legacy-миграция

Зарегистрировано 24 маршрута пяти очередей.

Переходные страницы:

- закрыты от индексации;
- не содержат прежнего брендинга;
- не содержат самостоятельных лид-форм;
- не используют клиентские автоматические редиректы;
- содержат явную ссылку на целевую страницу.

Серверные редиректы ещё не выпущены: платформа размещения и формат правил не определены.

## Автоматические проверки

Основные команды:

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
npm run audit:branding
```

Специализированные проверки:

```text
tools/validate-homepage-object-cta.mjs
tools/validate-catalog-conversion.mjs
tools/validate-contacts-conversion.mjs
tools/validate-mortgage-conversion.mjs
tools/validate-thankyou-context.mjs
```

Portal guards запускает эти проверки отдельными шагами.

## Открытые риски

1. Реальная доставка заявок ещё не подтверждена контролируемой тестовой отправкой.
2. Мобильное использование не проверено на физических Android и iPhone.
3. Для Просторной 4А не сохранены точные URL первичных документов.
4. Аэродромная 18Г и Сенная 76 остаются в статусе `requires_check`.
5. Семь изображений требуют проверки происхождения, актуальности и разрешения на публикацию.
6. Для страниц обработки данных нужно определить фактические реквизиты владельца и провести юридическую проверку.
7. Платформа и формат серверных редиректов пока не определены.
8. CRM или управляемый серверный endpoint не подключены.
9. Фактические рекламные ссылки и QR-коды ещё не выпущены в материалы.

## Следующие действия

1. Провести ручную мобильную проверку 14 форм через dry-run на Android и iPhone.
2. После отдельного согласования выполнить одну реальную тестовую заявку.
3. Сохранить точные ссылки на карточку ЕИСЖС, декларацию и разрешение Просторной 4А.
4. Продолжить сбор первичных источников по Аэродромной 18Г и Сенной 76.
5. Проверить происхождение и права на визуализации.
6. Сгенерировать и проверить фактические рекламные ссылки из обновлённого UTM-реестра.
7. Подготовить QR-коды после утверждения конкретных носителей.
8. После начала трафика сравнивать короткие и подробные формы по полной воронке.
9. Определить платформу размещения и правила серверных редиректов.
10. Принять решение по Web3Forms, Supabase Edge Function или другому endpoint.

## Основные документы

```text
docs/development-roadmap.md
docs/portal/HOMEPAGE_OBJECT_CTA.md
docs/portal/CATALOG_CONVERSION_PATH.md
docs/portal/CONTACTS_CONVERSION_PATH.md
docs/portal/PROJECT_PAGE_CONVERSION_AUDIT.md
docs/portal/PROJECT_TRUST_AND_FAQ.md
docs/portal/MORTGAGE_OBJECT_CONTEXT.md
docs/portal/MORTGAGE_QUICK_CONSULTATION.md
docs/portal/THANKYOU_ATTRIBUTION.md
docs/portal/LEADS_AND_CRM.md
docs/portal/LEAD_DRY_RUN_QA.md
docs/portal/FORM_ACCESSIBILITY_AND_MOBILE_QA.md
docs/portal/PROJECT_VERIFICATION_WORKFLOW.md
docs/portal/MEDIA_REVIEW_WORKFLOW.md
docs/portal/UTM_CAMPAIGNS.md
```
