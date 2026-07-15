# Handoff-пакет первичного обращения

Дата обновления: 2026-07-15

## Назначение

Контракт описывает, какие внутренние поля должны сопровождать заявку при передаче в письмо, endpoint или CRM.

Он не меняет действующую отправку Web3Forms и не назначает сотрудников.

Статус:

```text
draft_contract_not_connected
```

## Что входит в пакет

### Маршрутизация

```text
handling_contract_version
lead_lifecycle_state
qualification_status
response_guidance
form_role
lead_type
```

### Контекст

```text
residential_complex_id
source_check_required
conversation_goal
object_handling_focus
```

### Действие

```text
recommended_first_action
required_contact_outcome
allowed_next_actions
```

### Атрибуция

```text
form_id
lead_source
placement
```

## Контактные данные

Имя, телефон и согласие уже обрабатываются текущим delivery-слоем.

Генератор handoff-пакетов не выводит их значения и не создаёт отдельный реестр персональных данных.

## Матрица

```text
3 приоритета
× 2 роли формы
× 3 типа заявки
× 4 объекта
= 72 шаблона
```

Приоритеты:

```text
hot
warm
cold
```

Роли:

```text
primary
detailed
```

Типы заявки:

```text
project_consultation
portal_selection
mortgage
```

Объектные контексты:

```text
all-newbuilds
prostornaya-4a
aerodromnaya-18g
sennaya-76
```

## Проверка источника

`source_check_required=true`, если проверку требует тип заявки либо объектный контекст.

Для трёх адресных объектов предметный ответ по цене, наличию, документам, планировкам, срокам или застройщику должен опираться на проверенный источник.

## Рекомендации по сроку

Поле `response_guidance` использует только рекомендательные категории:

```text
first_available_work_block
same_working_day
planned_nurture_cycle
```

Это не публичное обещание клиенту и не утверждённый SLA.

## Команды

```bash
node tools/validate-lead-handoff.mjs
node tools/build-lead-handoff-report.mjs
node tools/build-lead-handoff-report.mjs --format=json
node tools/build-lead-handoff-report.mjs --format=csv
node tools/build-lead-handoff-report.mjs --priority=hot
node tools/build-lead-handoff-report.mjs --role=primary
node tools/build-lead-handoff-report.mjs --lead-type=mortgage
node tools/build-lead-handoff-report.mjs --object=prostornaya-4a
```

## Что проверяет guard

- совпадение с операционной картой;
- совпадение начального состояния с lifecycle-контрактом;
- соответствие ролей и типов 14 активным формам;
- соответствие объектных контекстов реестру проектов;
- наличие четырёх разделов и 16 внутренних полей;
- ровно 72 комбинации;
- отсутствие контактных значений;
- отсутствие действующего SLA и назначенных владельцев;
- отсутствие экспорта в публичную аналитику.

## Ограничения

Пока не выполнены:

```text
изменение текста реального письма
добавление полей в Web3Forms
подключение endpoint
подключение CRM
назначение ответственного
утверждение SLA
контролируемая реальная отправка
```

Перенос контракта в рабочее письмо должен выполняться вместе с контролируемым тестом доставки, чтобы не потерять существующие поля заявки.
