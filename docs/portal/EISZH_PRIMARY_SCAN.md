# ЕИСЖС / наш.дом.рф — primary project scan Борисоглебска

Дата первоначального scan: 2026-08-09  
Последнее обновление: 2026-09-07

## Цель

`data/research/eiszh-primary-scan.json` отделяет несколько уровней evidence, которые нельзя смешивать:

1. публичный маршрут карточек ЕИСЖС существует;
2. известен candidate object ID;
3. сторонняя площадка маркирует ЖК как проверенный наш.дом.рф;
4. прочитан первичный project/house listing и установлена идентичность объекта;
5. canonical project model приведён в соответствие первичному набору домов;
6. source collection синхронизирован с multi-house project set;
7. house-level детали отдельно принимаются только там, где есть достаточный primary evidence;
8. citywide listing reconciliation означает сопоставление отображаемых записей с portal registry, но не доказывает полноту всего городского инвентаря.

Для многодомового ЖК чтение одного дома не означает, что весь проект можно моделировать одним `object_id` или переносить характеристики одного дома на весь комплекс.

## Теллерманов сад / Просторная 4А

На 7 сентября 2026 года первичный контур наш.дом.рф показывает, что ЖК «Теллерманов сад» — проект из двух домов по адресу Просторная 4А.

Зафиксирован набор ЕИСЖС:

```text
72480 — 70 квартир
72481 — 124 квартиры
Итого — 194 квартиры
```

Первичные evidence включают:

- официальный городской project listing Борисоглебска;
- официальный профиль застройщика в реестре;
- точную индексируемую карточку дома `72481`, которая связывает дом с ЖК «Теллерманов сад» и адресом Просторная 4А.

Это согласуется с verification-профилем:

```text
buildings_total=2
complex_apartments_total=194
```

## Canonical project model — reconciled

`data/projects/tellermanov-sad.json` больше не смешивает один дом и весь ЖК.

Верхний уровень хранит параметры комплекса:

```text
model_scope=residential_complex
buildings_total=2
apartments_total=194
nash_dom_rf_ids=[72480,72481]
```

House-level данные вынесены в `houses[]`.

Для `72480` сохраняются ранее собранные рабочие характеристики 70-квартирного дома, но exact EISЖS card этого дома отдельно не прочитана. Поэтому они остаются:

```text
detail_status=working_copy_requires_house_level_recheck
```

Для `72481` сохраняются сведения, которые dedicated primary scan уже может связать с точной карточкой.

Диапазон площадей и квартирография 72480 не используются как характеристики всего комплекса. `data/projects/index.json` хранит complex-level итог `194`, а `area_min/area_max` остаются `null`, пока оба дома не reconciled на house level.

## Source collection — project set accepted

`data/research/source-collection.json` больше не описывает ЕИСЖС как single-ID задачу 72480.

Task `prostornaya_4a_eiszh_project_card` сохранён ради стабильного ID, но его смысл обновлён до:

```text
source_type=eiszh_project_set
status=accepted
object_ids=[72480,72481]
buildings_total=2
apartments_total=194
```

Acceptance основан на первичном city listing + official developer registry profile + exact card 72481.

Это acceptance уровня project identity / house set. Оно НЕ означает, что непрочитанная exact-card 72480 подтверждает этажность, площади, квартирографию или другие house-level детали.

Dedicated scan фиксирует:

```text
status=accepted_primary
canonical_model_reconciled=true
source_collection_reconciliation_required=false
acceptance_gaps=[]
publication_effect=none
```

Tellermanov source/project-set gap закрыт.

## House/complex regression guard

`tools/validate-project-house-model.mjs` связывает:

- canonical project;
- project index;
- verification claims;
- dedicated EISЖS scan;
- source collection.

CI отклоняет, в частности, следующие регрессии:

- `70` квартир снова объявлены итогом всего ЖК;
- из `nash_dom_rf_ids` потерян один дом;
- house-level диапазон площадей перенесён на complex level;
- accepted source снова свёрнут до одного object ID.

Guard не позволяет reconciliation автоматически менять `is_public_ready=false`.

## Аэродромная 18Г и Сенная 76

На 7 сентября 2026 года exact primary EISЖS cards для этих двух priority projects не приняты.

Состояние сохраняется как:

```text
no_exact_primary_match_in_search
```

а не как «объекта нет в ЕИСЖС».

Отсутствие объекта в текущем city listing или поисковой выдаче не является доказательством отсутствия реестровой записи и не определяет юридический статус объекта.

Если конкретный объект юридически не относится к ЕИСЖС/ДДУ-контуру, gap может быть закрыт эквивалентным первичным документом о его реальном статусе, но не вторичным объявлением.

## City-wide reconciliation — 7/7 записей сопоставлены

7 сентября 2026 года первичный городской listing ЕИСЖС / наш.дом.рф для Борисоглебска содержит семь house/project entries. Все семь записей теперь сохранены в `citywide_primary_listings[].entries` и сопоставлены с уже существующими registry entities без создания дублей:

```text
34882 → reference: evropeyskiy-proekt-invest
25033 → reference: uyutnyy-voronezh-grad
32931 → reference: uyutnyy-voronezh-grad
72480 → priority: tellermanov-sad
72481 → priority: tellermanov-sad
39663 → reference: evropeyskiy-proekt-invest
33426 → reference: aerodromnaya-32-aleks
```

Два entry `72480` и `72481` являются двумя домами одного ЖК «Теллерманов сад». Два entry `25033` и `32931` входят в уже принятую reference-сущность ЖК «Уютный».

Entry `39663` не создаёт новую публичную карточку. Официальный city listing связывает его с ООО СЗ СТРОЙАРТ и 51 квартирой, а независимый project-level cross-check связывает соответствующий 51-квартирный корпус с ЖК «Европейский». Поэтому для citywide entity reconciliation он относится к `evropeyskiy-proekt-invest`, но exact public address этого entry не повышается в reference-карточку без отдельного primary address evidence.

Для dated listing `eiszh_borisoglebsk_city_listing_2026-09-07` validator требует точный набор object IDs:

```text
34882, 25033, 32931, 72480, 72481, 39663, 33426
```

Пропуск любого entry, дублирование ID или mapping на неизвестную portal entity делает reconciliation невалидным.

Текущее состояние:

```text
citywide_primary_listing_available=true
citywide_primary_reconciliation_complete=true
```

## Что означает citywide reconciliation

`citywide_primary_reconciliation_complete=true` означает только следующее: все семь записей, которые были отображены данным официальным city listing на дату проверки, учтены и entity-resolved внутри portal registry.

Это НЕ означает:

- что найдены вообще все многоквартирные дома Борисоглебска с 2018 года;
- что ЕИСЖС city listing содержит все исторические объекты;
- что в нём обязательно отображаются все объекты с иной юридической моделью продажи/строительства;
- что найдены все будущие или планируемые проекты;
- что отсутствие Аэродромной 18Г или Сенной 76 доказывает отсутствие этих объектов в реестрах;
- что `research_queue_complete`, `inventory_complete` или общий completeness claim можно переключить в `true`.

Поэтому `data/research/city-catalog-coverage.json` по-прежнему сохраняет:

```text
completeness_claim_allowed=false
research_queue_complete=false
```

## Completion

`eiszh_scan_complete=true` разрешён только если одновременно:

- citywide primary listing reconciliation подтверждена;
- все три priority target observations имеют accepted primary content либо эквивалентный primary evidence;
- source collection и dedicated scan синхронизированы;
- unresolved target gaps отсутствуют.

Сейчас citywide listing reconciliation уже завершена, но accepted target observations остаются `1/3`: Аэродромная 18Г и Сенная 76 не resolved.

Поэтому итог dedicated scan остаётся:

```text
status=partial_access_limited
citywide_primary_reconciliation_complete=true
eiszh_scan_complete=false
completion_claim=not_allowed
```

## Что scan не меняет

Даже accepted primary project/house set или reconciled city listing сами по себе не:

- снимают legal/media gates;
- подтверждают актуальную цену или наличие;
- разрешают рекламу;
- снимают `noindex`, если другие critical gates остаются blocked;
- подтверждают продавца конкретной квартиры;
- разрешают перенос house-level характеристик на весь комплекс;
- разрешают заявлять полноту городского каталога.

`publication_effect=none` сохраняется на уровне scan.
