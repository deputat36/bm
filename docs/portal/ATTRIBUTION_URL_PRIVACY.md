# Приватность URL атрибуции

Дата: 2026-07-15

## Проблема

Форма сохраняет страницу обращения, referrer, первое и последнее касание. До этого этапа использовались полные значения `window.location.href` и `document.referrer`.

Если во входной ссылке случайно присутствовали произвольные параметры, например:

```text
?phone=...
?email=...
?name=...
?comment=...
?token=...
```

они могли попасть в локальный tracking и затем в письмо заявки.

## Новое правило

До сохранения или отправки URL приводится к безопасному виду:

```text
origin + pathname + разрешённые параметры атрибуции
```

Fragment после `#` удаляется.

Для referrer сохраняются только:

```text
origin + pathname
```

Query-параметры внешнего и внутреннего referrer не сохраняются.

## Разрешённые параметры

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

Любой другой query-параметр удаляется.

## Очистка значений

Значения:

- обрезаются до 256 символов;
- очищаются от управляющих символов;
- не сохраняются, если обычная рекламная метка похожа на email или телефон;
- opaque click-ID сохраняются как технические идентификаторы, но только под заранее разрешёнными именами параметров.

Opaque-параметры:

```text
gclid
yclid
ymclid
vkclid
fbclid
roistat
openstat
```

## Где применяется

Очистка применяется к:

```text
data.page_url
data.referrer
data.tracking.first_touch
data.tracking.last_touch
data.tracking.current
localStorage.newbuildsBorisoglebskTracking
```

Ранее сохранённый tracking очищается при загрузке обязательного runtime `conversion-tracking.js`.

## Что не меняется

Не изменяются:

- имя и телефон в фактической доставке заявки;
- содержание пользовательского комментария в письме;
- `form_id` и `form_role`;
- объект и `residential_complex_id`;
- квалификация;
- Web3Forms;
- dry-run;
- локальный analytics debug.

Очистка касается только URL и значений атрибуции.

## Ограничения

- Guard не заменяет проверку в браузере.
- В рекламные UTM-параметры нельзя вручную помещать контакты клиента.
- Параметр `manager` должен содержать только внутренний технический идентификатор или согласованное короткое обозначение, а не телефон или email.
- Рабочее письмо не проверялось реальной отправкой.

## Ручная проверка

Открыть форму с тестовой ссылкой, содержащей разрешённые и запрещённые параметры:

```text
/?utm_source=qa&utm_campaign=url_privacy&phone=79990000000&email=test@example.com&token=secret#quick-lead
```

После загрузки проверить `localStorage.newbuildsBorisoglebskTracking`.

Ожидается:

```text
utm_source=qa
utm_campaign=url_privacy
phone отсутствует
email отсутствует
token отсутствует
fragment отсутствует
```

Проверку выполнять только в dry-run и без реальных персональных данных.

## Автоматическая проверка

```bash
node tools/validate-attribution-url-privacy.mjs
```

Validator контролирует точный allowlist, ограничение длины, очистку email/телефоноподобных значений, удаление fragment, очистку persisted tracking и wrapper над `collectFormData`.