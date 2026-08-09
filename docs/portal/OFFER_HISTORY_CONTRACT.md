# История цены и статуса offer feed

Дата: 2026-08-09

Статус: спецификация. Управляемое history-хранилище ещё не подключено, запись событий выключена.

## Назначение

Текущий `data/offers/feed.json` должен содержать только последнее нормализованное состояние предложения. История цены и наличия хранится отдельно и не должна разрастаться внутри текущей строки квартиры.

## Канонические события

```text
price_observed
availability_observed
```

Каждое событие относится к публичной идентичности предложения:

```text
object_id
section_or_entrance
apartment_number_public
```

Обязательные технические поля события:

```text
event_id
event_type
observed_at
object_id
section_or_entrance
apartment_number_public
source_id
value
previous_event_hash
event_hash
```

## Append-only модель

После подключения server store:

- существующее событие нельзя обновлять;
- существующее событие нельзя удалять;
- новое наблюдение добавляет новую запись;
- события одной квартиры связываются SHA-256 hash chain;
- первое событие имеет `previous_event_hash=null`;
- последующие события ссылаются на hash предыдущего события этого же предложения.

Hash chain не заменяет резервное копирование или server permissions, но помогает обнаружить изменение уже записанной истории.

## Значения

Для `price_observed` допускается положительное число или `null`. `null` означает, что источник в момент наблюдения не предоставил цену; это не означает нулевую стоимость.

Для `availability_observed` используются те же статусы, что в текущем offer contract:

```text
available
reserved
unavailable
sold
unknown
```

## Безопасность

Реальные history events не коммитятся в GitHub. Репозиторий хранит только схему и валидаторы.

Запрещены персональные данные, комментарии, user agent, URL пользователя, токены, API keys и raw URL рабочей таблицы.

Browser-доступ к history store до отдельного release запрещён.

## Где хранить

До подключения store `type=null`, `secure_reference=null`, `retention_days=null`.

Разрешённые классы будущего storage:

- `supabase_private_table`;
- `managed_backend`.

Перед включением записи обязательны:

1. выбор управляемого store;
2. безопасная ссылка на него;
3. retention policy;
4. server-side append-only enforcement;
5. write access только защищённой сервисной роли;
6. backup/export policy.

## Связь с текущим feed

`data/offers/contract.json` сохраняет `history_separate_from_current_feed=true`.

В текущую строку feed запрещено добавлять массивы `history`, `events`, `price_history`, `availability_history` или `status_history`.

## Следующий этап

После выбора реального offer source можно создать приватное history store и импортный writer отдельным PR. До этого `history_store_connected=false` и `history_write_enabled=false` остаются обязательными.
