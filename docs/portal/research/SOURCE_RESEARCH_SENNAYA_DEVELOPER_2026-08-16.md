# Сенная 76 — candidate developer identity, 16.08.2026

## Результат

Точный primary developer/legal-entity source по дому `ул. Сенная, 76` не найден.

При этом secondary discovery теперь даёт устойчивый candidate:

```text
ИП Тарасов М.К.
```

Это НЕ accepted developer identity и НЕ разрешение публиковать builder/developer claim как подтверждённый факт.

## Evidence

### 1. Этажи — карточка точного объекта

Источник:

`https://borisoglebsk.etagi.com/zastr/jk/zhilojj-kompleks-na-sennojj-76-50449/`

На странице точного ЖК на Сенной 76 застройщик указан как `ИП Тарасов М.К.`.

Класс источника: secondary marketplace / real-estate directory.

Эффект: candidate only.

### 2. Яндекс Недвижимость — независимый secondary cross-check

Источник:

`https://realty.yandex.ru/borisoglebsk/sravnenie-novostroek/`

Сравнение новостроек Борисоглебска отдельно показывает объект `по ул. Сенная, 76` и указывает застройщика `ИП Тарасов М.К.`.

Класс источника: independent secondary directory.

Эффект: усиливает candidate consensus, но не заменяет primary evidence.

### 3. 1С — identity clue

Источник:

`https://solutions.1c.ru/projects/1381349/`

Отраслевой кейс 1С идентифицирует в Борисоглебске:

```text
ИП Тарасов Максим Константинович
```

и описывает деятельность, связанную с недвижимостью и строительством.

Класс источника: industry identity clue.

Эффект: помогает раскрыть вероятное полное имя `М.К.`, но источник НЕ связывает предпринимателя с домом Сенная 76.

### 4. РИА «Глас-Медиа» — роль представителя

Источник:

`https://ria-glas.ru/2024/blagoustroistvo/novyj-dom-na-ulicze-sennaya-76-chto-za-fasadom/`

Интервью связывает Андрея Федотова с ролью главного инженера компании-застройщика объекта, но юридическое лицо не называет.

## Почему статус остаётся unresolved

Ни один найденный источник не даёт одновременно:

- первичный/официальный object-level документ;
- точное юридическое лицо/ИП;
- связь с адресом Сенная 76;
- разрешительную, кадастровую, commissioning или project-declaration привязку.

Поэтому official developer portfolio scope остаётся:

```text
scan_status=entity_unresolved
link_status=unresolved_developer_entity_scope
publication_effect=none
```

`data/research/source-collection.json` в этом change-set намеренно не повышается: задача `sennaya_76_developer_entity` имеет `authority=primary_required`.

## Что может закрыть gap

Достаточным основанием может стать один из вариантов:

- разрешение на строительство/ввод с exact address/plot и заявителем;
- официальный ЕИСЖС/реестровый object card с developer identity;
- кадастровый/муниципальный документ, связывающий entity и объект;
- официальный developer portfolio/document с exact address и проверяемым юридическим лицом.

До этого `ИП Тарасов М.К. / Максим Константинович` — только research candidate.
