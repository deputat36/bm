# STATUS портала novostroyki-borisoglebsk.ru

Дата обновления: 2026-09-10

Репозиторий: `deputat36/bm`  
Основная ветка: `main`

## Текущая стадия

Портал находится на стадии технически зрелого, защищённого и визуально готового продукта перед controlled commercial launch.

Это уже не прототип и не этап построения базового каталога. Основные frontend, формы, server lead contour, browser QA, visual QA, accessibility QA, source registries, launch contracts и fail-closed guards реализованы.

При этом полноценный коммерческий запуск ещё НЕ разрешён, потому что остаются фактические owner/legal/operations/source gates и отсутствует одна controlled real lead + live analytics evidence.

Основной принцип остаётся неизменным:

```text
нет достаточного подтверждения → нет повышения source/legal/publication gate
```

Портал является независимым городским каталогом и не позиционируется как официальный сайт застройщика или ЖК.

## Интерфейс и buyer experience

Production UI обновлён в сентябре 2026 года.

В `main` находятся:

- Design System v2 «Городской навигатор»;
- более выразительные hero-блоки главной, каталога и карточек объектов;
- единая система карточек, CTA, форм, статусов проверки и секций;
- адаптивная мобильная навигация без скрытого horizontal-scroll clipping;
- sticky mobile lead bar;
- улучшенные focus states и accessibility layer.

PR #214 выполнил основной visual refinement. PR #221 исправил mobile header по фактическим screenshots. PR #226 устранил два обнаруженных keyboard-focus дефекта: collision focus token и невидимый focus на ghost CTA.

## Формы и lead contour

Канонически работают 14 lead-сценариев на 7 страницах:

```text
/
/catalog/
/catalog/prostornaya-4a/
/catalog/aerodromnaya-18g/
/catalog/sennaya-76/
/contacts/
/ipoteka/
```

На каждой странице используются короткий `primary` и подробный `detailed` сценарии.

Основной server route:

```text
browser form
→ newbuild-lead
→ public.newbuild_leads
```

System of record утверждён:

```text
supabase:newbuild_leads
```

Fail-closed формы, dry-run, server validation, privacy restrictions, duplicate-submit protection и attribution contract защищены CI.

## QA

### Исторический manual registry

`data/qa/form-results.json` остаётся историческим evidence от 2026-08-03 и намеренно не переписывается поздними automated runs.

В нём сохранены первоначальные desktop failures и blocked mobile slots. Они показывают фактическое состояние того запуска QA и не могут быть задним числом превращены в passed.

### Позднее browser evidence

После исправлений отдельно подтверждены:

- production-domain desktop browser automation: 15/15 сценариев + 2/2 storage cases;
- Android Chromium emulation: 15/15 + 2/2;
- iPhone WebKit emulation: 15/15 + 2/2.

Mobile evidence имеет:

```text
physical_device=false
```

и не считается physical-device QA.

### Visual QA

После PR #220–#224 visual QA покрывает все 7 lead-bearing страниц в трёх browser profiles:

```text
7 страниц × 3 profiles = 21 captures
```

Profiles:

- desktop Chromium;
- mobile Chromium;
- iPhone 13 WebKit emulation.

Проверяются document overflow, page errors, mobile-nav clipping, duplicate mobile header CTA и отсутствие live lead requests.

### Accessibility QA

PR #225 добавил axe/WCAG browser audit:

```text
7 страниц × desktop/mobile Chromium = 14 audits
```

Critical/serious violations блокируют CI.

PR #226 добавил keyboard-focus QA:

```text
7 страниц × desktop/mobile Chromium = 14 audits
```

Primary lead form должна быть достижима последовательным `Tab`, а каждый focus target — видим, доступен и иметь обнаружимый focus indicator.

Automated accessibility/keyboard QA не заменяет manual screen-reader или physical-device acceptance.

## Mobile release policy

`data/qa/mobile-release-policy.json`:

```text
status=requires_owner_decision
value=null
```

Допустимые варианты:

```text
emulation_sufficient_for_controlled_launch
physical_android_and_iphone_required_before_campaign_launch
```

До owner decision `mobile_qa_release_policy` остаётся blocked. Решение не должно переписывать исторический `form-results.json`.

## Controlled real lead

`data/release/real-lead-test.json`:

```text
status=requires_explicit_owner_consent_not_executed
execution_enabled=false
approved_by_owner=false
submitted_at=null
record_locator=null
```

Нужны отдельное разрешение владельца, безопасная reference на тестовый контакт, ровно одна production submission и evidence записи в server store.

Dry-run не считается real delivery.

## Operations

Технический operations contour готов:

- server storage;
- automatic triage;
- transition API;
- health-check;
- append-only event history;
- lifecycle/handoff contracts.

`data/operations/lead-operations-approval.json`:

```text
approved=1/8
pending=7/8
operational_activation_enabled=false
```

Утверждён только:

```text
system_of_record=supabase:newbuild_leads
```

Требуют решения владельца:

- primary owner role/secure reference;
- backup owner role/secure reference;
- рабочий календарь и timezone;
- first-response SLA;
- routing policy;
- contact-attempt policy;
- closure reason policy.

Даже после 8/8 решений нужна отдельная explicit activation review.

## Live analytics

Browser analytics contract и локальный debug защищены.

Но manual gate остаётся:

```text
live_analytics_debug=blocked
```

Причина: фактически используемый production GA4/Яндекс Метрика counter/provider и live debug evidence не зафиксированы.

Без этого нельзя считать внешнюю аналитику реально проверенной.

## Источники приоритетных объектов

Все три priority projects сохраняют fail-closed publication readiness. Отдельные accepted sources не означают `is_public_ready=true`.

### Просторная 4А / «Теллерманов сад»

Принято:

- ЕИСЖС multi-house project set;
- project declaration;
- building permit.

ЕИСЖС project set:

```text
72480 — 70 квартир
72481 — 124 квартиры
2 дома / 194 квартиры суммарно
```

Canonical model разделяет complex-level и house-level сведения. Exact-card 72480 отдельно не считается прочитанной, поэтому неподтверждённые house-level детали не повышаются автоматически.

Остаётся critical gap:

```text
media_rights=missing
```

Также object-specific advertising по этому объекту требует отдельного external written approval BM Group и legal/campaign gates.

### Аэродромная 18Г / ЖК «Патриот»

Buyer-facing карточка существует, но critical primary threshold не пройден.

Developer candidate:

```text
ООО «Первая Строительная Компания»
ИНН candidate search key: 3665114243
ОГРН candidate search key: 1153668053076
```

Object-level primary link к 18Г не принят. Marketplace-название «Чкалов» не используется как каноническое название объекта.

Не приняты exact public registry / permit / sale-document / media-rights evidence.

### Сенная 76

Buyer-facing карточка существует с безопасными атрибутированными сведениями, но primary legal/object threshold не пройден.

Candidate search identifiers:

```text
ИП Тарасов Максим Константинович
ИНН 360400764470
ОГРНИП candidate 306360421600026
```

Эти реквизиты являются только search keys. Роль developer/rightsholder/seller не подтверждена object-level primary evidence.

## Permit / commissioning recheck

Запланированный после 01.09.2026 recheck фактически выполнен 07.09.2026.

Результат:

```text
accepted_records=0
source_tasks_closed=0
permit_inventory_scan_complete=false
```

Для региональных/муниципальных разрешений relevant primary route включает ГИС ОГД Воронежской области.

Exact direct registry records по Аэродромной 18Г и Сенной 76 не получены. Отсутствие индексируемого результата не считается доказательством отсутствия разрешения или объекта.

## ЕИСЖС city reconciliation

Официальный городской listing ЕИСЖС, зафиксированный 07.09.2026, содержит 7 entries. Все 7 сопоставлены с существующими priority/reference entities без создания дублей.

Это означает:

```text
citywide_primary_reconciliation_complete=true
```

только для конкретного семиэлементного listing.

Это НЕ означает полный городской inventory.

Аэродромная 18Г и Сенная 76 по-прежнему не resolved exact/equivalent primary evidence.

## Городской inventory

`data/research/city-inventory-method.json`:

```text
status=method_defined_execution_partial
inventory_complete=false
coverage_research_queue_complete=false
unmapped_observations=0
completion_claim=not_allowed
```

Blocking scans:

- primary permit/commissioning registry;
- EИСЖС/equivalent target resolution;
- official developer project scan;
- municipal planning/address scan;
- registry entity reconciliation.

Secondary marketplace/housing-stock sources не могут доказывать полноту города.

## Reference catalog

Публичный reference registry содержит 4 подтверждённых справочных project entities:

- ЖК «Уютный»;
- Аэродромная 29Б;
- Аэродромная 32;
- ЖК «Европейский».

Unresolved candidates остаются в отдельном candidate registry и не рендерятся как подтверждённые карточки.

## SEO guides

`data/content/guides.json` содержит 8 материалов.

Текущее состояние:

```text
editorial_review passed = 8/8
source verified/not-applicable = 8/8
legal requires_review = 7
indexing ready = 1
indexing blocked = 7
```

Практический гайд по выбору планировки имеет content-level `indexing_status=ready`, но фактический SEO release всё равно не должен обходить общий launch/legal contour.

## Traffic launch

`data/marketing/first-wave.json`:

```text
status=prepared_blocked_by_launch_gates
placements=5
offer_variants=2
```

Все placements:

```text
prepared_not_approved
```

`data/marketing/campaign-publications.json`:

```text
publications=[]
```

То есть фактических рекламных публикаций нет.

## Commercial outcomes

Protected outcome model и persistence design подготовлены.

Выбран design-only store:

```text
public.newbuild_commercial_events
```

Но:

```text
production migration=false
production DDL=false
write API deployed=false
event writes=false
```

SQL preview не является deployment.

## Offer feed / history

Current offer feed и append-only history contracts подготовлены.

Выбран design-only history store:

```text
public.newbuild_offer_history_events
```

Но live source, реальные retention/backup policies, hash-chain writer, production migration, history writes и public renderer не активированы.

Актуальные цена/наличие не должны публиковаться без source/freshness/seller/public-readiness gates.

## Legal / BM / legacy

Общий `legal_owner_review` остаётся blocked: не подтверждены фактические operator/requisites, retention/withdrawal policy и финальное юридическое согласование.

BM Group object-specific advertising для Просторной 4А требует external written approval.

Legacy transition pages технически безопасны. Server redirect release подготовлен как state-independent transition, но реальный hosting format/evidence всё ещё нужен для фактического 301/308 выпуска.

## Supabase security

Portal-owned `newbuild_*` scope отделён и защищён CI. Shared CRM/Auth `nav_* / nav_v2_*` warnings находятся вне portal scope и не изменяются из этого проекта без отдельной regression acceptance.

## Главные блокеры полного запуска

1. Owner/legal решения: mobile release policy, legal operator/requisites, retention/withdrawal, operations roles/SLA/routing/attempts/closure reasons.
2. Controlled real lead: разрешение + ровно одна production submission + server evidence.
3. Live analytics: фактический provider/counter и debug evidence без PII/двойного подсчёта.
4. Primary source/media threshold: прежде всего Аэродромная 18Г, Сенная 76 и media rights Просторной 4А.
5. Фактический launch approval: operations activation, campaign publication approval, external targets/owner/date/cost и для object-specific BM scope — written approval.

## Что технически можно продолжать автономно

Допустимо:

- исправлять реальные CI/browser/UX/accessibility regressions;
- поддерживать visual/browser evidence;
- принимать primary sources только при появлении нового exact evidence;
- продолжать municipal/permit/developer inventory только при новом доступе или документе;
- поддерживать machine-readable state и документацию синхронизированными;
- готовить deployment designs без включения production writes;
- улучшать buyer content только из уже разрешённых claims.

Не нужно повторять broad source search без нового trigger и не нужно создавать дополнительные contracts ради самого продолжения разработки.

## Definition of Done

Полная рабочая версия считается готовой только когда одновременно:

1. выбран и применён mobile/manual QA release policy с честным evidence boundary;
2. controlled real lead доказан end-to-end;
3. live analytics debug доказан в фактическом production provider;
4. operations decisions утверждены и отдельно активированы;
5. legal owner review пройден с реальными реквизитами/policies;
6. priority projects имеют достаточный primary/source/media threshold для разрешённых claims;
7. городской inventory завершён по формальной методике либо completeness claim остаётся отключён;
8. разрешённые SEO pages выпущены, заблокированные сохраняют noindex;
9. первая controlled traffic wave реально опубликована с attribution evidence;
10. можно измерить минимум `received → contacted → qualified → consultation` по реальным данным.
