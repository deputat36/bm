# Автоматический desktop browser QA

## Назначение

Workflow `Desktop form browser QA` выполняет существующую матрицу `data/qa/form-scenarios.json` в headless Chromium.

Он не создаёт второй список форм и не заменяет ручную панель `tools/form-qa-runner.html`.

## Что проверяется

- 14 уникальных desktop-сценариев;
- подробная форма Аэродромной 18Г запускается дважды;
- открытие целевого `form_id` по `#quick-lead` или `#lead`;
- обязательная валидация и перевод фокуса;
- границы телефона: 9 и 16 цифр отклоняются, 10 и 15 принимаются;
- `inputmode` и `autocomplete` телефона;
- доступность select, input и textarea;
- dry-run без запроса к `newbuild-lead`;
- пять обязательных событий конкретной формы;
- заполненные `form_id`, `form_role`, `lead_type`, `object_id` и нормализованный `placement`;
- один канонический `lead_submit`;
- отсутствие PII и `client_fixation_id` в event log;
- `storage_fail=local` и `storage_fail=session`;
- восстановление кнопки, `aria-busy` и отсутствие вечного cooldown после отказа storage.

## Безопасность

Каждый URL обязательно содержит:

```text
lead_test=dry-run
analytics_test=debug
test_ack=1
```

Runner считает ошибкой любую попытку запроса к Supabase Edge Function `newbuild-lead` и блокирует внешние XHR/fetch-запросы.

Тестовые имя, телефон и email создаются только во время исполнения. Они не записываются в artifact, console summary или репозиторий.

Artifact содержит только:

- обезличенные скриншоты после reset или на test thank-you;
- отфильтрованные события целевой формы;
- технические результаты проверок;
- page path без query;
- сведения о Chromium-runner.

## Режимы запуска

### Pull request и push в main

Проверяется локальная статическая версия текущего checkout:

```text
http://127.0.0.1:4173
```

### Ручной production-run

В `workflow_dispatch` разрешён только HTTPS-домен:

```text
https://novostroyki-borisoglebsk.ru
```

Runner дополнительно проверяет allowlist хоста.

## Evidence и честная маркировка

Результат workflow — автоматизированная desktop Chromium-эмуляция. Это не физическое устройство и не доказательство Android/iPhone QA.

Workflow не изменяет автоматически:

- `data/qa/form-results.json`;
- `data/release/manual-gates.json`;
- issue #151;
- launch-readiness statuses.

Перед обновлением реестров artifact должен быть просмотрен. Новый результат сохраняется отдельным датированным evidence-набором; материалы `evidence/qa/2026-08-03/` не переписываются.

## Локальный запуск

```bash
npm install --no-save playwright@1.55.0
npx playwright install chromium
QA_BASE_URL=http://127.0.0.1:4173 QA_START_SERVER=1 node tools/run-form-browser-qa.mjs
```

Результат появится в:

```text
artifacts/form-browser-qa/
```
