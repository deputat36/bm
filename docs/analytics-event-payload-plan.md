# План расширения события lead_submit

Цель: добавить в событие `lead_submit` рекламные параметры, чтобы заявки можно было анализировать по источникам, кампаниям, специалистам и площадкам.

## 1. Текущая ситуация

Файл:

```text
assets/js/main.js
```

Событие `lead_submit` уже отправляется после успешной отправки формы.

Сейчас в событии есть:

```text
lead_type
form_id
project_id
project_name
residential_complex
residential_complex_id
client_fixation_id
qualification_status
qualification_score
blocked
offline
```

## 2. Что нужно добавить

В событие нужно добавить параметры из `data.tracking.current`:

```text
utm_source
utm_medium
utm_campaign
utm_content
utm_term
utm_id
gclid
yclid
ymclid
vkclid
fbclid
roistat
openstat
realtor
realtor_id
manager
lead_source
placement
```

Также добавить параметры страницы:

```text
page_url
page_title
referrer
```

## 3. Безопасный helper

Добавить перед функцией `trackLeadEvent`:

```js
function getAnalyticsTrackingParams(data) {
  const current = data.tracking?.current || {};

  return {
    utm_source: current.utm_source || "",
    utm_medium: current.utm_medium || "",
    utm_campaign: current.utm_campaign || "",
    utm_content: current.utm_content || "",
    utm_term: current.utm_term || "",
    utm_id: current.utm_id || "",
    gclid: current.gclid || "",
    yclid: current.yclid || "",
    ymclid: current.ymclid || "",
    vkclid: current.vkclid || "",
    fbclid: current.fbclid || "",
    roistat: current.roistat || "",
    openstat: current.openstat || "",
    realtor: current.realtor || "",
    realtor_id: current.realtor_id || "",
    manager: current.manager || "",
    lead_source: current.lead_source || "",
    placement: current.placement || "",
    page_url: data.page_url || "",
    page_title: data.page_title || "",
    referrer: data.referrer || ""
  };
}
```

## 4. Изменение eventPayload

Внутри `trackLeadEvent` добавить в `eventPayload`:

```js
...getAnalyticsTrackingParams(data)
```

Итоговый фрагмент:

```js
const eventPayload = {
  event: "lead_submit",
  lead_type: data.lead_type,
  form_id: data.form_id,
  project_id: data.project_id,
  project_name: data.project_name,
  residential_complex: data.residential_complex,
  residential_complex_id: data.residential_complex_id,
  client_fixation_id: data.client_fixation_id,
  qualification_status: data.qualification?.status || "",
  qualification_score: data.qualification?.score || 0,
  blocked: Boolean(result.blocked),
  offline: Boolean(result.offline),
  ...getAnalyticsTrackingParams(data)
};
```

## 5. Проверка после внедрения

Открыть страницу с параметрами в адресе:

```text
?utm_source=test&utm_medium=test&utm_campaign=test_campaign&utm_content=test_content&realtor=test&realtor_id=1&manager=test
```

Отправить тестовую заявку.

В консоли проверить:

```js
window.dataLayer
```

В последнем событии `lead_submit` должны быть:

```text
utm_source=test
utm_medium=test
utm_campaign=test_campaign
utm_content=test_content
realtor=test
realtor_id=1
manager=test
```

## 6. Почему это важно

После доработки можно будет сравнивать не только количество заявок, но и качество рекламы:

- какие источники дают заявки;
- какие кампании дают горячих покупателей;
- какие специалисты получают обращения;
- какие формы дают больше `hot` и `warm` лидов.

## 7. Статус

Прямое обновление `assets/js/main.js` через GitHub-инструмент может блокироваться из-за полной замены файла. Поэтому этот документ фиксирует точное изменение, которое нужно внести при следующем безопасном редактировании файла.
