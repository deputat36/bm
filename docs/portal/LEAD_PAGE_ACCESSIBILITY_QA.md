# Lead page accessibility QA

`Lead page accessibility QA` — автоматический browser-level WCAG smoke audit всех страниц, на которых зарегистрированы активные lead forms.

## Покрытие

Источник page coverage — `data/qa/form-scenarios.json`. Runner требует 7 уникальных lead-page paths и дополнительно сверяет их с `data/qa/page-visual-qa.json`.

Проверяются:

- `/`;
- `/catalog/`;
- `/catalog/prostornaya-4a/`;
- `/catalog/aerodromnaya-18g/`;
- `/catalog/sennaya-76/`;
- `/contacts/`;
- `/ipoteka/`.

Каждая страница проходит два Chromium profile:

- desktop `1440×1100`;
- mobile `390×844`.

Итого 14 browser audits.

## Проверки

Runner `tools/run-lead-page-accessibility-qa.mjs` использует `@axe-core/playwright` и WCAG tags:

```text
wcag2a
wcag2aa
wcag21a
wcag21aa
```

CI fail-closed падает при violations с impact:

```text
critical
serious
```

Moderate/minor violations не скрываются: они сохраняются в artifact для последующей оценки, но сами по себе не блокируют PR. Такой порог используется как автоматический regression gate, а не как заявление о полной WCAG-сертификации.

## Safety boundary

Audit:

- работает только на локальной static-копии checkout;
- блокирует `/functions/v1/newbuild-lead`;
- не заполняет и не отправляет формы;
- не меняет production data;
- не повышает manual QA, legal/source/publication status.

## Artifact

Workflow сохраняет `artifacts/lead-page-accessibility-qa/summary.json` на 14 дней.

Для каждого audit записываются:

- page path и viewport;
- число violations;
- serious/critical count;
- axe rule id, impact и help URL;
- ограниченный HTML fragment и failure summary для каждого affected node.

## Что автоматический audit НЕ доказывает

Он не заменяет:

- keyboard-only manual walkthrough;
- screen-reader testing;
- physical-device accessibility QA;
- проверку понятности текстов человеком;
- полную экспертную оценку WCAG;
- legal/source/release approval.

Его задача — не допустить возврата грубых accessibility regressions в buyer-facing и lead-generation интерфейс.
