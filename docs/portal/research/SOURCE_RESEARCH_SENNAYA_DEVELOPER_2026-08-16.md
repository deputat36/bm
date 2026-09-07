# Сенная 76 — candidate developer identity

Первоначальный scan: 16.08.2026  
Последнее обновление: 07.09.2026

## Результат

Точный primary developer/legal-entity source по дому `ул. Сенная, 76` не найден.

Secondary/industry discovery устойчиво указывает candidate:

```text
ИП Тарасов М.К.
ИП Тарасов Максим Константинович
candidate ИНН: 360400764470
```

ИНН теперь можно использовать как точный поисковый идентификатор для ГИС ОГД, муниципальных документов и иных primary registries.

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

### 4. Object-specific рекламная публикация — legal advertiser clue

Источник:

`https://segodnyazavtra.ru/borisoglebsk/borisoglebsk-podslushano/erid-2vtzquh6wizmalchishki-i-devchonki-a-takzhe-ikh-roditeli-za-shkolnoy-549289/`

В публикации рекламируется именно новый дом на улице Сенной, 76. В рекламной маркировке указан:

```text
Рекламодатель: ИП Тарасов М.К.
ИНН: 360400764470
```

Класс источника: secondary publication carrying object-specific advertising disclosure.

Эффект:

- даёт exact candidate ИНН для дальнейшего primary search;
- усиливает связь candidate entity с рекламированием точного объекта;
- НЕ доказывает, что рекламодатель является застройщиком, правообладателем, продавцом каждой квартиры или заявителем по разрешению.

ERID/advertiser disclosure не подменяет разрешение, ЕГРН, ввод, project declaration или иной primary object record.

### 5. Corporate identity cross-check

Публичные corporate directories связывают ИНН `360400764470` с:

```text
ИП Тарасов Максим Константинович
ОГРНИП candidate clue: 306360421600026
регион: Воронежская область / Борисоглебск
```

Эти directories используют открытые государственные данные, но в portal evidence остаются secondary identity cross-check, а не primary object source.

ОГРНИП разрешено использовать как поисковый clue; публиковать его как подтверждённый реквизит developer объекта нельзя до первичного подтверждения.

### 6. РИА «Глас-Медиа» — роль представителя

Источник:

`https://ria-glas.ru/2024/blagoustroistvo/novyj-dom-na-ulicze-sennaya-76-chto-za-fasadom/`

Интервью связывает Андрея Федотова с ролью главного инженера компании-застройщика объекта, но юридическое лицо не называет.

## Primary search по новому идентификатору

07.09.2026 выполнен дополнительный поиск по:

```text
адрес: г. Борисоглебск, ул. Сенная, 76
candidate ИНН: 360400764470
candidate name: Тарасов Максим Константинович
```

в индексируемом контуре ГИС ОГД/официальных региональных источников.

Exact object-level primary record с номером разрешения, вводом, кадастровой привязкой или ролью candidate entity не получен.

Отсутствие индексируемого результата не считается доказательством отсутствия записи.

## Почему статус остаётся unresolved

Ни один найденный источник не даёт одновременно:

- первичный/официальный object-level документ;
- точное юридическое лицо/ИП;
- связь этого лица с адресом Сенная 76 в юридической роли;
- разрешительную, кадастровую, commissioning или project-declaration привязку.

Поэтому official developer portfolio scope остаётся:

```text
scan_status=entity_unresolved
link_status=unresolved_developer_entity_scope
publication_effect=none
```

`data/research/source-collection.json` намеренно не повышается: задача `sennaya_76_developer_entity` имеет `authority=primary_required`.

## Следующий primary query set

Следующий прямой recheck должен использовать одновременно:

```text
Сенная 76
360400764470
Тарасов Максим Константинович
306360421600026  # candidate-only search clue
```

И искать совпадение минимум по одному из типов документа:

- разрешение на строительство;
- разрешение на ввод;
- официальный ГИС ОГД object record/export;
- кадастровый/муниципальный документ с exact address/plot;
- официальный документ о правах/продавце;
- иной primary record, явно связывающий entity и объект.

## Что может закрыть gap

Достаточным основанием может стать один из вариантов:

- разрешение на строительство/ввод с exact address/plot и заявителем;
- официальный реестровый object card с developer/rightsholder identity;
- кадастровый/муниципальный документ, связывающий entity и объект;
- официальный developer document с exact address и проверяемым юридическим лицом.

До этого `ИП Тарасов М.К. / Максим Константинович`, ИНН `360400764470` и ОГРНИП `306360421600026` — только research identifiers; developer/publication status не повышается.
