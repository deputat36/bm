# Execution-pack ручного QA форм

Дата обновления: 2026-07-16

## Цель

Сделать 42 ручные проверки воспроизводимыми и одинаковыми на desktop, Android и iPhone.

Канонические файлы:

```text
data/qa/form-scenarios.json
data/qa/form-results.json
data/qa/form-execution-contract.json
```

Генератор:

```text
node tools/build-form-qa-execution-pack.mjs
node tools/build-form-qa-execution-pack.mjs --format=json
node tools/build-form-qa-execution-pack.mjs --device=android
```

## Важное ограничение

Сгенерированный execution-pack не является доказательством тестирования.

Слот считается выполненным только после добавления фактической обезличенной записи в:

```text
data/qa/form-results.json
```

Отсутствующая запись всегда означает:

```text
not_run
```

## Объём

```text
14 сценариев
× 3 устройства
= 42 слота
```

Дополнительно выполняются шесть проверок устойчивости:

```text
localStorage unavailable × 3 устройства
sessionStorage unavailable × 3 устройства
```

## Что проверяется в каждом слоте

1. Открылась нужная форма по правильному якорю.
2. `form_id`, роль формы, тип заявки и объект соответствуют сценарию.
3. Required-поля и перевод фокуса работают.
4. Телефон: 9/10/15/16 цифр.
5. Телефонная клавиатура и autocomplete на мобильном устройстве.
6. Select, textarea и остальные контролы доступны.
7. Dry-run не создаёт реальный лид.
8. Есть обязательная последовательность локальных событий.
9. В event log и evidence нет персональных значений и `user_agent`.
10. Повторный параллельный submit блокируется.
11. Status-region понятен, а кнопка восстанавливается после ошибки или dry-run.

В execution-contract это хранится как десять формальных slot-checks; идентичность формы входит в проверку открытия целевого слота.

## Телефонные границы

Для каждого слота проверяются:

```text
9 цифр  → отклонить
10 цифр → принять
15 цифр → принять
16 цифр → отклонить
```

Допустимое форматирование:

```text
+
пробелы
скобки
дефисы
точки
```

## Аналитика dry-run

Обязательные события:

```text
lead_form_view
lead_form_start
lead_submit
lead_submit_classified
lead_thankyou_view
```

Проверяются:

- `form_id`;
- `form_role`;
- `lead_type`;
- объект;
- placement;
- отсутствие персональных значений;
- отсутствие двойного submit.

Локальная проверка не заменяет GA4 DebugView и Яндекс Метрику. Рабочие счётчики остаются отдельным manual gate.

## Evidence

Для `passed` нужны:

- обезличенный screenshot или screen recording;
- обезличенный локальный event log;
- браузер и версия;
- ОС и версия;
- `evidence_reference`;
- `event_log_attached=true`.

Запрещено сохранять:

- имя;
- телефон;
- email;
- ID фиксации реального клиента;
- текст обращения;
- `fields_json`;
- `user_agent`.

## Проверки storage

На каждом устройстве отдельно имитируется недоступность:

```text
localStorage
sessionStorage
```

Ожидаемое поведение:

- страница загружается;
- телефонная проверка работает;
- форма не зависает;
- dry-run не отправляет внешний запрос;
- отсутствие sessionStorage не создаёт вечную блокировку cooldown.

## Guard

```text
tools/validate-form-qa-execution-pack.mjs
.github/workflows/form-qa-execution-pack-guard.yml
```

Guard проверяет:

- 14 сценариев;
- 3 устройства;
- 42 слота;
- 10 slot-checks;
- 6 storage-сценариев;
- dry-run параметры;
- отсутствие сетевой отправки и storage-записи в генераторе;
- отсутствие персональных данных;
- отсутствие ложного утверждения о прохождении QA.

## Что не выполнено автоматически

- физический desktop QA;
- Android QA;
- iPhone QA;
- реальная доставка заявки;
- проверка фактического письма;
- GA4 DebugView;
- Яндекс Метрика;
- перевод manual gates в `passed`.
