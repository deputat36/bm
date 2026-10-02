# STATUS портала novostroyki-borisoglebsk.ru

Дата обновления: 2026-10-02

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

## Milestone 27.09.2026

После статуса от 10.09 в `main` закрыты дополнительные доказанные P1 gaps без повышения owner/legal/source/publication state.

### Buyer journey / conversion

Issue #230 завершена через PR #231–#237:

- CTA комнатности на главной передаёт выбранный сценарий в форму;
- карточки объектов передают конкретный вопрос пользователя;
- header/hero CTA предзаполняют очевидный intent;
- public copy очищен от внутренней launch/validation терминологии;
- имя сделано необязательным только в 7 primary-формах; phone/context остаются обязательными;
- browser QA подтверждает primary submit без имени на desktop/Android/iPhone emulation;
- same-page CTA placement сохраняется до lead/thank-you context без storage/query/cookie.

### Legacy / URL governance

PR #239 вывел 30 unmanaged single-project lead URL из рабочего lead-контура:

- URL сохранены как нейтральные `noindex,follow` transition pages;
- старые формы, old-domain canonical и single-project lead context удалены;
- маршруты направляют пользователя в актуальный каталог, карточку, ипотеку или контакты;
- automatic JS/meta-refresh redirect не включён.

PR #244 удалил конфликтующий `data/pages/legacy-redirects.json`.

Единственный machine-readable source of truth:

```text
data/migration/legacy-routes.json
```

Canonical registry содержит 54 legacy routes; `npm run validate`, redirect preview и URL inventory используют один и тот же реестр.

### CI / production delivery

PR #241 обновил production GitHub Pages workflow до Node 24-compatible official Actions.

PR #246 обновил 11 core CI workflows:

```text
actions/checkout@v7
actions/setup-node@v7
actions/upload-artifact@v7
```

Post-merge `main` runs прошли успешно; прежний `Node.js 20 is deprecated` warning в core validation отсутствует.

Production Pages deploy для актуального `main` подтверждён на:

```text
https://novostroyki-borisoglebsk.ru/
```

Отдельный infrastructure blocker #242: GitHub сейчас запускает custom Pages workflow и managed `pages build and deployment` параллельно. Для устранения дубля требуется owner/admin setting в GitHub Pages; кодом это не подменяется.

### Figma

Повторная проверка issue #116 от 27.09.2026: Figma MCP Starter по-прежнему блокирует даже `get_metadata` месячным tool-call limit.

Новых подготовительных Figma PR не создавать: execution/visual-QA/source-map packs уже подготовлены. Следующий Figma шаг — только после восстановления MCP-доступа.

## Milestone 02.10.2026

После milestone 27.09 в `main` закрыты дополнительные SEO/CI governance gaps без повышения owner/legal/source/publication state.

### Sitemap / indexability

PR #254:

- `/` и `/contacts/` получили фактический `lastmod=2026-09-27`;
- sitemap preview больше не подставляет текущую дату как ложный freshness signal;
- static validator сверяет page registry ↔ sitemap и требует присутствия всех published/indexable URL.

PR #257:

- 31 unmanaged HTML route, обходивших page registry, переведены в `noindex,follow`;
- canonical на старый `tellermanovsad.ru` удалены из затронутых страниц;
- static validator запрещает повторное появление unmanaged indexable routes.

PR #259:

- `robots.txt` синхронизирован с meta-robots model: legacy/noindex URL не блокируются от crawl только ради robots-level Disallow;
- поисковый робот может увидеть `noindex`, не создавая конфликт между crawl blocking и deindexing contract.

### CI runtime

PR #260 завершил migration оставшихся workflows на Node 24-compatible official Actions и добавил fail-closed guard, запрещающий возврат deprecated Actions major.

### SEO guides

PR #262 синхронизировал все 8 подготовленных guide routes с `data/pages/index.json` и HTML-картой сайта.

Machine-state:

```text
guides=8
editorial_passed=8
source_verified_or_not_applicable=8
legal_passed=0
legal_not_applicable=1
index_ready=1
index_blocked=7
```

Это не является разрешением SEO release: `guide_content_publication` и `seo_guide_indexing` остаются blocked.

### Figma recheck 01.10

`get_metadata` снова смог прочитать файл и подтвердил только страницу `00 Cover`.

Но `get_design_context` и `use_figma` продолжают возвращать Starter MCP tool-call limit. Следовательно, #116 остаётся execution-blocked: metadata-access частично восстановлен, write/design-context доступ не восстановлен.

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

Legacy transition pages технически безопасны. После #239 unmanaged lead-форм на 30 старых URL больше нет; после #244 существует один canonical migration registry. Server redirect release остаётся отдельным hosting/release действием и требует фактического 301/308 capability/evidence.

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
