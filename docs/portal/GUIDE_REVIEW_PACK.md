# Review-пакет материалов справочника

## Цель

Создать воспроизводимый процесс редакционной и юридической приёмки восьми материалов без автоматического присвоения статусов `passed` и без снятия `noindex`.

Канонические файлы:

```text
data/content/guide-review-contract.json
data/content/guide-review-results.json
data/content/guides.json
```

## Объём проверки

```text
материалов: 8
редакционных задач: 8
юридических задач: 7
всего задач: 15
записано результатов: 0
не выполнено: 15
```

Юридическая проверка отмечена как `not_applicable` только для практического материала о выборе планировки. Это не отменяет его редакционную проверку.

## Редакционный чек-лист

Каждый материал проверяется по восьми критериям:

1. один основной поисковый интент;
2. согласованность title, description, H1 и содержания;
3. ответ пользователю до второстепенных деталей;
4. читаемость и навигация;
5. соответствие утверждений принятым источникам;
6. релевантность CTA;
7. качество языка;
8. безопасная внутренняя перелинковка.

## Юридический чек-лист

Для семи юридически значимых материалов проверяются десять критериев:

1. независимое позиционирование портала;
2. справочный дисклеймер;
3. актуальные источники;
4. отсутствие гарантий;
5. отсутствие фактов о конкретных объектах;
6. отсутствие неподтверждённых динамических данных;
7. точность описания договорной схемы;
8. осторожность в вопросах оплаты и полномочий продавца;
9. корректность ссылок и атрибуции;
10. отделение проверки текста от решения об индексации.

## Формат результата

Результат добавляется в массив:

```text
data/content/guide-review-results.json
```

Минимальная структура:

```json
{
  "guide_id": "guide-documents-check",
  "review_type": "editorial",
  "status": "passed",
  "reviewer_reference": "role:content_editor",
  "checked_at": "2026-07-16",
  "check_results": {
    "single_search_intent": true,
    "title_description_alignment": true,
    "answer_first_structure": true,
    "readability_and_navigation": true,
    "source_claim_alignment": true,
    "cta_relevance": true,
    "language_quality": true,
    "internal_linking": true
  },
  "evidence": [
    {
      "type": "pull_request",
      "reference": "pulls/123",
      "note": "Редакционная проверка и исправления"
    }
  ],
  "notes": ""
}
```

## Правила `passed`

Статус `passed` требует одновременно:

- все обязательные проверки имеют значение `true`;
- указан `reviewer_reference` в формате `role:` или `secure_reference:`;
- указана дата;
- приложено минимум одно evidence;
- результат относится к зарегистрированному материалу;
- тип проверки применим к материалу.

Сам результат не меняет `data/content/guides.json`. Перевод `editorial_review` или `legal_review` в `passed` выполняется отдельным PR после проверки evidence.

## Статусы `failed` и `blocked`

Они требуют:

- полного набора результатов проверок;
- роли или защищённой ссылки проверяющего;
- даты;
- пояснения в `notes`;
- исправлений или решения блокера до повторной проверки.

## Защита данных

В репозитории запрещены:

```text
имя проверяющего
телефон
email
персональные идентификаторы
payload заявок
user_agent
секреты и ключи доступа
```

Используются только роли или защищённые ссылки:

```text
role:content_editor
role:legal_reviewer
secure_reference:review-system/guide-123
```

## Автоматические проверки

Validator:

```text
tools/validate-guide-review-pack.mjs
```

Генератор:

```text
tools/build-guide-review-pack.mjs
```

Workflow:

```text
.github/workflows/guide-review-pack.yml
```

Команды:

```bash
npm run validate:guide-review-pack
npm run guides:review-pack
node tools/build-guide-review-pack.mjs --format=json
node tools/build-guide-review-pack.mjs --format=csv
```

## Текущий статус

```text
review-pack создан
фактические проверки не выполнены
редакционно принято: 0/8
юридически принято: 0/7
index_ready: 0/8
noindex: сохраняется
```

Генерация чек-листа не является evidence и не меняет готовность справочника к индексации.
