# BM Group advertising guard

Дата: 2026-08-09

Основание: `CONTRACT_AD_AUDIT_2026-07-01.md`.

## Что уже мигрировано

Портал больше не использует старый single-project домен `tellermanovsad.ru` как публичный адрес.

Проблемные legacy routes:

```text
/kvartiry-ot-zastroyschika-borisoglebsk/
/spisok-ozhidaniya/
```

не должны существовать как публичные страницы и не должны входить в sitemap.

Портал сохраняет нейтральный домен `novostroyki-borisoglebsk.ru` и независимое позиционирование.

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

- возвращать legacy problem pages;
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

После любого изменения BM-related campaign/publication/legal copy этот guard должен оставаться зелёным.
