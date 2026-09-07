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
6. source collection отдельно синхронизирован с multi-house project set.

Для многодомового ЖК чтение одного дома не означает, что весь проект можно моделировать одним `object_id`.

## Теллерманов сад / Просторная 4А

На 7 сентября 2026 года первичный контур наш.дом.рф показывает, что ЖК «Теллерманов сад» — проект из двух домов по адресу Просторная 4А.

Зафиксирован набор ЕИСЖС:

```text
72480 — 70 квартир
72481 — 124 квартиры
Итого — 194 квартиры
```

Первичные evidence в dedicated scan включают:

- официальный городской project listing Борисоглебска;
- официальный профиль застройщика в реестре;
- точную индексируемую карточку дома `72481`, которая связывает дом с ЖК «Теллерманов сад» и адресом Просторная 4А.

Это согласуется с verification-профилем:

```text
buildings_total=2
complex_apartments_total=194
```

## Canonical project model — reconciled

После текущего изменения `data/projects/tellermanov-sad.json` больше не смешивает один дом и весь ЖК.

Верхний уровень хранит параметры комплекса:

```text
model_scope=residential_complex
buildings_total=2
apartments_total=194
nash_dom_rf_ids=[72480,72481]
```

House-level данные вынесены в `houses[]`.

Для `72480` сохраняются ранее собранные рабочие характеристики 70-квартирного дома, но поскольку exact EISЖS card этого дома отдельно не прочитана, они явно маркированы:

```text
detail_status=working_copy_requires_house_level_recheck
```

Для `72481` сохраняются только сведения, которые dedicated primary scan уже может связать с точной карточкой.

Диапазон площадей и квартирография 72480 больше не используются как характеристики всего комплекса.

`data/projects/index.json` также хранит complex-level итог `194`, а `area_min/area_max` остаются `null`, пока оба дома не reconciled на house level.

## Что ещё не завершено

Canonical project model уже reconciled, но `data/research/source-collection.json` всё ещё содержит историческую single-ID задачу `prostornaya_4a_eiszh_project_card` с expected `72480`.

Поэтому dedicated scan остаётся:

```text
status=primary_project_set_read_reconciliation_required
canonical_model_reconciled=true
source_collection_reconciliation_required=true
publication_effect=none
```

Оставшийся Tellermanov gap теперь только:

```text
reconcile_tellermanov_source_collection_project_set
```

Source task нельзя автоматически перевести в `accepted`, пока его acceptance criteria не будут согласованы с первичным multi-house evidence и не перестанут требовать только одну exact-card 72480.

## House/complex regression guard

`tools/validate-project-house-model.mjs` связывает четыре слоя:

- canonical project;
- project index;
- verification claims;
- dedicated EISЖS scan.

CI должен отклонить минимум три регрессии:

- `70` квартир снова объявлены итогом всего ЖК;
- из `nash_dom_rf_ids` потерян один дом;
- house-level диапазон площадей перенесён на complex level.

Guard также не позволяет canonical reconciliation автоматически менять `is_public_ready=false`.

## Аэродромная 18Г и Сенная 76

После повторного поиска 7 сентября 2026 года exact primary EISЖS cards для этих двух priority projects не приняты.

Состояние сохраняется как:

```text
no_exact_primary_match_in_search
```

а не как «объекта нет в ЕИСЖС».

Отсутствие поисковой выдачи не является доказательством отсутствия реестровой записи.

Если конкретный объект юридически не относится к ЕИСЖС/ДДУ-контуру, gap может быть закрыт эквивалентным первичным документом о его реальном статусе, но не вторичным объявлением.

## City-wide reconciliation

7 сентября 2026 года обнаружен первичный городской listing Борисоглебска в контуре наш.дом.рф. В нём отображается несколько проектных записей города, включая оба дома «Теллерманова сада».

Наличие primary listing улучшает discovery, но само по себе ещё не означает `citywide_primary_reconciliation_complete=true`.

Для завершения необходимо:

- сопоставить каждую запись listing с `priority/reference/candidate` registry;
- сохранить exact object IDs и адреса;
- исключить дубли многодомовых проектов;
- отдельно учесть объекты, которые могут быть представлены эквивалентными первичными источниками, а не ЕИСЖС.

## Completion

`eiszh_scan_complete=true` разрешён только если:

- unresolved EISЖS scan gaps отсутствуют;
- citywide primary reconciliation отдельно подтверждена;
- все target observations имеют accepted primary content либо эквивалентный primary evidence;
- source collection и dedicated scan синхронизированы.

## Что scan не меняет

Даже прочитанный primary project/house set сам по себе не:

- снимает legal/media gates;
- подтверждает актуальную цену или наличие;
- разрешает рекламу;
- снимает `noindex`, если другие critical gates остаются blocked;
- подтверждает продавца конкретной квартиры;
- разрешает перенос house-level характеристик на весь комплекс.

`publication_effect=none` сохраняется на уровне scan.
