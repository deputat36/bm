# BM Group advertising guard

Дата актуализации: 2026-08-25

Основание: `CONTRACT_AD_AUDIT_2026-07-01.md`.

## Что уже мигрировано

Портал больше не использует старый single-project домен `tellermanovsad.ru` как публичный адрес.

Два проблемных legacy URL:

```text
/kvartiry-ot-zastroyschika-borisoglebsk/
/spisok-ozhidaniya/
```

больше не содержат старый объектный/рекламный контент. До выпуска подтверждённых server 301/308 они сохранены только как нейтральные `noindex,follow` transition pages на городской каталог.

Портал сохраняет нейтральный домен `novostroyki-borisoglebsk.ru` и независимое позиционирование.

## Текущий hosting/redirect state

В репозитории есть признаки статического deployment (`CNAME`, `.nojekyll`, static frontend), но нет versioned server/origin/edge redirect configuration и нет подтверждённого redirect syntax/runtime для production host.

Поэтому текущий контракт честно остаётся:

```text
status=transition_page
server_redirect_status=blocked_by_hosting_redirect_format
server_redirect.http_status=null
server_redirect.preserve_query=null
server_redirect.hosting_reference=null
server_redirect.evidence=[]
server_redirect_release_still_blocked=true
```

Наличие `CNAME`/`.nojekyll` само по себе не считается доказательством фактического production redirect engine и не разрешает объявить 301/308 выполненным.

## Требования к transition pages до server release

Каждый старый URL обязан:

- содержать `noindex,follow`;
- иметь marker `data-legacy-migration-stub="bm-contract"`;
- иметь canonical `https://novostroyki-borisoglebsk.ru/catalog/`;
- содержать явную ссылку на `../catalog/`;
- не содержать `tellermanovsad.ru`;
- не содержать старое BM/объектное позиционирование;
- не содержать lead-form или контактные поля;
- не содержать client-side auto redirect;
- не содержать факты, площади, ипотечные обещания или ранний список по конкретному ЖК;
- отсутствовать в sitemap.

Client-side meta refresh / `window.location` не считается заменой server release.

## Future server redirect progression

Validator больше не hardcode-ит вечное `blocked_by_hosting_redirect_format`.

Future route может перейти в:

```text
status=server_redirect_released
server_redirect_status=released
```

только при одновременном наличии:

```text
http_status=301|308
preserve_query=true
hosting_reference=<safe evidence reference>
evidence=[...]
checked_at=<date/datetime>
reviewer_reference=role:* | secure_reference:*
```

Разрешённые evidence references следуют общему contract format: HTTPS, repository/docs reference, `issue:*` или `secure_reference:*`.

### Почему `preserve_query=true` обязательно

Legacy URL могут приходить с UTM/attribution query. Server/edge redirect release не должен молча обрезать этот контекст.

### Что происходит со static stubs после verified redirect

После фактического server/edge release допускаются оба безопасных состояния:

1. оставить neutral static stubs как unreachable/fallback content — они по-прежнему обязаны проходить все transition safety checks;
2. удалить static stub files после того, как verified 301/308 работает раньше static origin.

Contract отдельно различает:

```text
legacy_problem_routes_neutralized_as_transition_stubs
legacy_problem_routes_safe_or_redirected
server_redirect_release_still_blocked
```

Так удаление файла после verified redirect не превращается в ложный 404-regression в contract state.

## CI progression tests

`BM contract advertising guard` проверяет:

- текущие transition stubs;
- future 308 fixture с query preservation, hosting/evidence reference и reviewer;
- сохранение отдельного `requires_external_written_approval` для BM advertising даже после redirect release;
- возможность удалить static stubs только после verified redirect fixture;
- отказ для `released` без evidence или с `preserve_query=false`;
- прежние негативные тесты для запрещённых формулировок, old domain, legacy lead form и object publication без written approval.

CI fixture — только тест state machine. `issue:7`, статус 308 и дата fixture не являются доказательством реального production redirect.

## Covered scope

Этот guard применяется только к материалам и фактическим рекламным публикациям, связанным с `prostornaya-4a` / ЖК «Теллерманов сад».

Он не превращает весь городской портал в сайт BM Group и не распространяет договорные ограничения на независимые карточки других объектов без отдельного основания.

## Что блокируется автоматически

В публичном HTML запрещены старый single-project домен и формулировки вроде:

```text
квартиры от застройщика
цены от застройщика
напрямую от застройщика
официальный сайт ЖК
официальный сайт Теллерманов сад
```

Также запрещено:

- возвращать старый объектный контент в два legacy URL;
- снимать `noindex` с Просторной 4А только ради рекламы до остальных gates;
- создавать covered-object paid brand/geo search без письменного approval;
- записывать фактическую VK/Telegram/offline/object publication без matching approval scope;
- считать наличие кампании в `utm-campaigns.json` доказательством её публикации.

## Written approval

`data/legal/bm-group-advertising-contract.json` хранит только status/evidence reference/scopes, но не текст договора или приватную переписку.

Текущий advertising approval остаётся:

```text
status=requires_external_written_approval
evidence=[]
approved_scopes=[]
```

Redirect release и advertising approval — независимые состояния.

Даже verified 301/308 не даёт право публиковать object-specific рекламу. И наоборот, письменное согласование рекламы не доказывает, что legacy redirect реально работает.

После получения BM written approval допустимы только сохранённые safe evidence references и явно согласованные scopes.

Даже written approval не заменяет общие gates:

- `legal_owner_review`;
- `campaign_publication_approval`;
- остальные campaign-launch prerequisites.

## Scope mapping

VK object publication → `vk_object_publication`.

Telegram object publication → `telegram_object_publication`.

Offline/QR object material → `object_specific_qr` или `offline_object_material`.

Paid brand/geo search → `paid_brand_or_geo_search`.

Иные covered-object promotion → `portal_object_page_promotion`.

## Следующий реальный redirect step

1. установить фактический production hosting/origin/edge layer;
2. определить versioned redirect configuration или управляемое правило;
3. настроить оба exact legacy path → `/catalog/`;
4. использовать 301 или 308;
5. сохранить query string;
6. проверить внешним HTTP request оба URL с test UTM query;
7. сохранить безопасный hosting/evidence reference, checked_at и reviewer reference;
8. только затем перевести routes в `server_redirect_released`;
9. после повторного CI при необходимости удалить static stubs.

До этих фактов transition pages остаются правильным fail-closed состоянием.

## Команда

```bash
node tools/validate-bm-contract-advertising.mjs
```

После любого изменения BM-related campaign/publication/legal copy, redirect evidence или двух legacy transition pages этот guard должен оставаться зелёным.
