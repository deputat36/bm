# Figma Content Card Handoff

Figma-файл:

`https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX`

Продолжает issue №116 и Phase 4 Design System v2.

## Страница

`17 Component · Content Card`

## ComponentSet

`Content Card` содержит 8 вариантов:

- Layout: `Desktop`, `Mobile`;
- Purpose: `Selection`, `Outcome`;
- State: `Default`, `Hover`.

## Назначение

### Selection

CTA-карточка для выбора комнатности или другого понятного направления.

Размеры:

- Desktop — 384 × 292 px;
- Mobile — 336 × 280 px.

Использует один вложенный Button:

- Context: `Light`;
- Type: `Primary`;
- State: `Default`.

Button помечен как `exposed instance` через `isExposedInstance = true`. Это позволяет менять его `Label` на экземпляре Content Card без фиктивного TEXT-свойства родительского компонента.

### Outcome

Информационная карточка результата консультации.

Размеры:

- Desktop — 284 × 224 px;
- Mobile — 336 × 210 px.

Отличия:

- собственного CTA нет;
- используется вертикальный акцент;
- акцент собран из `status/verified` и `amber/500`;
- hardcoded gradient и HEX не используются.

## Component properties

Реально связаны с видимыми слоями:

- `Title` — TEXT;
- `Description` — TEXT;
- `Show action` — BOOLEAN.

Текст CTA меняется через `Label` exposed Button instance.

## Production-сценарии

Selection применяется для:

- 1-комнатных квартир;
- 2-комнатных квартир;
- 3-комнатных квартир.

Outcome применяется для:

- подходящих объектов;
- финансового сценария;
- проверенных данных;
- следующего шага.

## Юридически безопасные правила

Content Card не сообщает как подтверждённый факт:

- актуальную цену;
- наличие конкретной квартиры;
- ставку или одобрение ипотеки;
- срок строительства;
- гарантированный результат консультации.

Selection ведёт к подбору, а не к бронированию или фиксации цены.

Outcome описывает возможную пользу разговора, а не обещанный результат.

## Генератор

```bash
node tools/figma/generate-portal-v2-content-card-components.mjs
```

Команда выводит JavaScript для отдельного вызова `Figma.use_figma`.

Параметр навыков:

```text
skillNames: resource:figma-use,resource:figma-generate-library
```

## Порядок запуска

1. Foundations.
2. Button.
3. Content Card.
4. `18 Screen · Homepage Apartments & Outcomes`.

Content Card нельзя запускать раньше Button.

## Visual QA

После физического запуска в Figma:

1. проверить 8 вариантов;
2. проверить ширины 384, 284 и 336 px;
3. проверить Default и Hover;
4. проверить Selection и Outcome;
5. проверить Title, Description и Show action;
6. проверить exposed Button instance;
7. изменить Label CTA на всех трёх комнатных карточках;
8. проверить вертикальный акцент Outcome;
9. убедиться, что скрытый CTA не оставляет пустой визуальный блок;
10. проверить переносы русских текстов;
11. записать page ID, root ID и component set ID в issue №116.

До Visual QA компонент считается подготовленным в GitHub, но не завершённым в Figma.