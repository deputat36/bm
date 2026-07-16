# Единый реестр материалов справочника

## Цель

Реестр делает выпуск SEO-контента управляемым и отделяет наличие HTML-страницы от разрешения на индексацию.

Канонический файл:

```text
data/content/guides.json
```

## Что хранится для каждого материала

- уникальный ID;
- путь и canonical;
- один основной поисковый интент;
- тема;
- дата проверки содержания;
- статус источников;
- принятые ссылки на источники;
- редакционный статус;
- юридический статус;
- статус индексации;
- ожидаемое количество tracked CTA;
- разрешённые analytics placement.

## Статусы источников

```text
requires_source_review
verified_on_date
not_applicable
```

`verified_on_date` требует:

- дату проверки;
- минимум одну HTTPS-ссылку;
- наличие этой ссылки в самой статье.

`requires_source_review` не позволяет хранить дату и источник как уже принятые.

## Статусы проверки

```text
requires_review
passed
not_applicable
```

Используются отдельно для редакционной и юридической проверки.

`passed` допускается только при наличии соответствующей evidence-записи в:

```text
data/content/guide-review-results.json
```

## Индексация

```text
blocked
ready
```

`ready` допускается только когда:

1. редакционная проверка имеет статус `passed`;
2. юридическая проверка имеет статус `passed` или `not_applicable`;
3. источники имеют статус `verified_on_date` или `not_applicable`;
4. принято отдельное решение по sitemap и Article schema.

Сам реестр не снимает `noindex` и не редактирует sitemap.

## Текущее состояние

```text
материалов: 8
готово к индексации: 0
заблокировано: 8
источники проверены: 7
источник не применим: 1
редакционно принято: 1
юридически принято: 0
```

Редакционно принят материал:

```text
как проверить кадастровый номер квартиры и выписку ЕГРН
```

Evidence:

```text
docs/portal/reviews/GUIDE_EGRN_EDITORIAL_REVIEW_2026-07-16.md
```

Это не является юридическим заключением или разрешением на индексацию. Для статьи сохраняются:

```text
legal_review=requires_review
indexing_status=blocked
noindex,follow
```

Остальные семь материалов сохраняют `editorial_review=requires_review`.

## Автоматические проверки

Validator:

```text
tools/validate-guide-content-registry.mjs
```

Отчёт:

```text
tools/build-guide-content-report.mjs
```

Workflow:

```text
.github/workflows/guide-content-registry.yml
```

Validator проверяет:

- точный набор зарегистрированных материалов;
- уникальность интентов, путей и canonical;
- существование HTML-файлов;
- обязательный `noindex,follow`;
- отсутствие статьи в sitemap;
- отсутствие самостоятельных форм и контактных полей;
- отсутствие Article schema до готовности;
- отсутствие названий приоритетных объектов;
- наличие карточки в `/guides/`;
- соответствие tracked CTA и placement реестру;
- присутствие принятых источников в статье;
- невозможность поставить `ready` без всех проверок.

## Команды

```bash
npm run validate:guide-content
npm run guides:content-report
node tools/build-guide-content-report.mjs --format=json
node tools/build-guide-content-report.mjs --format=csv
```

## Ограничения

Реестр не является юридическим заключением и не подтверждает публикацию.

Запрещено:

- ставить `passed` без фактической проверки и evidence;
- добавлять источник только в JSON без ссылки в статье;
- снимать `noindex` при `indexing_status=blocked`;
- добавлять персональные данные;
- использовать сведения конкретного объекта в общем справочнике;
- считать наличие страницы завершённым SEO-запуском.
