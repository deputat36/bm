# План автономной работы над порталом

Дата актуализации: 2026-09-10

Репозиторий: `deputat36/bm`  
Рабочая ветка: `main`

## 1. Текущая стадия

Портал больше не находится на этапе создания базового каталога или будущей главной.

На текущем `main` уже существуют:

- production homepage;
- городской каталог;
- три priority buyer-facing cards;
- reference catalog и candidate registry;
- 14 форм на 7 canonical lead pages;
- server lead route → `public.newbuild_leads`;
- fail-closed/dry-run/privacy/attribution контуры;
- browser QA desktop + Android/iPhone emulation;
- visual QA Chromium + WebKit;
- axe/WCAG automated audit;
- keyboard-focus automated audit;
- source/verification/inventory contracts;
- legal/operations/release/traffic contracts;
- Design System v2 и сентябрьский UI refinement.

Текущая стадия:

```text
technical_prelaunch_ready
commercial_release_blocked_by_owner_legal_source_and_live_evidence
```

Главная задача автономной работы теперь — не добавлять бесконечные функции, а сокращать оставшиеся доказуемые gaps, поддерживать качество и не подменять owner/external decisions кодом.

## 2. Главный принцип

Каждый следующий PR должен закрывать один реальный проверяемый gap.

Разрешено продолжать работу только если выполнено хотя бы одно условие:

1. найден фактический bug/regression;
2. есть новый primary evidence;
3. есть новая доступность официального источника;
4. есть machine-state/doc рассинхронизация;
5. есть конкретный CI state-lock/false-green;
6. есть buyer-facing UX/CRO улучшение, которое можно проверить без изменения legal/source claims;
7. owner уже принял решение и его нужно безопасно применить технически.

Запрещено создавать новые contracts/validators/designs только ради видимости прогресса.

## 3. Источники истины

В порядке приоритета:

1. текущий `main`;
2. machine-readable JSON в `data/**`;
3. фактический production/browser evidence;
4. GitHub Actions final-head CI;
5. merged PR evidence;
6. открытые issues;
7. документация.

Если Markdown или issue противоречат machine state, сначала исправляется machine-state рассинхронизация, затем документация.

## 4. Уже закрытые автономные этапы

Не повторять без нового trigger:

### Базовый портал

- production homepage;
- каталог;
- priority cards;
- ипотека;
- контакты;
- guides;
- developers/reference sections;
- legal/privacy pages.

### Формы

- 14 canonical forms;
- primary/detailed roles;
- fail-closed JS behavior;
- dry-run;
- duplicate-submit protection;
- privacy-safe attribution;
- server delivery architecture.

### Browser / visual / accessibility automation

- production desktop automation;
- Android Chromium emulation;
- iPhone WebKit emulation;
- 7-page × 3-profile visual QA;
- mobile-nav regression guard;
- 7-page × 2-profile axe/WCAG audit;
- 7-page × 2-profile keyboard-focus audit.

Эти прогоны повторяются CI при релевантных изменениях, но не считаются physical-device QA.

### Теллерманов сад / ЕИСЖС

- canonical model разделён на residential complex и houses;
- приняты object IDs 72480 + 72481;
- приняты 2 дома / 194 квартиры на project-set уровне;
- городской ЕИСЖС listing 7/7 reconciled.

Не возвращаться к single-ID модели 72480 как модели всего ЖК.

### Permit recheck 01.09.2026

Первый post-01.09 recheck уже выполнен 07.09.2026.

Не повторять одинаковый indexed exact-address search без нового trigger.

Следующий trigger:

- direct GIS OGD access/export;
- новая официальная запись;
- новый exact object/permit/cadastral identifier;
- изменение официального реестра.

## 5. Автономная фаза A — сохранять техническое качество

Priority: P0/P1 при фактической регрессии.

Действия:

1. Следить за final-head CI открытых PR.
2. При падении находить точную причину, а не rerun без анализа.
3. Исправлять реальные browser/keyboard/accessibility/visual дефекты.
4. Не ослаблять guard ради зелёного статуса.
5. Для visual changes смотреть screenshots, а не полагаться только на CSS/static validation.
6. Сохранять Design System token semantics и accessibility focus layer.

Acceptance:

- relevant workflows green;
- нет unresolved review threads;
- browser artifact подтверждает требуемый UX;
- формы/analytics/source/legal contracts не изменились случайно.

## 6. Автономная фаза B — primary sources и городской inventory

Priority: P1.

### Аэродромная 18Г

Текущие candidate search keys:

```text
ООО «Первая Строительная Компания»
ИНН 3665114243
ОГРН 1153668053076
```

Они не являются accepted object-level developer evidence.

Следующее действие выполняется только при новом primary route/evidence:

- direct ГИС ОГД record/export;
- official permit/commissioning record;
- cadastral/object registry record;
- equivalent primary document, точно связывающий entity и 18Г.

### Сенная 76

Candidate search keys:

```text
ИП Тарасов Максим Константинович
ИНН 360400764470
ОГРНИП candidate 306360421600026
```

Advertiser identity не равна автоматически developer/rightsholder/seller identity.

Следующее действие — только exact primary object/entity match.

### Просторная 4А

Primary project/declaration/permit contour существенно закрыт.

Главный автономно неразрешённый source gap:

```text
media_rights
```

Права можно принять только по явному rights evidence. Нельзя выводить разрешение на использование из факта публикации изображения застройщиком.

### City inventory

Сохранять:

```text
inventory_complete=false
completion_claim=not_allowed
```

пока не завершены required primary scans.

Следующие реальные gaps:

- direct permit/commissioning registry access;
- exact/equivalent primary resolution A18G/S76;
- official developer scopes;
- municipal PZZ map appendices / hearing archive;
- unresolved candidate reconciliation.

Secondary marketplace не закрывает completeness.

## 7. Автономная фаза C — buyer UX и CRO

Priority: P1 только при доказуемой пользе.

Допустимо:

- улучшать визуальную иерархию;
- уменьшать friction форм;
- улучшать CTA hierarchy;
- исправлять mobile layout;
- улучшать readability/scanability;
- улучшать accessibility;
- улучшать comparison/navigation;
- усиливать доверие только через уже подтверждённые facts/process transparency.

Нельзя:

- добавлять неподтверждённые цены/наличие;
- усиливать developer-direct wording;
- скрывать verification boundaries;
- заменять source uncertainty маркетинговым обещанием;
- добавлять object-specific campaign claims до readiness.

Любой значимый UI PR проверять через visual QA artifact.

## 8. Автономная фаза D — governance / state-transition integrity

Priority: P1.

Регулярно проверять только при изменениях state contracts:

- нет ли hardcoded current-state locks;
- нельзя ли одним JSON flag получить ложный `passed`;
- deployment не выводится из design-only state;
- source acceptance требует evidence;
- manual/owner gate не повышается из automation;
- publication не выводится из prepared campaign.

Документацию и issues синхронизировать после значимых state transitions.

## 9. Фаза E — owner decisions

Эта фаза НЕ выполняется автономно за владельца.

Требуются фактические решения:

### Mobile/manual QA

Выбрать:

```text
emulation_sufficient_for_controlled_launch
```

или

```text
physical_android_and_iphone_required_before_campaign_launch
```

После решения отдельный PR применяет release semantics, не переписывая историческое evidence.

### Operations

Нужно утвердить 7 оставшихся решений:

- primary owner;
- backup owner;
- schedule/timezone;
- first-response SLA;
- routing;
- contact attempts;
- closure reasons.

После 8/8 решений требуется explicit operational activation.

### Legal

Нужно подтвердить:

- operator/owner requisites;
- retention policy;
- withdrawal/deletion procedure;
- final legal review;
- допустимые рекламные scopes.

### Real lead

Нужно дать explicit permission и secure contact reference для ровно одной production submission.

### Analytics

Нужно указать фактический production analytics provider/counter и дать возможность получить live debug evidence.

### Traffic

Нужно выбрать external targets, owner refs, publish times, costs и дать campaign publication approval.

### BM Group

Для covered object-specific advertising по Просторной 4А требуется external written approval соответствующего scope.

## 10. Фаза F — controlled real launch после owner decisions

Выполнять только когда необходимые gates разрешены.

Порядок:

1. Применить approved mobile/manual QA policy.
2. Применить owner/legal decisions через отдельные reviewed state changes.
3. Активировать operations отдельным explicit step.
4. Выполнить одну controlled real lead.
5. Проверить server record, lifecycle и health before/after.
6. Проверить production live analytics без PII и double counting.
7. Подтвердить campaign launch gates.
8. Разрешить только подготовленные general first-wave placements.
9. Записать фактические publications только после внешней публикации.
10. Начать измерять `received → contacted → qualified → consultation`.

## 11. Фаза G — после первых реальных данных

До появления реальных leads не тратить время на ложную оптимизацию.

После запуска:

- quality review после первых 10 leads;
- rate review после 30 leads;
- анализ source/placement/form_role/object;
- только затем корректировать CTA/forms/traffic mix;
- commercial persistence разворачивать только после operations/security approval;
- offer live source/history writer выбирать по реальному процессу обновления предложений;
- CAC/deal_rate считать только при наличии реального cost/outcome source.

## 12. SEO

8 guides уже editorial/source-ready на уровне реестра.

7 юридически чувствительных guides требуют legal review.

Не создавать массово новые статьи до выпуска существующей очереди и появления search/assisted-conversion evidence.

Снятие `noindex`, sitemap и Article schema — только после соответствующих legal/release gates.

## 13. Figma

Issue #116 остаётся полезным design-handoff backlog, но Figma не является launch-critical blocker для production интерфейса.

Production code/tokens остаются источником истины, пока Figma MCP недоступен или ограничен.

Не ставить Figma sync выше:

- real lead;
- live analytics;
- owner operations;
- legal;
- primary source/media gaps.

## 14. Формат каждого следующего автономного цикла

```text
1. Проверить fresh main/open PR/CI.
2. Выбрать один фактический gap.
3. Убедиться, что он не требует owner decision.
4. Сделать отдельную ветку/маленький PR.
5. Проверить final-head CI.
6. При UI изменении проверить browser artifact.
7. При source изменении проверить exact primary provenance.
8. Слить только доказанно готовый PR.
9. Синхронизировать state/docs/issues, если изменился project state.
10. Перейти к следующему gap только если он реально существует.
```

## 15. Когда автономную работу нужно остановить

Если оставшийся backlog состоит только из:

- owner decisions;
- legal approval;
- external written approval;
- отсутствующего primary evidence;
- physical-device actions;
- реальной заявки;
- live analytics access;
- внешней рекламной публикации;

не создавать техническую работу ради продолжения.

В этой точке нужно выдать владельцу точный decision package и ждать только необходимых решений/evidence.

## 16. Definition of Done

Полная готовность означает одновременно:

```text
technical/browser quality proven
mobile/manual release policy resolved
real lead delivered and verified
live analytics verified
operations approved and activated
legal owner review passed
priority source/media threshold sufficient
city completeness claim only if inventory method completed
SEO released only for approved pages
controlled traffic actually published
real qualified-consultation funnel measurable
```

До выполнения этих условий портал может быть технически качественным и полезным, но не должен называться полностью коммерчески готовым.
