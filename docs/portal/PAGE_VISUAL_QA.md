# Page visual QA

`Page visual QA` — воспроизводимый browser-level контур для визуальной проверки ключевых buyer-facing страниц портала после изменений HTML/CSS.

## Покрытие

CI снимает 10 full-page screenshots:

- главная;
- каталог;
- Просторная 4А;
- Аэродромная 18Г;
- Сенная 76;

для двух Chromium viewport:

- desktop `1440×1100`;
- mobile `390×844`.

Источник списка страниц и размеров: `data/qa/page-visual-qa.json`.

## Автоматические проверки

Runner `tools/run-page-visual-qa.mjs`:

- поднимает локальную static-копию checkout;
- проверяет HTTP render и обязательные текстовые markers;
- фиксирует `pageerror`;
- измеряет horizontal overflow;
- отключает анимации перед screenshot для стабильного evidence;
- сохраняет console errors в summary для ручного разбора;
- запрещает обращения к `/functions/v1/newbuild-lead` и падает, если visual run попытался отправить live lead;
- не заполняет и не отправляет формы.

Horizontal overflow больше 1 px и любой browser `pageerror` являются failure.

## Artifact

Workflow `.github/workflows/page-visual-qa.yml` публикует:

```text
artifacts/page-visual-qa/
  summary.json
  screenshots/*.png
```

Artifact хранится 14 дней и предназначен для visual review PR, а не для публикации на сайте.

## Что этот QA НЕ доказывает

Browser screenshots не являются:

- physical-device QA;
- доказательством успешной отправки формы;
- legal approval;
- source verification;
- разрешением снять `noindex`;
- разрешением рекламной публикации;
- performance/Lighthouse evidence.

Он дополняет, но не заменяет существующие Form browser QA, mobile release policy и release gates.

## Рекомендуемый процесс UI PR

1. Изменить UI в отдельном PR.
2. Дождаться `Page visual QA` и остальных guards.
3. Скачать artifact и визуально проверить desktop/mobile screenshots.
4. Исправлять только фактические композиционные/адаптивные дефекты.
5. Не повышать release/source/legal status на основании screenshots.
