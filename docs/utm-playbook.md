# UTM-шаблоны для лидогенерации портала

Документ нужен, чтобы рекламные ссылки по порталу «Новостройки Борисоглебска» размечались единообразно и менеджер видел, откуда пришёл покупатель.

## 1. Обязательные параметры

Минимум для каждой рекламной ссылки:

```text
utm_source=
utm_medium=
utm_campaign=
utm_content=
```

Дополнительно, если заявка закрепляется за специалистом:

```text
realtor=
realtor_id=
manager=
```

Дополнительно, если нужно понять место размещения:

```text
placement=
lead_source=
```

## 2. Рекомендуемые значения

### utm_source

Источник трафика:

```text
vk
telegram
avito
yandex_direct
yandex_maps
2gis
organic
qr
print
offline
partner
```

### utm_medium

Тип размещения:

```text
post
story
banner
cpc
message
link
qr
flyer
poster
profile
```

### utm_campaign

Кампания. Пишем латиницей, без пробелов:

```text
tellermanov_start
waitlist_prices
family_mortgage
apartment_selection
consultation_docs
callback_fast
```

### utm_content

Конкретный креатив или кнопка:

```text
hero_button
price_button
mortgage_card
vk_post_01
telegram_post_01
banner_1200x628
qr_office
```

### utm_term

Используем для ключа или аудитории:

```text
novostroyki_borisoglebsk
kvartira_v_novostroyke
semeynaya_ipoteka
zhk_tellermanov_sad
```

## 3. Ссылки на конкретные формы

Главная страница заявок:

```text
https://tellermanovsad.ru/zayavka/
```

Форма заявки по ЖК:

```text
https://tellermanovsad.ru/zayavka/?utm_source=vk&utm_medium=post&utm_campaign=tellermanov_start&utm_content=price_button#jk
```

Форма ипотеки:

```text
https://tellermanovsad.ru/zayavka/?utm_source=vk&utm_medium=post&utm_campaign=family_mortgage&utm_content=mortgage_button#ipoteka
```

Форма подбора:

```text
https://tellermanovsad.ru/zayavka/?utm_source=telegram&utm_medium=post&utm_campaign=apartment_selection&utm_content=selection_button#podbor
```

Форма консультации:

```text
https://tellermanovsad.ru/zayavka/?utm_source=vk&utm_medium=post&utm_campaign=consultation_docs&utm_content=docs_question#consultation
```

Форма звонка:

```text
https://tellermanovsad.ru/zayavka/?utm_source=vk&utm_medium=story&utm_campaign=callback_fast&utm_content=call_button#call
```

Список ожидания:

```text
https://tellermanovsad.ru/zayavka/?utm_source=telegram&utm_medium=post&utm_campaign=waitlist_prices&utm_content=waitlist_button#waitlist
```

## 4. Ссылки для риэлторов и менеджеров

Пример для конкретного специалиста:

```text
https://tellermanovsad.ru/zayavka/?utm_source=vk&utm_medium=post&utm_campaign=tellermanov_start&utm_content=personal_post&realtor=ivanova&realtor_id=12&manager=kovtun#jk
```

Правила:

- `realtor` — короткий код специалиста латиницей;
- `realtor_id` — внутренний ID специалиста, если есть;
- `manager` — менеджер или ответственный за группу заявок;
- не использовать ФИО в UTM, чтобы не плодить разные написания.

## 5. Ссылки для офлайн-рекламы и QR

Баннер на объекте:

```text
https://tellermanovsad.ru/zayavka/?utm_source=offline&utm_medium=qr&utm_campaign=object_banner&utm_content=prostornaya_banner#waitlist
```

Листовка:

```text
https://tellermanovsad.ru/zayavka/?utm_source=offline&utm_medium=flyer&utm_campaign=flyer_july&utm_content=a4_2up#jk
```

Офис / стойка менеджера:

```text
https://tellermanovsad.ru/zayavka/?utm_source=offline&utm_medium=qr&utm_campaign=office&utm_content=manager_table#podbor
```

## 6. Как читать заявки менеджеру

В заявке должны быть видны:

- `utm_source` — откуда пришёл человек;
- `utm_medium` — формат размещения;
- `utm_campaign` — какая кампания сработала;
- `utm_content` — какой креатив или кнопка;
- `realtor` / `realtor_id` — чей код был в ссылке;
- `first_touch` — первое касание;
- `last_touch` — последнее касание.

Если `first_touch` и `last_touch` разные, значит человек мог впервые прийти из одного источника, а заявку оставить позже из другого. Для управленческой аналитики лучше смотреть оба значения.

## 7. Ошибки, которых нельзя допускать

1. Не писать UTM кириллицей.
2. Не использовать пробелы.
3. Не менять названия кампаний каждый раз без причины.
4. Не смешивать разные источники в одной ссылке.
5. Не использовать одну ссылку для всех площадок.
6. Не ставить якорь `#jk` перед UTM-параметрами.

Неправильно:

```text
https://tellermanovsad.ru/zayavka/#jk?utm_source=vk
```

Правильно:

```text
https://tellermanovsad.ru/zayavka/?utm_source=vk&utm_medium=post&utm_campaign=tellermanov_start#jk
```

## 8. Базовый набор кампаний для запуска

| Кампания | Ссылка ведёт | Цель |
|---|---|---|
| `tellermanov_start` | `#jk` | заявки по ЖК |
| `waitlist_prices` | `#waitlist` | список ожидания по ценам |
| `family_mortgage` | `#ipoteka` | ипотечные заявки |
| `apartment_selection` | `#podbor` | подбор квартиры |
| `consultation_docs` | `#consultation` | вопросы по документам и безопасности |
| `callback_fast` | `#call` | быстрый звонок |
