# ЕИСЖС / наш.дом.рф — primary project scan Борисоглебска

Дата первоначального scan: 2026-08-09  
Последнее обновление: 2026-09-07

## Цель

`data/research/eiszh-primary-scan.json` отделяет несколько уровней evidence, которые нельзя смешивать:

1. публичный маршрут карточек ЕИСЖС существует;
2. известен candidate object ID;
3. сторонняя площадка маркирует ЖК как проверенный наш.дом.рф;
4. прочитан первичный project/house listing и установлена идентичность объекта;
5. canonical source/project model приведён в соответствие первичному набору домов.

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

Это согласуется с уже существующим verification-профилем, где подтверждены:

```text
buildings_total=2
complex_apartments_total=194
```

При этом canonical project/source data исторически смешивает уровень одного дома и всего комплекса:

```text
source collection expected object_id=72480
project data nash_dom_rf_id=72480
project data apartments_total=70
verification complex_apartments_total=194
```

Поэтому dedicated EISZhS scan фиксирует состояние:

```text
status=primary_project_set_read_reconciliation_required
primary_content_read=true
object_identity_match=true
publication_effect=none
```

Это сильнее прежнего `candidate_exact_id_unread`, но ещё не является автоматическим разрешением менять публичные house-level характеристики. Следующий шаг — отдельно привести canonical source/project model к явной структуре `project → houses 72480 + 72481`.

## Почему source task не повышается автоматически

`data/research/source-collection.json` остаётся отдельным источником истины для acceptance/public readiness. Пока его single-ID задача и canonical project data не переработаны согласованно, dedicated scan не может самовольно сделать задачу `accepted`.

Guard требует, чтобы legacy `72480` входил в обнаруженный house set, и запрещает принять source task, пока `reconcile_tellermanov_two_house_project_model` остаётся blocking gap.

## Аэродромная 18Г и Сенная 76

Даже после повторного поиска 7 сентября 2026 года exact primary EISZhS cards для этих двух priority projects не приняты.

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

- unresolved EISZhS scan gaps отсутствуют;
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
