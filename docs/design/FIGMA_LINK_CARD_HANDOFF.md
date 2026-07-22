# Figma Link Card Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Страница:

`21 Component · Link Card`

## Назначение

Link Card — полностью кликабельная карточка перехода в раздел портала. Она используется там, где заголовок и краткое описание уже достаточно объясняют следующий маршрут.

Компонент не добавляет отдельную кнопку и не превращает карточку в рекламный баннер.

## Варианты

4 варианта:

- Layout: `Desktop`, `Mobile`;
- State: `Default`, `Hover`.

Размеры:

- Desktop — 384 × 192 px;
- Mobile — 336 × 180 px.

## Component properties

- `Title` — TEXT;
- `Description` — TEXT.

Маршрут не является component property. На экземпляре составного экрана он сохраняется через shared plugin data:

```text
namespace: portal-v2
key: route
```

## Визуальный контракт

Компонент использует:

- `surface/primary`;
- `border/default`;
- `border/strong`;
- `text/primary`;
- `text/muted`;
- `Effects/Card`;
- `Effects/Card Hover`;
- `Typography/H3`;
- `Typography/Body`.

Hover усиливает border и shadow, но не меняет смысл карточки и не добавляет неподтверждённую информацию.

## Контентные правила

Допустимые примеры:

- «Ипотека»;
- «Семейная ипотека»;
- «Господдержка и обмен»;
- «Застройщики»;
- «Справочник покупателя»;
- «Новости и обновления».

Запрещено использовать карточку для обещаний:

- гарантированного одобрения ипотеки;
- конкретной ставки без проверки;
- подтверждённого наличия квартиры;
- фиксированной цены;
- гарантии применения программы господдержки.

Формулировка по семейной ипотеке:

`Проверка актуальных условий программы на момент обращения.`

## Генератор

```bash
node tools/figma/generate-portal-v2-link-card-components.mjs
```

Итоговый JavaScript запускается отдельным вызовом `Figma.use_figma` после Foundations.

Параметр навыков:

```text
skillNames: resource:figma-use,resource:figma-generate-library
```

## Visual QA

После физического запуска в Figma:

1. проверить 4 варианта;
2. проверить ширины 384 и 336 px;
3. проверить переносы длинных описаний;
4. проверить Default и Hover;
5. проверить TEXT properties;
6. убедиться, что отдельного CTA нет;
7. записать page ID, root ID и ComponentSet ID в issue №116.

До Visual QA компонент считается подготовленным в GitHub, но не завершённым в Figma.