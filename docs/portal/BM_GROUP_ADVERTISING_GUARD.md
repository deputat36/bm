# BM Group advertising guard

Дата: 2026-08-09

Основание: `CONTRACT_AD_AUDIT_2026-07-01.md`.

## Что уже мигрировано

Портал больше не использует старый single-project домен `tellermanovsad.ru` как публичный адрес.

Два проблемных legacy URL:

```text
/kvartiry-ot-zastroyschika-borisoglebsk/
/spisok-ozhidaniya/
```

больше не содержат старый объектный/рекламный контент. До выпуска подтверждённых server 301/308 они сохранены только как нейтральные `noindex,follow` transition pages на городской каталог.

Это соответствует общей миграционной модели проекта: не оставлять устаревший контент, но и не превращать старый URL в 404 до решения `hosting_redirect_format`.

Портал сохраняет нейтральный домен `novostroyki-borisoglebsk.ru` и независимое позиционирование.

## Требования к двум transition pages

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

После определения hosting redirect syntax эти stubs можно заменить server 301/308 отдельным release-изменением с сохранением query/UTM.

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

## Почему object campaigns могут оставаться в UTM registry

`prostornaya_4a_vk_launch` и `prostornaya_4a_telegram_launch` — это подготовленные campaign definitions. Само наличие записи не означает, что реклама опубликована.

Факт публикации существует только при записи в `data/marketing/campaign-publications.json`.

До written approval covered-object publication там должна отсутствовать.

## Written approval

`data/legal/bm-group-advertising-contract.json` хранит только status/evidence reference/scopes, но не текст договора или приватную переписку.

До фактического согласования:

```text
status=requires_external_written_approval
evidence=[]
approved_scopes=[]
```

После получения подтверждения допустимы HTTPS/repository/issue/secure references и только явно согласованные scopes.

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

## Команда

```bash
node tools/validate-bm-contract-advertising.mjs
```

После любого изменения BM-related campaign/publication/legal copy или двух legacy transition pages этот guard должен оставаться зелёным.
