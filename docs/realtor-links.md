# Ссылки для риэлторов и рекламы

Сайт поддерживает параметры `utm_*`, `realtor` и `realtor_id`. Они сохраняются в браузере и добавляются к заявке.

## Базовый шаблон

```text
https://deputat36.github.io/bm/?realtor=slug&utm_source=vk&utm_medium=post&utm_campaign=prostornaya_start
```

`slug` нужно заменить на короткий идентификатор риэлтора латиницей.

Примеры:

```text
https://deputat36.github.io/bm/?realtor=ivanov&utm_source=vk&utm_medium=post&utm_campaign=prostornaya_start
https://deputat36.github.io/bm/contacts/?realtor=ivanov&utm_source=vk&utm_medium=story&utm_campaign=prostornaya_start
https://deputat36.github.io/bm/kvartiry/?realtor=ivanov&utm_source=vk&utm_medium=ad&utm_campaign=prostornaya_kvartiry
```

## Рекомендуемые кампании

| Кампания | Когда использовать | URL |
| --- | --- | --- |
| `prostornaya_start` | Первый прогрев | Главная |
| `prostornaya_kvartiry` | Реклама квартир | `/kvartiry/` |
| `prostornaya_price` | Сбор спроса на цены | `/ceny/` |
| `prostornaya_mortgage` | Ипотечные заявки | `/ipoteka/` |
| `prostornaya_story` | Сторис и личные страницы | `/contacts/` |

## Для поста ВКонтакте

```text
https://deputat36.github.io/bm/?realtor=ivanov&utm_source=vk&utm_medium=post&utm_campaign=prostornaya_start
```

## Для сторис

```text
https://deputat36.github.io/bm/contacts/?realtor=ivanov&utm_source=vk&utm_medium=story&utm_campaign=prostornaya_story
```

## Для объявления по ипотеке

```text
https://deputat36.github.io/bm/ipoteka/?realtor=ivanov&utm_source=vk&utm_medium=ad&utm_campaign=prostornaya_mortgage
```

## Правила

1. Один риэлтор - один постоянный `realtor`.
2. Для платной рекламы обязательно использовать `utm_campaign`.
3. Для сторис лучше вести сразу на `/contacts/`.
4. Для SEO-постов лучше вести на тематическую страницу, а не всегда на главную.
5. После подключения CRM поле `realtor` должно попадать в карточку лида.
