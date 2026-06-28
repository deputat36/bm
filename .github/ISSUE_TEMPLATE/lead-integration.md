---
name: Интеграция заявок
about: Подключить отправку формы в CRM, таблицу или webhook
title: "Подключить обработчик заявок"
labels: leads
assignees: ""
---

## Куда отправлять заявки

- [ ] CRM
- [ ] Google Sheets
- [ ] Supabase
- [ ] Email/webhook
- [ ] Другое

## Какие поля нужны

- [ ] имя
- [ ] телефон
- [ ] тип квартиры
- [ ] бюджет
- [ ] способ покупки
- [ ] сообщение
- [ ] страница отправки
- [ ] UTM
- [ ] realtor
- [ ] realtor_id

## Что сделать в коде

1. Заполнить `LEAD_ENDPOINT` в `assets/js/main.js`.
2. Проверить CORS.
3. Проверить отправку с главной.
4. Проверить отправку со страницы `/contacts/`.
5. Проверить, что UTM и `realtor` попадают в заявку.

## Проверка

Тестовая ссылка:

```text
https://deputat36.github.io/bm/?realtor=test&utm_source=vk&utm_medium=test&utm_campaign=lead_test
```
