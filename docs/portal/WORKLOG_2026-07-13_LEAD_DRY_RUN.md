# Рабочий журнал: безопасный dry-run заявок

Дата: 2026-07-13

## Выполнено

1. В `assets/js/schema.js` добавлен режим проверки формы без внешней отправки.
2. Режим требует одновременно `lead_test=dry-run` и `test_ack=1`.
3. Обычный обработчик формы останавливается на capture-фазе до отправки в Web3Forms или другой endpoint.
4. Тестовый результат сохраняется только локально в текущем браузере.
5. Тестовый ID имеет префикс `NB-TEST-`.
6. Страница `/spasibo/` различает реальную и тестовую отправку.
7. В dry-run не создаётся событие `lead_thankyou_view`.
8. Добавлена команда `npm run validate:dry-run`.
9. Проверка включена в `Portal guards`.

## Включение

```text
https://novostroyki-borisoglebsk.ru/contacts/?lead_test=dry-run&test_ack=1#lead
```

Обязательный визуальный признак — верхняя полоса о тестовом режиме.

## Что проверяет режим

```text
обязательные поля
согласие на обработку данных
form_id и lead_type
название и ID объекта
локальную фиксацию результата
переход на /spasibo/
мобильную панель и состояния доступности
```

## Что не проверяет режим

```text
доставку email
валидность внешнего сервиса форм
запись в будущую CRM
серверные журналы
боевые события аналитики
```

Для проверки доставки позже потребуется отдельная согласованная реальная тестовая заявка.

## CI-проверка

Для полноценного запуска GitHub Actions был создан PR #17. В процессе обнаружены и исправлены независимые накопленные проблемы:

```text
scripts/check-site.js был несовместим с type=module
в news/index.html была формулировка, не проходившая юридический валидатор
справочник ссылался на legacy-раздел /spravochnik/
реестр медиа содержал ссылки на отсутствующие fallback-файлы
```

После исправлений на итоговом коммите PR успешно завершились:

```text
Portal guards — success
Validate static site — success
Validate static site — success
```

PR #17 объединён в `main` squash-коммитом:

```text
1fa4951c51c1a04e66d53b392bcb7b975533898e
```

## Справочник

В активную структуру добавлены и зарегистрированы страницы:

```text
/guides/proverka-dokumentov-novostroyki/
/guides/proektnaya-deklaratsiya/
/guides/kak-vybrat-planirovku/
```

Они сохраняют `noindex,follow` до редакционной и юридической проверки.

## Связанные файлы

```text
assets/js/schema.js
spasibo/index.html
tools/validate-lead-dry-run.mjs
docs/portal/LEAD_DRY_RUN_QA.md
package.json
.github/workflows/portal-guards.yml
.github/workflows/validate.yml
scripts/check-site.js
guides/index.html
data/pages/index.json
```
