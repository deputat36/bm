# План миграции tellermanovsad.ru в раздел портала

Дата фиксации: 2026-07-05

## 1. Цель миграции

Перенести текущий сайт ЖК «Теллерманов сад» из формата самостоятельного сайта одного объекта в раздел городского портала «Новостройки Борисоглебска».

Целевая структура:

```text
/zhk/tellermanov-sad/
```

При этом важно сохранить:

- текущие заявки;
- SEO-позиции и поисковый спрос по ЖК;
- понятные старые URL;
- доверие пользователей, которые уже видели домен `tellermanovsad.ru` в рекламе, соцсетях или рассылках;
- возможность отдельно продвигать ЖК «Теллерманов сад» как приоритетный объект.

## 2. Текущая структура сайта ЖК

Сейчас сайт расположен в корне репозитория и использует домен `tellermanovsad.ru`.

Текущие основные URL:

```text
/
/o-zhk/
/kvartiry/
/planirovki/
/ceny/
/dokumenty/
/proektnaya-deklaratsiya-36-001139/
/galereya/
/zastroyschik/
/infrastruktura/
/ipoteka/
/hod-stroitelstva/
/novosti/
/novosti/chto-izvestno-o-zhk-tellermanov-sad/
/novosti/kak-podgotovitsya-k-pokupke-kvartiry-v-novostroyke/
/novosti/kak-proverit-novostroyku-po-proektnoy-deklaratsii/
/novosti/ipoteka-i-gospodderzhka-dlya-novostroyki/
/faq/
/contacts/
/novostroyka-borisoglebsk/
/prostornaya-4a/
/karta-sayta/
/privacy/
```

## 3. Новая структура внутри портала

```text
/zhk/tellermanov-sad/
/zhk/tellermanov-sad/o-zhk/
/zhk/tellermanov-sad/kvartiry/
/zhk/tellermanov-sad/planirovki/
/zhk/tellermanov-sad/ceny/
/zhk/tellermanov-sad/dokumenty/
/zhk/tellermanov-sad/proektnaya-deklaratsiya-36-001139/
/zhk/tellermanov-sad/galereya/
/zhk/tellermanov-sad/zastroyschik/
/zhk/tellermanov-sad/infrastruktura/
/zhk/tellermanov-sad/ipoteka/
/zhk/tellermanov-sad/hod-stroitelstva/
/zhk/tellermanov-sad/faq/
/zhk/tellermanov-sad/contacts/
```

Новостные материалы лучше разделить на два типа:

1. Общие новости портала:

```text
/novosti/
/novosti/{slug}/
```

2. Новости конкретного ЖК:

```text
/zhk/tellermanov-sad/novosti/
/zhk/tellermanov-sad/novosti/{slug}/
```

## 4. Карта переноса URL

| Старый URL | Новый URL | Действие |
|---|---|---|
| `/` | `/zhk/tellermanov-sad/` или главная портала `/` | На этапе 1 оставить как лендинг ЖК. На этапе 2 главную заменить порталом, а ЖК перенести в раздел. |
| `/o-zhk/` | `/zhk/tellermanov-sad/o-zhk/` | Перенести контент, затем настроить редирект. |
| `/kvartiry/` | `/zhk/tellermanov-sad/kvartiry/` | Перенести контент, затем настроить редирект. |
| `/planirovki/` | `/zhk/tellermanov-sad/planirovki/` | Перенести контент, затем настроить редирект. |
| `/ceny/` | `/zhk/tellermanov-sad/ceny/` | Перенести контент, затем настроить редирект. |
| `/dokumenty/` | `/zhk/tellermanov-sad/dokumenty/` | Перенести контент, затем настроить редирект. |
| `/galereya/` | `/zhk/tellermanov-sad/galereya/` | Перенести галерею и проверить пути к изображениям. |
| `/zastroyschik/` | `/zhk/tellermanov-sad/zastroyschik/` и `/zastroyschiki/bm-group/` | Разделить: информация по роли застройщика в ЖК и общая карточка застройщика. |
| `/infrastruktura/` | `/zhk/tellermanov-sad/infrastruktura/` | Перенести как страницу ЖК. |
| `/ipoteka/` | `/zhk/tellermanov-sad/ipoteka/` и `/ipoteka/` | Разделить: ипотека по объекту и общая ипотечная страница портала. |
| `/hod-stroitelstva/` | `/zhk/tellermanov-sad/hod-stroitelstva/` | Перенести как страницу ЖК. |
| `/faq/` | `/zhk/tellermanov-sad/faq/` и `/faq/` | Разделить: FAQ по ЖК и общий FAQ портала. |
| `/contacts/` | `/contacts/` и `/zhk/tellermanov-sad/contacts/` | Общая заявка портала + отдельная заявка по ЖК. |
| `/novostroyka-borisoglebsk/` | `/novostroyki/` или `/spravochnik/novostroyki-borisoglebsk/` | Определить по SEO-смыслу страницы. |
| `/prostornaya-4a/` | `/zhk/tellermanov-sad/prostornaya-4a/` | Перенести как адресную посадочную страницу. |
| `/privacy/` | `/privacy/` | Оставить общей страницей портала. |
| `/karta-sayta/` | `/karta-sayta/` | Обновить под портал. |

## 5. Этапы миграции

### Этап 1. Подготовка без изменения публичной структуры

1. Создать документацию.
2. Зафиксировать карту URL.
3. Создать структуру будущих папок `/zhk/tellermanov-sad/`.
4. Создать базовые `README` или временные технические страницы внутри новых папок, закрытые от индексации до готовности.
5. Не менять существующие URL в рекламе и sitemap.

### Этап 2. Дублирование страниц в новой структуре

1. Скопировать текущие страницы ЖК в `/zhk/tellermanov-sad/`.
2. Исправить относительные пути к CSS, JS, изображениям.
3. Обновить хлебные крошки: `Главная → ЖК → Теллерманов сад → Раздел`.
4. На новых страницах заменить canonical на будущие URL портала.
5. Убедиться, что формы передают `project = ЖК Теллерманов сад` и текущий `page_url`.

### Этап 3. Создание главной страницы портала

1. Текущий `index.html` сохранить как страницу ЖК.
2. В корне создать новую главную страницу портала.
3. Добавить карточку ЖК «Теллерманов сад» как первый объект.
4. Добавить пустые или черновые блоки под будущие новостройки.
5. Создать общий CTA: «Подобрать квартиру в новостройке».

### Этап 4. SEO-переход

1. Обновить `sitemap.xml`.
2. Проверить `robots.txt`.
3. Настроить редиректы старых URL на новые.
4. Если GitHub Pages не позволяет серверные 301-редиректы, использовать:
   - HTML-страницы-переадресаторы с canonical;
   - JavaScript fallback;
   - meta refresh только как временное решение;
   - либо перенести хостинг на площадку, где доступны 301-редиректы.
5. Для `tellermanovsad.ru` выбрать стратегию:
   - оставить домен как отдельный вход на `/zhk/tellermanov-sad/`;
   - или сделать 301 на новый домен портала;
   - или использовать домен как alias, если хостинг позволяет корректные canonical.

### Этап 5. Проверка заявок

1. Проверить отправку заявки с главной портала.
2. Проверить отправку заявки со страниц ЖК.
3. Убедиться, что в заявке есть:
   - имя;
   - телефон;
   - интерес;
   - комментарий;
   - проект;
   - страница;
   - UTM-метки;
   - `realtor` / `realtor_id`, если переданы.
4. Разделить темы писем/лидов:
   - `Заявка с портала Новостройки Борисоглебска`;
   - `Заявка по ЖК Теллерманов сад`.

## 6. Правила безопасности миграции

1. Не удалять старые страницы до полной проверки новых.
2. Не менять canonical массово, пока новая структура не готова.
3. Не публиковать неподтвержденные цены как факт.
4. Не обещать бронь, если ее юридически нет.
5. Не закрывать от индексации готовые коммерческие страницы.
6. Закрывать от индексации только служебные материалы: `docs`, `data`, `tools`, тестовые формы и внутренние страницы.

## 7. Что нужно решить отдельно

1. Основной домен портала.
2. Оставляем ли `tellermanovsad.ru` как самостоятельный домен или делаем редирект.
3. Будет ли портал только статическим или позже переедет на CMS/PHP.
4. Где будут храниться заявки: Web3Forms, CRM, Supabase, Google Sheets или отдельный backend.
5. Будет ли отдельный личный кабинет/панель для сотрудников или только публичный сайт.

## 8. Рекомендуемый ближайший порядок работ

1. Обновить `README.md` под новую цель проекта.
2. Создать `docs/development-roadmap.md`.
3. Создать будущую структуру `/zhk/tellermanov-sad/`.
4. Перенести главную страницу ЖК в `/zhk/tellermanov-sad/index.html`.
5. Подготовить новую главную `/index.html` портала.
6. Проверить визуально и технически обе ветки URL.
7. После проверки обновить sitemap и canonical.
