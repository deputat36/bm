# Mobile browser emulation evidence — 9 августа 2026

## Результат

После PR #158 автоматизированная browser-приёмка успешно выполнена для двух мобильных эмуляционных профилей:

- Android Chromium — Playwright Pixel 7;
- iPhone WebKit — Playwright iPhone 13.

Оба профиля выполнили 14 уникальных сценариев, 15 browser-прогонов с двойной проверкой подробной формы Аэродромной 18Г и два storage-failure сценария.

## Проверенный результат

Для Android и iPhone отдельно подтверждено:

- 15/15 browser-прогонов passed;
- `storage_fail=local` — passed;
- `storage_fail=session` — passed;
- endpoint requests — 0;
- external data requests — 0;
- console errors — 0;
- page errors — 0;
- privacy violations — 0;
- 35 файлов artifact: 18 JSON + 17 PNG.

## Источник

- PR: #158;
- source head: `664d8f37be853fa97f7786cf01e6b6dbde2d08a9`;
- merge commit: `eaa9a148b0d5bee48b400f4a4fb8d07e54e9673a`;
- workflow run: `31311291478`;
- Android artifact ID: `9037468129`;
- Android digest: `sha256:c2934cab4c200ff42d1c7db0779715bc3e4b6da37f4282eb928f3e29d5e46acb`;
- iPhone artifact ID: `9037473847`;
- iPhone digest: `sha256:9ce758a34d03b2e040ae2d18af3b3a687d99901e1440ce501ddce1a54e17a42e`.

Оба ZIP digest повторно подтверждены после скачивания.

## Состав evidence

- `manifest.json` — классификация, результаты и SHA-256 каждого файла обоих исходных artifacts;
- `event-contexts.json` — агрегированный обезличенный контекст 17 event logs каждого профиля.

Бинарные PNG не дублируются в Git, но их размеры и SHA-256 зафиксированы в manifest.

## Честная классификация

Это эмуляция, а не физические устройства:

- `physical_device=false`;
- Android использует Chromium + Pixel 7 device descriptor;
- iPhone использует WebKit + iPhone 13 device descriptor;
- manual gate физического mobile QA не повышается;
- `data/qa/form-results.json` с историческими результатами от 3 августа не переписывается.

Эта проверка подтверждает совместимость браузерного контура и форм с мобильными профилями, но не заменяет физический тест устройства, если он потребуется отдельным release gate.
