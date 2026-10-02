# Готовность справочника к индексации

## Цель

Отделить наличие полезных HTML-материалов от фактического разрешения поисковым системам индексировать их.

Справочник может содержать подготовленные статьи, но они не считаются запущенным SEO-каналом, пока не завершены источники, редакционная проверка, юридическая проверка и отдельное решение владельца.

## Канонические источники

```text
data/content/guides.json
data/content/guide-review-results.json
tools/build-guide-content-report.mjs
tools/build-launch-readiness-report.mjs
```

## Производное ворото

```text
guide_content_publication
```

Область:

```text
seo_guide_indexing
```

Ворото получает статус `passed` только когда одновременно:

1. в реестре есть материалы;
2. каждый материал имеет `indexing_status=ready`;
3. отсутствуют материалы со статусом `blocked`;
4. не осталось `requires_source_review`;
5. каждый материал редакционно принят;
6. каждый материал юридически принят либо юридическая проверка не применима.

## Профиль запуска

```text
seo_guide_indexing
```

Обязательные ворота:

```text
guide_content_publication
legal_owner_review
```

Даже если все статьи получили внутренний статус `ready`, публикация остаётся заблокированной до общего юридического решения владельца.

## Текущее состояние

Актуально на 02.10.2026:

```text
материалов: 8
готово к индексации по individual content registry: 1
заблокировано: 7
источники проверены: 7
источник не применим: 1
редакционно принято: 8
юридически принято: 0
юридическая проверка не применима: 1
```

Индивидуально готов `guide-layout-choice`: source=`not_applicable`, editorial=`passed`, legal=`not_applicable`, indexing_status=`ready`.

Это не означает SEO-публикацию. Производное ворото требует готовности всей очереди, а профиль дополнительно требует owner-level legal approval:

```text
guide_content_publication=blocked
seo_guide_indexing=BLOCKED
```

Остаются обязательными:

```text
юридическая проверка 7 материалов
отдельное решение владельца по legal_owner_review
снятие noindex только после прохождения release gates
добавление sitemap и Article schema отдельным выпуском
```

## Общая готовность портала

Общая численность launch gates не фиксируется в этом документе вручную, чтобы не дублировать производный machine-state. Актуальные значения строятся командой:

```bash
npm run launch:readiness
```

Ключевой для этого документа факт остаётся fail-closed:

```text
seo_guide_indexing=BLOCKED
```

Профиль зависит от `guide_content_publication` и `legal_owner_review`.

## Метрики отчёта

В `metrics.guides` выводятся:

```text
total
index_ready
index_blocked
source_verified
source_review_required
source_not_applicable
editorial_passed
legal_passed
legal_not_applicable
ready
```

Эти метрики не являются аналитикой посещаемости или SEO-эффективности. Они показывают только внутреннюю готовность контента.

## Проверки

```text
tools/validate-guide-launch-gate.mjs
.github/workflows/guide-launch-readiness.yml
```

Команды:

```bash
npm run validate:guide-content
npm run validate:guide-launch-readiness
npm run validate:launch-readiness
```

## Ограничения

Автоматическая проверка не имеет права:

- ставить редакционный или юридический статус `passed` без evidence;
- снимать `noindex`;
- добавлять статью в sitemap;
- добавлять Article schema;
- считать существование или редакционную проверку страницы SEO-запуском;
- заменять юридическую проверку содержания;
- менять рекламные или объектные страницы.
