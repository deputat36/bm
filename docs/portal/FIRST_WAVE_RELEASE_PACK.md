# Первая управляемая волна трафика

Дата: 2026-08-16

Статус: подготовлена, но заблокирована campaign-launch gates. Фактических публикаций нет.

## Почему используются общие посадочные страницы

Три приоритетные объектные карточки всё ещё зависят от source/legal/publication gates. Поэтому первая волна не использует object-specific кампании.

Выбраны только два безопасных оффера:

1. общий подбор новостройки;
2. ипотечная консультация по новостройке.

Оба ведут в существующий primary-конверсионный контур и не обещают цену, наличие или статус конкретного объекта.

## Подготовленные placements

План содержит пять уникальных placement IDs:

```text
vk_city_community_catalog_01
vk_realtor_page_catalog_01
telegram_city_channel_catalog_01
office_qr_catalog_01
vk_city_community_mortgage_01
```

Каждый generated URL наследует канонический UTM campaign и дополнительно содержит уникальный `placement`.

Планируемая площадка, дата, стоимость и owner пока не заполнены, потому что эти параметры относятся к фактическому ручному решению о публикации.

## Обязательные gates

Используется профиль `campaign_launch` из `tools/build-launch-readiness-report.mjs`:

```text
form_manual_qa
mobile_qa_release_policy
lead_operations_approval
real_lead_delivery
live_analytics_debug
legal_owner_review
campaign_links_prepared
campaign_publication_approval
```

Пока хотя бы один gate blocked, placement не может получить `approved_to_publish`.

### Почему mobile QA имеет два отдельных gate

`mobile_qa_release_policy` отвечает только на вопрос, какое правило выпуска утверждено владельцем:

- подтверждённая Android/iPhone emulation достаточна для controlled launch; или
- реальные Android и iPhone обязательны до campaign launch.

Этот gate не является доказательством физического теста и не подменяет `form_manual_qa`.

`form_manual_qa` по-прежнему строится из фактического исторического `data/qa/form-results.json`. Пока отдельный review не изменит его semantics на основании валидного owner decision, поздние browser-emulation прогоны не переписывают старые failed/blocked результаты.

Если владелец выберет обязательные физические устройства, `mobile_qa_release_policy` сможет стать passed после корректного утверждения policy, но `form_manual_qa` останется blocked до отдельного physical-device evidence.

Если владелец выберет emulation sufficient, всё равно нужен отдельный review/PR перед изменением semantics `form_manual_qa`; сам policy contract не повышает этот gate.

## Где хранится факт публикации

`data/marketing/first-wave.json` — только план.

Фактическая публикация должна быть записана отдельно в `data/marketing/campaign-publications.json` с внешним URL, временем и evidence. Отсутствие записи означает отсутствие факта публикации.

## Monitoring plan

После разрешённого запуска:

- первые 10 обращений — ручной quality review;
- после 30 обращений — первый пересчёт rates;
- ключевые protected outcomes: received, contacted, qualified, consultation_started.

Placement должен быть остановлен или переведён в review при нарушении доставки/атрибуции, owner/SLA, legal/source gates или при проблемном трафике.

## Команды

```bash
node tools/validate-first-wave.mjs
node tools/build-first-wave-pack.mjs
node tools/build-first-wave-pack.mjs --format=json
node tools/build-launch-readiness-report.mjs --format=json
```
