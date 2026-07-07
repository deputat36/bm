# Совместимость lead_type в Edge Function

Фронтенд портала использует дополнительные типы заявок:

```text
portal_selection
project_consultation
```

Эти типы нужны для:

```text
/portal-preview/
/novostroyki/
/sravnenie/
/zhk/tellermanov-sad/
```

## 1. Что уже исправлено

В `docs/supabase-leads.sql` обновлено CHECK-ограничение `newbuild_leads_lead_type_check`.

Теперь база должна принимать типы:

```text
complex_interest
mortgage
apartment_selection
consultation
callback
waitlist
portal_selection
project_consultation
general
```

## 2. Что нужно исправить в Edge Function

Файл:

```text
supabase/functions/newbuild-lead/index.ts
```

В функции `validatePayload` нужно добавить в список допустимых типов:

```text
portal_selection
project_consultation
```

Итоговый список должен быть:

```text
complex_interest
mortgage
apartment_selection
consultation
callback
waitlist
portal_selection
project_consultation
general
```

## 3. Почему это важно

Если Edge Function не принимает эти типы, заявки с новых портальных страниц могут возвращать ошибку:

```text
invalid_lead_type
```

При этом фронтенд уже использует эти значения, а база после обновления SQL готова их хранить.

## 4. Проверка после исправления

После обновления Edge Function отправить тестовые заявки:

1. `portal_selection` со страницы каталога или сравнения.
2. `project_consultation` со страницы ЖК внутри портала.

Ожидаемый результат:

- ответ `success=true`;
- запись появилась в `newbuild_leads`;
- `lead_type` сохранился без замены на `general`;
- событие появилось в `newbuild_lead_events`.

## 5. Статус

SQL-схема обновлена.

Edge Function требует точечного исправления списка допустимых `lead_type`. Прямая полная замена файла через GitHub-инструмент была заблокирована, поэтому изменение зафиксировано отдельным техническим документом.
