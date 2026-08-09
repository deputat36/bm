# Методика инвентаризации новостроек Борисоглебска

Дата: 2026-08-09

## Назначение

`data/research/city-inventory-method.json` определяет воспроизводимый путь от текущей карты discovery к обоснованному завершению Phase C.

Методика нужна, чтобы `research_queue_complete=true` никогда не появлялся только потому, что несколько агрегаторов перестали показывать новые результаты.

Она отделяет два разных понятия:

1. полнота исследования городского набора объектов;
2. готовность конкретной карточки к публичной индексации, рекламе или продаже.

Первое может быть завершено при наличии известных unresolved-кандидатов, если они найдены, сопоставлены и честно остаются в candidate registry. Второе по-прежнему зависит от source/legal/media/publication gates каждого объекта.

## Охват

Методика охватывает:

- многоквартирные дома Борисоглебска, построенные примерно с 2018 года;
- другие строящиеся многоквартирные дома;
- публично подтверждённые планируемые проекты.

Непубличные планы и слухи не входят в инвентаризацию до появления официального публичного подтверждения.

## Обязательные слои проверки

### 1. Secondary marketplace discovery

Статус: выполнен как discovery-only.

Используются marketplace-каталоги для поиска названий, адресов и возможных дублей. Этот слой не имеет completeness effect.

### 2. Secondary housing-stock scan

Статус: выполнен с доказанными ограничениями.

Проверенный secondary housing-stock index полезен для исторических адресов и entity resolution, но его список Борисоглебска не содержит независимо известных более новых объектов. Поэтому он не может закрыть completeness.

### 3. Primary permit and commissioning registry scan

Статус: запланирован, не начат.

Обязателен системный проход по разрешениям на строительство и ввод. Текущий recheck plan привязан к 2026-09-01 и не позволяет заранее считать этот scan пройденным.

### 4. ЕИСЖС / эквивалентный primary project scan

Статус: частичный, доступ ограничен.

Нужно сопоставить публичные карточки проектов ЕИСЖС или эквивалентный первичный реестр с Борисоглебском. Известная точная ссылка на Просторную 4А остаётся candidate до чтения первичного содержимого.

### 5. Official developer project scan

Статус: в работе.

Официальные сайты застройщиков используются для собственного опубликованного портфеля. Они подтверждают только то, что прямо опубликовано конкретным застройщиком, и не доказывают отсутствие иных проектов в городе.

### 6. Municipal planning and address scan

Статус: доступ ограничен.

Нужен системный проход по официальным муниципальным/адресным/планировочным публикациям, особенно для публично подтверждённых планируемых проектов.

### 7. Registry entity reconciliation

Статус: в работе.

Каждое обнаруженное наблюдение должно иметь один канонический маршрут:

```text
priority | reference | candidate
```

Дубликаты объединяются, unresolved-объекты остаются candidate, а отсутствие точной связи запрещает publication promotion.

## Условия завершения inventory

`inventory_complete=true` разрешён только если одновременно:

- все scans с `required_for_completion` или `supporting_required` имеют `status=passed`;
- coverage map имеет `unmapped_observations=0`;
- coverage map отдельно переведена в `research_queue_complete=true` после фактического выполнения методики;
- derived blocking list пуст;
- status метода соответствует derived состоянию.

Secondary scans никогда не получают completeness effect и не могут быть `passed` как primary completeness evidence.

## Что завершение inventory не означает

Даже при будущем `inventory_complete=true` автоматически не следуют:

- `is_public_ready=true` для priority projects;
- снятие `noindex`;
- legal approval;
- media rights;
- подтверждение цены или наличия;
- разрешение рекламы;
- promotion unresolved candidate в reference.

Эти контуры остаются независимыми fail-closed gates.

## Текущее состояние

На 9 августа 2026 года:

- secondary marketplace scan — discovery выполнен;
- secondary housing-stock scan — выполнен с known omissions;
- primary permit/commissioning scan — ожидает отдельного прохода не ранее 2026-09-01;
- ЕИСЖС scan — частичный;
- developer scan — в работе;
- municipal scan — ограничен доступом;
- entity reconciliation — в работе;
- `inventory_complete=false`;
- `research_queue_complete=false`;
- `unmapped_observations=0`.

## CI

`tools/validate-city-inventory-method.mjs` проверяет связь метода с текущими реестрами, coverage map и recheck-plan.

Guard обязан падать при попытке:

- вручную объявить inventory завершённым при непройденных scans;
- дать secondary scan completeness effect;
- рассинхронизировать дату permit scan с каноническим recheck plan;
- рассинхронизировать blocking/passed lists;
- выдать future `complete` status без derived evidence.
