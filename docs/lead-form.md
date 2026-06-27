# Логика формы заявки

Форма собирает:

- имя;
- телефон;
- интерес;
- комментарий;
- страницу отправки;
- заголовок страницы;
- referrer;
- UTM-метки;
- `realtor` и `realtor_id`.

## Пример ссылки для риэлтора

```text
https://deputat36.github.io/bm/?realtor=ivanova&utm_source=vk&utm_medium=post&utm_campaign=prostornaya_start
```

## Подключение обработчика

В `assets/js/main.js` нужно заполнить:

```js
LEAD_ENDPOINT: "https://..."
```

Это может быть Supabase Edge Function, CRM webhook или другой обработчик.
