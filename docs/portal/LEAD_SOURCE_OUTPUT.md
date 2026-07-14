# Вывод внутреннего источника заявки

Дата обновления: 2026-07-14

## Цель

Менеджер должен видеть не только целевую форму, но и справочный материал, после которого пользователь решил оставить заявку.

Для этого используются два технических поля:

```text
lead_source
placement
```

Они не содержат имя, телефон, email, комментарий или другой пользовательский ввод.

## Нормализация

`assets/js/main.js` получает значения из существующего tracking-контура:

```text
data.tracking.current.lead_source
data.tracking.current.placement
```

После этого они сохраняются как верхнеуровневые поля:

```text
data.lead_source
data.placement
```

Если внутреннего перехода не было, значения остаются пустыми.

## Где доступны поля

### Читаемый текст письма

В сообщение добавлены строки:

```text
Внутренний источник: internal_content
Размещение перехода: guide_documents_footer
```

### Web3Forms

Поля передаются отдельно:

```text
lead_source
placement
```

Полный `tracking` и `fields_json` также сохраняются для технической сверки.

### Аналитика

Поля зарегистрированы как необязательные измерения событий:

```text
lead_submit
lead_submit_classified
```

Это позволяет строить разрезы:

```text
placement → form_id → form_role → lead_submit
```

`lead_submit_classified` остаётся неаддитивным событием. Его нельзя складывать с `lead_submit` как дополнительную заявку.

## Значения внутренних переходов

```text
lead_source=internal_content
```

Размещения:

```text
guides_hero
news_hero
developers_hero
guide_documents_footer
guide_declaration_footer
guide_layout_footer
```

## Отличие от UTM

Внутренняя навигация не использует:

```text
utm_source
utm_medium
utm_campaign
utm_content
```

Поэтому внешний рекламный источник остаётся в tracking-контексте, а внутренний материал добавляется отдельными полями.

Пример:

```text
utm_source=vk
utm_campaign=portal_catalog
lead_source=internal_content
placement=guide_layout_footer
```

Это означает, что пользователь впервые пришёл из ВКонтакте, затем изучил статью о планировках и после неё открыл короткую форму.

## Защита данных

Запрещено формировать `lead_source` или `placement` из:

```text
name
phone
email
comment
question
```

Поля считаются техническими измерениями и не включают `client_fixation_id`.

## Проверка

Команда:

```bash
npm run validate:lead-source-output
```

Guard проверяет:

- нормализацию из `tracking.current`;
- отдельные строки читаемого письма;
- отдельные поля Web3Forms;
- наличие полей в `lead_submit`;
- наличие полей в `lead_submit_classified`;
- регистрацию в `data/analytics/events.json`;
- отсутствие привязки к персональным полям.

## Ограничения

- фактическая доставка письма не проверялась;
- события не проверялись в рабочем счётчике;
- реальная заявка не отправлялась;
- поля не считаются подтверждением рекламной эффективности до прохождения ручных ворот запуска.
