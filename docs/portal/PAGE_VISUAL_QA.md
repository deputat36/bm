# Page visual QA

`Page visual QA` — воспроизводимый browser-level контур визуальной проверки всех buyer-facing страниц портала, на которых зарегистрированы активные lead forms.

## Источник покрытия

Канонический список форм находится в `data/qa/form-scenarios.json`.

Сейчас в нём 14 сценариев на 7 уникальных страницах:

- главная `/`;
- каталог `/catalog/`;
- Просторная 4А `/catalog/prostornaya-4a/`;
- Аэродромная 18Г `/catalog/aerodromnaya-18g/`;
- Сенная 76 `/catalog/sennaya-76/`;
- контакты `/contacts/`;
- ипотека `/ipoteka/`.

`tools/run-page-visual-qa.mjs` fail-closed сверяет эти пути с `data/qa/page-visual-qa.json`. Если новая страница с формой появится в form registry, но не будет добавлена в visual QA, проверка должна упасть.

## Browser profiles

Каждая из 7 страниц проверяется в трёх профилях:

1. desktop Chromium `1440×1100` — full-page screenshot;
2. mobile Chromium `390×844` — full-page screenshot;
3. iPhone 13 WebKit emulation — viewport screenshot.

Итого ожидается 21 screenshot.

Для iPhone WebKit используется viewport screenshot, потому что длинный full-page bitmap при DPR 3 может превышать лимит WebKit. Это ограничение относится только к PNG: DOM-проверки, document height, horizontal overflow, mobile-nav geometry и sticky CTA выполняются по всей отрендеренной странице.

## Автоматические проверки

Runner:

- поднимает локальную static-копию checkout;
- проверяет HTTP render и обязательные текстовые markers;
- сверяет 7 visual-QA paths с уникальными `page_path` из form registry;
- фиксирует browser `pageerror`;
- измеряет horizontal overflow документа;
- на mobile Chromium и iPhone WebKit проверяет отсутствие внутреннего horizontal overflow/clipping верхней навигации;
- проверяет, что при активной mobile lead bar она видима, а дублирующий header CTA скрыт;
- отключает анимации перед screenshot для стабильного evidence;
- сохраняет console errors в summary;
- запрещает обращения к `/functions/v1/newbuild-lead` и падает, если visual run попытался отправить live lead;
- не заполняет и не отправляет формы.

Horizontal overflow больше 1 px, clipped mobile-nav links, duplicate mobile header CTA и любой browser `pageerror` являются failure.

## Artifact

Workflow `.github/workflows/page-visual-qa.yml` публикует:

```text
artifacts/page-visual-qa/
  summary.json
  screenshots/*.png
```

`summary.json` содержит в том числе:

```text
lead_page_paths
capture_count
browser_profiles
max_horizontal_overflow_px
max_mobile_nav_overflow_px
clipped_mobile_nav_links
duplicate_mobile_header_cta_count
blocked_live_lead_requests
```

Artifact хранится 14 дней и предназначен для visual review PR, а не для публикации на сайте.

## Workflow triggers

Visual QA запускается при изменениях:

- главной и `catalog/**`;
- `contacts/**`;
- `ipoteka/**`;
- UI CSS;
- relevant JS mobile/main layer;
- form scenarios;
- visual-QA contract/runner/runbook/workflow.

Так изменение любой из семи lead-bearing страниц не может обойти screenshot-контур.

## Что этот QA НЕ доказывает

Browser/device emulation не является:

- physical-device QA;
- доказательством успешной реальной отправки формы;
- legal approval;
- source verification;
- разрешением снять `noindex`;
- разрешением рекламной публикации;
- performance/Lighthouse evidence.

Он дополняет, но не заменяет Form browser QA, mobile release policy и release gates.

## Рекомендуемый процесс UI PR

1. Изменить UI в отдельном PR.
2. Дождаться `Page visual QA` и остальных guards.
3. Проверить summary и screenshots затронутых страниц/профилей.
4. Исправлять только фактические композиционные/адаптивные дефекты.
5. Не повышать manual/source/legal/publication status на основании screenshots.
