# Official developer portfolio scan — Борисоглебск

Дата: 2026-08-09

## Назначение

`data/research/official-developer-portfolio-scan.json` фиксирует, что именно удалось подтвердить на собственных публичных каналах уже обнаруженных застройщиков/компаний, и отделяет это от secondary marketplace naming.

Developer portfolio scan — supporting layer Phase C. Он не заменяет permit/commissioning registry, ЕИСЖС, муниципальные документы и object-level verification.

## Правило отсутствия

Если официальный сайт конкретной компании не показывает объект, это не означает, что объекта нет в Борисоглебске.

Если официальный сайт говорит об очереди строительства без адреса, кадастра или разрешительной привязки, такую очередь запрещено автоматически сопоставлять с известной priority-карточкой.

## Текущие scope

### BM Group development — scanned current

Официальный раздел проектов и страница «Теллерманов сад» подтверждают собственный опубликованный проект компании в Борисоглебске.

Каноническая связь:

```text
priority:tellermanov-sad
```

Это portfolio evidence, а не автоматическое разрешение рекламы/индексации.

### ПСК — partial

Официальная страница ПСК подтверждает:

- деятельность по строительству многоквартирных домов в Борисоглебске;
- завершённый и введённый дом Аэродромная 29Б;
- открытые продажи во II и III очередях.

Но адреса II/III очередей на странице не названы. Поэтому:

```text
reference:aerodromnaya-29b-psk = exact official address link
priority:aerodromnaya-18g = candidate entity only
```

Запрещено считать II/III очереди доказательством связи ПСК с Аэродромной 18Г без первичного address/permit evidence.

### ГК «Проект Инвест» / ООО «СЗ «Стройарт» — scanned current

Официальный раздел жилищного строительства показывает ЖК «Европейский» в Борисоглебске и называет застройщика ООО «СЗ «Стройарт».

Каноническая связь:

```text
reference:evropeyskiy-proekt-invest
```

Точные адреса отдельных очередей не повышаются без address-level primary evidence.

### ООО «Воронеж Град» — scanned current

Официальная страница связывает ЖК «Уютный» с адресами:

```text
ул. Уютная, 5А
ул. Дорожная, 50А
```

Каноническая связь:

```text
reference:uyutnyy-voronezh-grad
```

Исторические цены на странице не используются как актуальное коммерческое предложение.

### ООО «Алекс» — current official access unverified

Secondary источники указывают исторический сайт компании и отдельную страницу дома Аэродромная 32, но текущий официальный Borisoglebsk portfolio content не принят как читаемый primary source.

Поэтому существующая reference-карточка Аэродромной 32 сохраняет своё отдельное regulator/bank/industry evidence, а developer portfolio scan остаётся блокирующим.

Пригородная 30А и Студенческий 5 не повышаются из candidate registry.

### Сенная 76 — developer entity unresolved

Публичное интервью РИА «Глас-Медиа» подтверждает, что Андрей Федотов представлен как главный инженер компании-застройщика дома на Сенной 76, и поддерживает атрибутированные заявления о доме.

Однако публикация не называет проверяемое юридическое лицо, ИНН/ОГРН и официальный portfolio channel. Secondary marketplace naming `ИП Тарасов М.К.` не закрывает этот gap.

## Derived состояние

На текущем шаге:

- tracked scopes: 6;
- scanned current: 3;
- blocking scopes: 3 — ПСК, «Алекс», Сенная 76;
- все 3 priority и 4 reference project ID имеют ровно один tracked/unresolved developer scope;
- known scope scan complete = false;
- city developer scan complete = false.

Даже если известные scope будут закрыты, общий developer scan не может стать `passed`, пока upstream primary permit/EISЖС/municipal scans не подтверждают, что не появились новые developer entities, которые ещё не добавлены в реестр.

## Publication boundary

Любая связь в developer scan имеет `publication_effect=none`.

Файл не может сам:

- изменить `developer_id` priority project;
- подтвердить продавца;
- подтвердить договорную схему;
- снять `noindex`;
- разрешить рекламу;
- повысить unresolved candidate в public reference.

## CI

`tools/validate-official-developer-scan.mjs` проверяет:

- HTTPS и дату каждого official/discovery source;
- bounded `supports` у официальных источников;
- соответствие scan status наличию unresolved items;
- ровно одну tracked developer scope для каждого priority/reference project;
- `publication_effect=none` у всех canonical links;
- derived scanned/blocking lists;
- связь с `city-inventory-method.json`;
- невозможность завершить city developer scan до upstream primary discovery.
