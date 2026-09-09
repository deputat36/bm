# Lead page keyboard QA

`Lead page keyboard QA` — browser-level smoke test реального пути пользователя без мыши от начала страницы до primary lead form.

## Покрытие

Runner использует те же 7 canonical lead pages, что form registry, visual QA и accessibility QA. Набор путей должен точно совпадать между `data/qa/form-scenarios.json` и `data/qa/page-visual-qa.json`.

Каждая страница проверяется в двух Chromium viewport:

- desktop `1440×1100`;
- mobile `390×844`.

Итого 14 audits.

## Что проверяется

После загрузки и JS initialization runner последовательно нажимает `Tab` до попадания в primary lead form, максимум 40 раз.

Каждый focus target должен:

- быть реальным интерактивным элементом, а не `body`;
- не быть hidden/inert/`aria-hidden`/disabled;
- полностью находиться в текущем viewport после browser auto-scroll;
- иметь обнаружимый focus indicator (`outline` или `box-shadow`).

Primary lead form должна быть JS-ready, fieldset должен быть enabled и форма должна быть достижима клавиатурой.

## Safety boundary

- local static checkout only;
- live `/functions/v1/newbuild-lead` блокируется;
- значения в формы не вводятся;
- submit не выполняется;
- production data не меняется.

## Что этот QA не доказывает

Это не полная manual keyboard/WCAG проверка. Он не оценивает семантическую логичность каждого шага человеком, screen-reader announcements, switch/voice control и physical-device behavior. Он служит fail-closed regression smoke для видимого focus и достижимости основной формы.
