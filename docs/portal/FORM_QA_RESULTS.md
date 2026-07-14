# Результаты ручной проверки форм

Дата обновления: 2026-07-14

## Назначение

Файл `data/qa/form-results.json` хранит только фактически выполненные ручные проверки.

Если для сочетания сценария и устройства нет записи, его статус автоматически считается:

```text
not_run
```

Это исключает ложное утверждение, что форма проверена на Android, iPhone или компьютере.

## Полная матрица

Источник сценариев:

```text
data/qa/form-scenarios.json
```

Контур содержит:

```text
14 сценариев × 3 устройства = 42 слота
```

Устройства:

```text
desktop
android
iphone
```

## Допустимые статусы записи

```text
passed
failed
blocked
```

`not_run` не записывается вручную. Он определяется отсутствием результата.

## Формат записи

```json
{
  "scenario_id": "homepage_primary",
  "device": "android",
  "status": "passed",
  "tested_at": "2026-07-14T15:30:00.000Z",
  "browser": "Chrome",
  "browser_version": "150",
  "os": "Android",
  "os_version": "16",
  "evidence_reference": "qa/2026-07-14/homepage-primary-android.json",
  "event_log_attached": true,
  "notes": "Полная цепочка пройдена."
}
```

## Требования к passed

Статус `passed` допустим только при наличии:

- точной даты и времени ISO;
- браузера;
- операционной системы;
- ссылки или внутренней ссылки на подтверждение;
- `event_log_attached=true`.

Подтверждением может быть:

- сохранённый JSON локального analytics debug;
- скриншот результата;
- ссылка на задачу с приложенными материалами;
- путь к безопасному QA-артефакту без персональных данных.

## Требования к failed и blocked

Для `failed` и `blocked` обязательно поле `notes`.

Пример:

```json
{
  "scenario_id": "mortgage_detailed",
  "device": "iphone",
  "status": "failed",
  "tested_at": "2026-07-14T16:00:00.000Z",
  "browser": "Safari",
  "browser_version": "26",
  "os": "iOS",
  "os_version": "26",
  "evidence_reference": "qa/issues/iphone-mortgage-scroll",
  "event_log_attached": true,
  "notes": "Кнопка перекрыта клавиатурой после выбора программы."
}
```

`blocked` используется, когда тест невозможно завершить по внешней причине, например:

- нет нужного устройства;
- страница недоступна;
- браузер не поддерживается;
- отсутствует доступ к тестовому домену.

## Защита данных

В журнале запрещены поля:

```text
name
phone
phone_normalized
email
test_name
test_phone
client_fixation_id
fields_json
message
user_agent
```

Не нужно сохранять тестовое имя, тестовый телефон или полный payload формы. Достаточно обезличенного локального журнала событий.

## Проверка файла

```bash
npm run validate:form-qa-results
```

Validator проверяет:

- связь с существующим сценарием;
- допустимое устройство;
- уникальность пары сценарий/устройство;
- допустимый статус;
- точный ISO-формат времени;
- обязательные сведения об окружении;
- подтверждение для `passed`;
- комментарий для `failed` и `blocked`;
- отсутствие персональных и ограниченных полей;
- размер полной матрицы — 42 слота.

## Отчёт

Markdown:

```bash
npm run qa:form-report
```

JSON:

```bash
npm run qa:form-report -- --format=json
```

CSV:

```bash
npm run qa:form-report -- --format=csv
```

Фильтры:

```bash
npm run qa:form-report -- --device=android
npm run qa:form-report -- --status=not_run
npm run qa:form-report -- --role=primary
npm run qa:form-report -- --format=csv --device=iphone --status=failed
```

Отчёт всегда восстанавливает все 42 слота, даже если файл результатов пока пуст.

## Текущее начальное состояние

Пока ручные проверки не проведены:

```text
recorded_results=0
not_run=42
passed=0
failed=0
blocked=0
```

Это корректный и честный статус проекта.

## CI

Portal guards:

- проверяет структуру журнала;
- генерирует JSON-отчёт;
- требует ровно 42 слота;
- сверяет сумму статусов с общим количеством;
- не позволяет записать `passed` без подтверждения.

## Ограничения

Наличие матрицы и отчёта не означает, что ручное тестирование выполнено.

Статусы меняются только после фактической проверки соответствующего сценария на конкретном устройстве.
