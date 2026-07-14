# Ворота готовности запуска

Дата обновления: 2026-07-14

## Назначение

Портал имеет несколько разных типов запуска. Техническая готовность форм не означает готовность к рекламе, а подготовленный рекламный URL не означает готовность объекта к индексации.

Сводный отчёт разделяет:

```text
1. запуск рекламы и сбор реальных заявок
2. снятие noindex с карточек объектов
3. выпуск серверных legacy-редиректов
```

Команда:

```bash
npm run launch:readiness
```

Источники отчёта:

```text
data/qa/form-scenarios.json
data/qa/form-results.json
data/research/source-collection.json
data/projects/index.json
data/marketing/campaign-release.json
data/marketing/campaign-publications.json
data/release/manual-gates.json
```

## Текущее состояние

```text
Всего ворот: 10
Пройдено: 1
Заблокировано: 9
Профилей готово: 0 из 3
```

Пройдено только одно ворота:

```text
campaign_links_prepared
```

Это означает, что 11 рекламных ссылок подготовлены и проверены. Это не разрешение на их публикацию.

## Автоматические ворота

### `form_manual_qa`

Требует прохождения всех 42 слотов:

```text
14 форм × desktop, Android, iPhone
```

Текущее состояние:

```text
passed=0
failed=0
blocked=0
not_run=42
```

### `source_collection`

Требует завершения всех 14 задач по первичным источникам или доказанной неприменимости отдельного документа.

Текущее состояние:

```text
accepted_or_not_applicable=0
pending=14
```

### `project_publication`

Требует `is_public_ready=true` для всех активных объектов, входящих в рассматриваемый выпуск.

Текущее состояние:

```text
public_ready=0
active_projects=3
```

### `campaign_links_prepared`

Требует контролируемый release pack из 11 ссылок без test/debug и персональных параметров.

Текущее состояние:

```text
passed
```

### `campaign_publication_activity`

Показывает фактические внешние размещения.

Текущее состояние:

```text
published_placements=0
```

Эти ворота информационные и не входят в предварительное решение о разрешении публикации.

## Ручные ворота

Файл:

```text
data/release/manual-gates.json
```

содержит только фактически проверенные решения.

### `real_lead_delivery`

Нужно согласованно отправить одну реальную тестовую заявку и подтвердить:

- доставку;
- `form_id`;
- `form_role`;
- `lead_type`;
- объект;
- UTM;
- ID фиксации;
- согласие;
- отсутствие потери полей.

### `live_analytics_debug`

Нужно проверить события в фактическом счётчике, а не только в локальном debug:

```text
lead_cta_click
lead_form_view
lead_form_start
lead_submit
lead_submit_classified
lead_thankyou_view
lead_postsubmit_action
```

Отдельно проверяется отсутствие персональных параметров и двойного подсчёта.

### `legal_owner_review`

Нужно подтвердить:

- владельца или оператора портала;
- фактические реквизиты;
- политику конфиденциальности;
- согласие на обработку данных;
- рекламные формулировки;
- отсутствие впечатления официального сайта застройщика.

### `campaign_publication_approval`

Нужно выбрать:

- конкретную кампанию;
- площадку;
- дату;
- формат сообщения;
- ответственного за обращения;
- допустимую посадочную страницу.

### `hosting_redirect_format`

Нужно определить платформу размещения и проверить:

- синтаксис 301/308;
- сохранение query и UTM;
- отсутствие циклов;
- отсутствие цепочек;
- порядок выпуска очередей.

## Статусы ручных ворот

```text
blocked
in_review
passed
not_applicable
```

### `blocked`

Доказательств нет. Поля `checked_at`, `reviewer` и `evidence` остаются пустыми.

### `in_review`

Проверка началась, но итог ещё не подтверждён. Завершённое доказательство не сохраняется как пройденное.

### `passed`

Обязательно:

```text
checked_at
reviewer
evidence минимум из одной записи
```

Каждая evidence-запись содержит:

```text
type
reference
note
```

Reference должен быть HTTPS-ссылкой либо путём внутри репозитория.

### `not_applicable`

Требует даты, проверяющего и доказательного объяснения. Нельзя использовать только потому, что задача неудобна или источник не найден.

## Профиль: рекламный запуск

Требует:

```text
form_manual_qa
real_lead_delivery
live_analytics_debug
legal_owner_review
campaign_links_prepared
campaign_publication_approval
```

Текущий статус:

```text
BLOCKED
```

Готовые ссылки нельзя считать разрешёнными к публикации, пока остальные ворота не пройдены.

## Профиль: SEO-индексация объектов

Требует:

```text
source_collection
project_publication
legal_owner_review
```

Текущий статус:

```text
BLOCKED
```

До этого карточки сохраняют:

```text
noindex,follow
is_public_ready=false
```

## Профиль: legacy-редиректы

Требует:

```text
hosting_redirect_format
legal_owner_review
```

Текущий статус:

```text
BLOCKED
```

Наличие реестра маршрутов не означает, что редиректы можно выпускать на неизвестной платформе.

## Команды

Проверка:

```bash
npm run validate:launch-readiness
```

Markdown-отчёт:

```bash
npm run launch:readiness
```

JSON:

```bash
npm run launch:readiness -- --format=json
```

CSV ворот:

```bash
npm run launch:readiness -- --format=csv
```

## Автоматическая защита

Validator не позволяет установить ручным воротам `passed`, если отсутствуют:

- evidence;
- дата проверки;
- проверяющий;
- корректная ссылка или путь;
- обязательные критерии.

В журнале запрещены:

```text
телефон
email
client_fixation_id
payload формы
user agent
ключ внешней формы
имя клиента
```

## Что отчёт не делает

Он не:

- публикует рекламу;
- отправляет реальную заявку;
- подключает счётчик;
- снимает `noindex`;
- выпускает редиректы;
- заменяет юридическую проверку;
- считает отсутствие доказательства положительным результатом.
