# Новостройки Борисоглебска

Городской портал по новостройкам Борисоглебска.

Текущий репозиторий находится в переходном состоянии: сейчас опубликованный сайт фактически работает как информационный сайт ЖК «Теллерманов сад» / дома на Просторной 4А, но дальнейшая архитектура проекта строится как общий портал по всем новостройкам города.

## Цель проекта

Создать удобный городской портал, где покупатель сможет:

- посмотреть актуальные новостройки Борисоглебска;
- сравнить жилые комплексы, адреса, сроки сдачи, планировки и способы покупки;
- изучить отдельные страницы каждого ЖК;
- получить консультацию по ипотеке, семейной ипотеке, материнскому капиталу и сертификату «Молодая семья»;
- оставить заявку на подбор квартиры или конкретный объект.

## Первый объект портала

Первым детально проработанным разделом портала является ЖК «Теллерманов сад» / дом на Просторной 4А.

Текущий сайт содержит страницы:

- о ЖК;
- квартиры;
- планировки;
- цены;
- документы;
- галерея;
- застройщик;
- инфраструктура;
- ипотека;
- ход строительства;
- новости;
- FAQ;
- контакты и форма заявки;
- лидогенерационная страница `/zayavka/`;
- страница подтверждения заявки `/spasibo/`.

## Текущий опубликованный адрес

Сейчас проект ориентирован на домен:

```text
https://tellermanovsad.ru/
```

До завершения миграции старые URL не удаляются, чтобы не потерять заявки, рекламу и поисковый трафик.

## Целевая архитектура

ЖК «Теллерманов сад» должен стать разделом внутри общего портала:

```text
/zhk/tellermanov-sad/
```

Будущая структура портала:

```text
/
/novostroyki/
/zhk/
/zhk/tellermanov-sad/
/zastroyschiki/
/ipoteka/
/novosti/
/spravochnik/
/sravnenie/
/zayavka/
/spasibo/
/contacts/
/privacy/
```

## Уже добавленная черновая структура портала

Новые страницы создаются с `noindex,follow`, пока не завершена проверка и не обновлены canonical / sitemap.

```text
/portal-preview/
/novostroyki/
/zhk/
/zhk/tellermanov-sad/
/zhk/tellermanov-sad/o-zhk/
/zhk/tellermanov-sad/kvartiry/
/zhk/tellermanov-sad/planirovki/
/zhk/tellermanov-sad/ceny/
/zhk/tellermanov-sad/dokumenty/
/zhk/tellermanov-sad/galereya/
/zhk/tellermanov-sad/zastroyschik/
/zhk/tellermanov-sad/infrastruktura/
/zhk/tellermanov-sad/ipoteka/
/zhk/tellermanov-sad/hod-stroitelstva/
/zhk/tellermanov-sad/faq/
/zhk/tellermanov-sad/contacts/
/zhk/tellermanov-sad/prostornaya-4a/
/zhk/tellermanov-sad/novosti/
/sravnenie/
/zastroyschiki/
/zastroyschiki/bm-group/
/spravochnik/
```

## Структурированные данные

Для подготовки будущего каталога добавлены первые JSON-профили и индексные файлы:

```text
/data/site.json
/data/pages/index.json
/data/projects/index.json
/data/projects/tellermanov-sad.json
/data/builders/index.json
/data/builders/bm-group.json
/data/apartment-types/tellermanov-sad.json
/data/documents/tellermanov-sad.json
```

Они нужны для будущих фильтров, сравнения объектов, карточек ЖК, карточек застройщиков, генерации sitemap и унификации заявок.

## Заявки и лидогенерация

Основная страница форм:

```text
/zayavka/
```

Формы реализованы в `assets/js/main.js` и на странице `zayavka/index.html`.

Сейчас реализованы отдельные типы заявок:

- `complex_interest` — заявка на квартиру в конкретном ЖК;
- `mortgage` — ипотечная консультация;
- `apartment_selection` — подбор квартиры;
- `consultation` — консультация специалиста;
- `callback` — заказ звонка;
- `waitlist` — список ожидания;
- `portal_selection` — заявка на подбор новостройки из каталога;
- `project_consultation` — заявка со страницы конкретного ЖК внутри портала.

Форма собирает:

- имя;
- телефон;
- тип заявки;
- ID формы;
- ID фиксации клиента;
- ID проекта `project_id`;
- название проекта `project_name`;
- интересующий ЖК `residential_complex`;
- ID ЖК `residential_complex_id`;
- комнатность, бюджет, способ покупки и сроки;
- ипотечные параметры, если заявка ипотечная;
- страницу отправки;
- заголовок страницы;
- источник перехода;
- первое и последнее рекламное касание;
- UTM-метки и рекламные клик-метки;
- код специалиста `realtor` / `realtor_id`;
- согласие на обработку персональных данных;
- время заполнения формы;
- антиспам-проверку honeypot;
- автоматическую квалификацию `hot`, `warm` или `cold`.

Текущая отправка:

- email-копия через Web3Forms;
- подготовлен `LEAD_ENDPOINT` для будущей передачи в CRM, Supabase Edge Function или другой обработчик;
- после успешной отправки пользователь попадает на `/spasibo/`, где фиксируется событие просмотра страницы благодарности.

Подготовлена серверная заготовка:

```text
supabase/functions/newbuild-lead/index.ts
```

Она принимает заявку, валидирует телефон и согласие, отсекает спам, применяет server-side rate limit, пишет данные в `newbuild_leads`, создаёт событие в `newbuild_lead_events`, фиксирует попытки в `newbuild_lead_rate_limits` и может отправлять уведомление в Telegram.

Настройка находится в `assets/js/main.js`:

```js
const SITE_CONFIG = {
  WEB3FORMS_ACCESS_KEY: "...",
  LEAD_ENDPOINT: "",
  SEND_EMAIL_COPY: true,
  ENABLE_THANK_YOU_REDIRECT: true
};
```

События аналитики:

```text
lead_submit
lead_thankyou_view
```

Пример рекламной ссылки:

```text
https://tellermanovsad.ru/zayavka/?realtor=ivanova&utm_source=vk&utm_medium=post&utm_campaign=prostornaya_start#jk
```

## Микроразметка

Добавлена заготовка:

```text
/assets/js/schema.js
```

Она предназначена для будущей генерации:

- `BreadcrumbList` на основе блока `.breadcrumbs`;
- `Residence` на основе data-атрибутов страницы ЖК.

Правила подключения и проверки описаны в `docs/schema-strategy.md`.

## Документация

Основная документация проекта находится в папке `docs`:

- `docs/portal-architecture.md` — архитектура будущего портала;
- `docs/migration-tellermanovsad.md` — план переноса текущего сайта ЖК в раздел портала;
- `docs/portal-homepage-migration.md` — порядок безопасного переноса `/portal-preview/` в корневой `index.html`;
- `docs/development-roadmap.md` — этапы дальнейшей разработки;
- `docs/url-map.md` — карта старых и новых URL;
- `docs/content-model.md` — модель данных портала: ЖК, застройщик, документы, медиа, статьи и заявки;
- `docs/data-structure.md` — структура JSON-данных портала;
- `docs/redirect-map.md` — карта будущих редиректов при миграции URL;
- `docs/link-path-audit.md` — чек-лист относительных путей, форм, CSS/JS и тестовых заявок;
- `docs/schema-strategy.md` — стратегия микроразметки JSON-LD;
- `docs/leadgen-strategy.md` — стратегия лидогенерации, формы, UTM, квалификация, сценарии менеджера;
- `docs/utm-playbook.md` — шаблоны UTM-ссылок для ВК, Telegram, офлайн-рекламы, QR и персональных ссылок специалистов;
- `docs/manager-lead-handling.md` — инструкция менеджеру по обработке заявок, звонкам, статусам и безопасным формулировкам;
- `docs/legal-safety-strategy.md` — юридически безопасное позиционирование портала, дисклеймеры, стоп-лист формулировок, шаблоны карточек ЖК, рекламы и постов;
- `docs/lead-rate-limit.md` — описание server-side rate limit для заявок;
- `docs/lead-launch-checklist.md` — чек-лист проверки форм, UTM, аналитики, Supabase и менеджера перед запуском рекламы;
- `docs/supabase-leads.sql` — схема таблиц для хранения заявок, истории обработки и rate limit в Supabase;
- `docs/supabase-edge-function-leads.md` — инструкция по подключению Supabase Edge Function для заявок.

## Принципы разработки

1. Работать маленькими коммитами.
2. Не ломать текущий опубликованный сайт.
3. Сначала добавлять архитектуру и новые разделы, затем переносить контент.
4. Не удалять старые URL до полной проверки новых.
5. Не публиковать неподтвержденные цены и условия как факт.
6. Служебные папки `docs`, `data`, `tools` не должны индексироваться.
7. Любая форма заявки должна сохранять источник, страницу, UTM-метки и интересующий объект.
8. Заявка не должна формулироваться как бронь квартиры или фиксация цены, если это не подтверждено отдельным процессом.

## Ближайшие задачи

1. Пройти `docs/link-path-audit.md` в браузере и отправить тестовые заявки.
2. Пройти `docs/portal-homepage-migration.md` перед переносом `/portal-preview/` в корневой `index.html`.
3. Подключить `schema.js` к проверенным черновым страницам и проверить JSON-LD.
4. Развернуть `newbuild-lead` в Supabase и вставить URL функции в `LEAD_ENDPOINT`.
5. Настроить Telegram-уведомления менеджерам.
6. Настроить цели в Яндекс.Метрике / GA4 по событиям `lead_submit` и `lead_thankyou_view`.
7. Пройти `docs/lead-launch-checklist.md` перед запуском рекламы.
8. Обновить sitemap и canonical только после проверки новой структуры.
