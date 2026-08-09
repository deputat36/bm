# Reference catalog runtime contract

Дата фиксации: 2026-08-09

## Назначение

Справочная часть каталога показывает подтверждённые новые дома Борисоглебска, которые не входят в три приоритетных lead-объекта. Она должна расширять городской охват портала, но не превращать каждый справочный объект в отдельную продающую посадочную страницу.

Источник данных: `data/research/reference-projects.json`.

Публичный контейнер: секция `#reference` в `catalog/index.html`.

Runtime: `assets/js/reference-catalog.js`.

## Fail-closed публикация

Карточка может быть отрисована только если одновременно:

- `commercial_role=reference_catalog`;
- `verification_status=confirmed`;
- `is_public_ready=true`;
- есть минимум один публичный источник.

Неподтверждённый объект не должен появляться в интерфейсе только потому, что он добавлен в research queue или упомянут во вторичном источнике.

## Lead routing

Reference-объекты не получают отдельную project-consultation форму.

CTA «Подобрать новостройку» ведёт к существующей общей форме `catalog_priority_selection` и передаёт объект как reference-context:

- `residential_complex_id=reference:{id}`;
- `reference_object_id`;
- `reference_object_name`;
- `reference_object_address`.

Это сохраняет единый лидогенерационный контур и не создаёт ложного впечатления отдельного официального отдела продаж конкретного дома.

## Источники

Публичная карточка может показывать ссылку на первый зарегистрированный источник. Внешняя ссылка открывается в новой вкладке с `noopener noreferrer`.

Текущие цены, наличие, акции, ипотечные условия и продавец не выводятся из reference registry без отдельного подтверждённого коммерческого контура.

## Автоматическая защита

`npm run validate:reference` проверяет не только JSON, но и связь трёх слоёв:

1. publication rules и карточки в `data/research/reference-projects.json`;
2. наличие reference-секции и общей lead-form в `catalog/index.html`;
3. fail-closed фильтр, общий lead-route, hidden context и безопасную source-link логику в `assets/js/reference-catalog.js`.

Количество reference-объектов намеренно не захардкожено: каталог должен безопасно расширяться после принятия новых источников.
