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

Портал не является официальным сайтом застройщика, жилого комплекса или отдела продаж.

Основной принцип:

```text
нет подтверждённого источника → нет публичного факта
```

Корневая страница индексируется. Внутренние разделы и карточки объектов сохраняют `noindex,follow` до проверки источников, юридических текстов, форм и готовности публикации.

## Конверсионный путь

Короткий и подробный сценарии работают на семи основных входах:

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

Короткие формы запрашивают только имя, телефон и объект или главный вопрос. Комнатность, бюджет, способ покупки, программа, срок и комментарий остаются в подробных формах.

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

Роли:

```text
primary = короткая форма внутри data-primary-lead
detailed = подробная форма вне первичного контейнера
```

В заявке сохраняются:

```text
form_id
form_role
lead_type
project_id
project_name
residential_complex
residential_complex_id
page_url
referrer
first_touch
last_touch
UTM и рекламные идентификаторы
lead_source
placement
client_fixation_id
qualification
consent
```

## Контекстные переходы

Справочник, новости, раздел застройщиков и три статьи направляют к существующим коротким формам без создания дополнительных анкет.

Охвачено:

```text
6 справочных страниц
12 контекстных CTA
3 целевые первичные формы
```

Размещения:

```text
guides_hero
news_hero
developers_hero
guide_documents_footer
guide_declaration_footer
guide_layout_footer
```

Внутренние ссылки передают только:

```text
lead_source=internal_content
placement=<размещение кнопки>
```

Внутренний переход не заменяет внешний рекламный UTM. Менеджер видит `lead_source` и `placement` отдельными строками в читаемом письме и отдельными полями Web3Forms.

## Ипотечная воронка

Объектные CTA ведут к:

```text
/ipoteka/?object=<residential_complex_id>#quick-lead
```

Формы принимают только ID из внутреннего разрешённого реестра, автоматически выбирают объект и не обещают одобрение банка, ставку, аккредитацию или наличие квартиры.

## Аналитика

Машиночитаемый реестр использует schema version 1.2.

Активные события:

```text
lead_cta_click
lead_form_view
lead_form_start
lead_submit
lead_submit_classified
lead_thankyou_view
lead_postsubmit_action
```

Правило подсчёта:

```text
все отправки → lead_submit
разрез primary/detailed → lead_submit_classified
```

`lead_submit_classified` нельзя складывать с `lead_submit` как дополнительную заявку.

`lead_submit` и `lead_submit_classified` содержат необязательные технические измерения:

```text
lead_source
placement
```

Имя, телефон, бюджет, комментарий и технический ID фиксации не передаются в классифицирующее событие.

## Dry-run и локальный debug

Обычный dry-run:

```text
?lead_test=dry-run&test_ack=1
```

не отправляет данные во внешние сервисы и не создаёт рабочие конверсии.

Локальный analytics debug включается только при тройном условии:

```text
?lead_test=dry-run&analytics_test=debug&test_ack=1
```

Он моделирует полный путь событий только в `sessionStorage`, подавляет `dataLayer`, `gtag` и Метрику, удаляет персональные и ограниченные поля и хранит не более 100 записей.

## Ручной QA

Подготовлено:

```text
14 сценариев
3 устройства: desktop, android, iphone
42 QA-слота
```

Текущее состояние:

```text
passed=0
failed=0
blocked=0
not_run=42
```

Физические тесты Android и iPhone не проводились.

## Рекламные кампании

Зарегистрировано 11 активных кампаний:

```text
общий каталог: VK + Telegram
Просторная 4А: VK + Telegram
Аэродромная 18Г: VK + Telegram
Сенная 76: VK + Telegram
ипотека: VK + Telegram
общегородской QR: offline/qr
```

Release pack подготовлен, но не опубликован.

```text
prepared_links=11
published_placements=0
qr_images_generated=false
working_analytics_verified=false
```

## Источники и готовность объектов

Очередь первичных источников:

```text
projects=3
tasks=14
accepted=0
missing=14
```

Распределение:

```text
Просторная 4А — 4 задачи
Аэродромная 18Г — 5 задач
Сенная 76 — 5 задач
```

Готовность карточек:

```text
public_ready=0
requires_recheck=1
requires_sources=2
noindex=3
```

### Просторная 4А

```text
sources_verified=0/3
critical_claims_confirmed=0/14
is_public_ready=false
```

Не сохранены точные первичные ссылки на карточку ЕИСЖС, актуальную проектную декларацию и разрешение на строительство. Права на семь визуализаций не подтверждены.

### Аэродромная 18Г и Сенная 76

```text
verification_file=missing
verification_status=requires_check
is_public_ready=false
```

Цены, сроки, застройщик, планировки и характеристики не публикуются как подтверждённые факты.

## Ворота запуска

Всего ворот: 10.

```text
passed=1
blocked=9
ready_profiles=0/3
```

Пройдено только:

```text
campaign_links_prepared
```

Профили:

```text
рекламный запуск — BLOCKED
SEO-индексация объектов — BLOCKED
legacy-редиректы — BLOCKED
```

Ручного подтверждения требуют:

```text
real_lead_delivery
live_analytics_debug
legal_owner_review
campaign_publication_approval
hosting_redirect_format
```

## Legacy-миграция

Зарегистрировано 24 маршрута пяти очередей. Переходные страницы сохраняют `noindex`, не содержат самостоятельных форм и старого позиционирования.

Серверные редиректы не выпущены: платформа размещения и формат правил не определены.

## Автоматические проверки

Portal guards проходит 35 специализированных шагов.

Ключевые команды:

```bash
npm run validate
npm run validate:leads
npm run validate:contextual-conversion
npm run validate:lead-source-output
npm run validate:form-roles
npm run validate:analytics
npm run validate:analytics-debug
npm run validate:form-qa
npm run validate:form-qa-results
npm run validate:verification
npm run validate:source-collection
npm run validate:project-readiness
npm run validate:launch-readiness
npm run validate:utm
npm run audit:branding
```

## Открытые риски

1. Реальная доставка заявок не подтверждена контролируемой отправкой.
2. Фактическое письмо с новыми полями не проверено.
3. События не проверены в рабочем счётчике.
4. 42 ручных QA-слота не выполнены.
5. Для трёх объектов не завершён сбор первичных источников.
6. Права на визуальные материалы не подтверждены.
7. Фактические реквизиты владельца данных требуют юридической проверки.
8. Рекламные ссылки не опубликованы, QR не создан.
9. Платформа и формат серверных редиректов не определены.
10. CRM или управляемый серверный endpoint не подключены.

## Следующие действия

1. Провести ручную проверку форм на desktop, Android и iPhone через dry-run.
2. Проверить события и поля `lead_source`, `placement`, `form_role` в фактическом debug-режиме аналитики.
3. После отдельного согласования отправить одну реальную тестовую заявку и проверить письмо.
4. Сохранить точные первичные ссылки по Просторной 4А.
5. Продолжить сбор источников по Аэродромной 18Г и Сенной 76.
6. Проверить права на визуальные материалы.
7. Получить юридическое решение по владельцу данных и рекламной публикации.
8. После разрешения опубликовать кампании и внести фактические размещения в журнал.
9. Выбрать носитель и размер для QR.
10. Определить платформу размещения и синтаксис серверных редиректов.
11. Принять отдельное решение по endpoint заявок и CRM.

## Основные документы

```text
docs/development-roadmap.md
docs/portal/CONTEXTUAL_CONTENT_CTA.md
docs/portal/LEAD_SOURCE_OUTPUT.md
docs/portal/FORM_ROLE_ANALYTICS.md
docs/portal/ANALYTICS_EVENT_REGISTRY.md
docs/portal/ANALYTICS_DEBUG_QA.md
docs/portal/FORM_QA_MATRIX.md
docs/portal/FORM_QA_RESULTS.md
docs/portal/CAMPAIGN_RELEASE_PACK.md
docs/portal/CAMPAIGN_PUBLICATION_TRACKER.md
docs/portal/PROJECT_VERIFICATION_READINESS.md
docs/portal/SOURCE_COLLECTION_QUEUE.md
docs/portal/LAUNCH_READINESS_GATES.md
```
