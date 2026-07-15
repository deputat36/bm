# Приватность локального контекста заявки

Статус: действующий формат закреплён CI; физический DevTools QA не выполнен.

## Назначение

Ключ:

```text
newbuildsBorisoglebskLastLead
```

нужен только для страницы благодарности и локальной связки с ролью формы.

## Разрешённые поля

После обычной отправки сохраняются:

```text
client_fixation_id
lead_type
form_id
project_id
project_name
residential_complex
residential_complex_id
qualification
created_at
```

Позже внутренний runtime может добавить только:

```text
form_role
```

Dry-run дополнительно хранит:

```text
dry_run=true
```

## Запрещённые поля

В `lastLead` нельзя сохранять:

```text
name
phone
phone_normalized
email
budget
comment
question
tracking
consent_text
personal_data_consent
marketing_consent
user_agent
fields_json
```

## Срок хранения

Контекст считается действительным не более 24 часов. Повреждённая, будущая или устаревшая запись удаляется до использования на странице благодарности.

## Автоматическая проверка

Файл:

```text
tools/validate-last-lead-privacy.mjs
```

Guard проверяет:

- точный allowlist обычной записи;
- точный allowlist dry-run записи;
- отсутствие контактных и текстовых полей;
- использование безопасной storage-обёртки;
- единственное допустимое последующее изменение `form_role`;
- отсутствие полного payload и tracking.

## Ограничения

CI не заменяет ручную проверку Application → Local Storage в desktop, Android и iPhone.