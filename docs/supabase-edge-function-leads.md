# Supabase Edge Function для заявок

Файл функции:

```text
supabase/functions/newbuild-lead/index.ts
```

Функция принимает JSON-заявку с сайта, валидирует основные поля, записывает заявку в `public.newbuild_leads`, создаёт событие в `public.newbuild_lead_events` и при наличии настроек отправляет уведомление в Telegram.

## 1. Что уже подготовлено

- SQL-схема: `docs/supabase-leads.sql`.
- Edge Function: `supabase/functions/newbuild-lead/index.ts`.
- Фронтенд готов отправлять заявку в `LEAD_ENDPOINT` из `assets/js/main.js`.
- Email-копия через Web3Forms может остаться резервным каналом.

## 2. Переменные окружения

Обязательные:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Опциональные:

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
ALLOWED_ORIGINS=https://tellermanovsad.ru,https://deputat36.github.io
```

Важно: `SUPABASE_SERVICE_ROLE_KEY` нельзя хранить в публичном JavaScript. Он должен быть только в секретах Supabase Edge Function.

## 3. Подключение таблиц

Перед деплоем функции выполнить SQL из файла:

```text
docs/supabase-leads.sql
```

Если таблицы уже были созданы раньше, в конце SQL есть блок миграции для новых полей:

```sql
alter table public.newbuild_leads add column if not exists submit_time_seconds integer;
alter table public.newbuild_leads add column if not exists spam_check jsonb not null default '{}'::jsonb;
create index if not exists newbuild_leads_spam_check_gin_idx on public.newbuild_leads using gin (spam_check);
```

## 4. Деплой функции

Пример через Supabase CLI:

```bash
supabase functions deploy newbuild-lead
```

После деплоя URL будет примерно таким:

```text
https://PROJECT_ID.supabase.co/functions/v1/newbuild-lead
```

Этот URL нужно вставить в `assets/js/main.js`:

```js
const SITE_CONFIG = {
  LEAD_ENDPOINT: "https://PROJECT_ID.supabase.co/functions/v1/newbuild-lead"
};
```

## 5. Проверка через curl

```bash
curl -i -X POST 'https://PROJECT_ID.supabase.co/functions/v1/newbuild-lead' \
  -H 'Content-Type: application/json' \
  -d '{
    "client_fixation_id": "TEST-001",
    "lead_type": "callback",
    "form_id": "test_callback",
    "project": "Портал Новостройки Борисоглебска",
    "residential_complex": "ЖК Теллерманов сад",
    "name": "Тест",
    "phone": "+79000000000",
    "personal_data_consent": "yes",
    "tracking": {"current": {"utm_source": "test"}},
    "qualification": {"status": "hot", "score": 70},
    "spam_check": {"likely_bot": false}
  }'
```

Ожидаемый ответ:

```json
{
  "success": true,
  "id": "...",
  "client_fixation_id": "TEST-001",
  "lead_type": "callback",
  "crm_status": "new"
}
```

## 6. Что валидирует функция

Функция проверяет:

- метод запроса — только `POST`;
- наличие корректного JSON;
- телефон длиной не менее 10 цифр/символов после нормализации;
- согласие `personal_data_consent = yes`;
- допустимый `lead_type`;
- флаг антиспама `spam_check.likely_bot`.

Если `spam_check.likely_bot = true`, функция возвращает успешный, но заблокированный ответ:

```json
{
  "success": true,
  "blocked": true
}
```

Так бот не получает явную ошибку и не понимает, что заявка отфильтрована.

## 7. Telegram-уведомления

Если указаны `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`, функция отправит короткое уведомление:

```text
Новая заявка: Новостройки Борисоглебска
Тип: callback
ID фиксации: NB-...
Имя: ...
Телефон: ...
ЖК: ...
Квалификация: hot, 70 баллов
Источник: vk / post / tellermanov_start
```

Ошибка Telegram не ломает запись заявки.

## 8. Дубли

`client_fixation_id` уникален. Если заявка с таким ID уже есть, функция не создаёт дубль и возвращает:

```json
{
  "success": true,
  "duplicate": true,
  "client_fixation_id": "..."
}
```

## 9. Что нужно добавить позже

1. Rate limit по IP / fingerprint.
2. Логирование ошибок в отдельную таблицу.
3. Назначение менеджера по `realtor`, `manager`, источнику или типу заявки.
4. Создание задачи менеджеру в CRM.
5. Отправку письма клиенту, если появится email.
6. Отдельную таблицу источников и рекламных кампаний.
7. Дашборд: заявки по источникам, формам, менеджерам и статусам.
