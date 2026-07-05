# Карта URL портала «Новостройки Борисоглебска»

Дата фиксации: 2026-07-05

## 1. Назначение документа

Документ фиксирует будущую URL-структуру портала и правила переноса текущего сайта ЖК «Теллерманов сад».

Главная цель: не потерять поисковый спрос, рекламу, старые ссылки и заявки при переходе от сайта одного ЖК к городскому порталу.

## 2. Базовые правила URL

1. Все URL пишем в нижнем регистре.
2. Кириллицу в URL не используем.
3. Слова разделяем дефисами.
4. Для ЖК используем единый префикс `/zhk/`.
5. Для справочных материалов используем `/spravochnik/`.
6. Для новостей используем `/novosti/`.
7. Для застройщиков используем `/zastroyschiki/`.
8. Для страниц под ипотеку и господдержку используем короткие коммерческие URL.
9. Старые URL не удаляем до настройки редиректов или страниц-переадресаторов.

## 3. Главные URL портала

| URL | Назначение | Статус |
|---|---|---|
| `/` | Главная страница портала «Новостройки Борисоглебска» | Будет создана |
| `/novostroyki/` | Каталог всех новостроек города | Будет создан |
| `/zhk/` | Список жилых комплексов | Будет создан |
| `/zastroyschiki/` | Список застройщиков | Будет создан |
| `/ipoteka/` | Общая страница ипотеки на новостройки | Частично есть как объектная страница, нужно разделить |
| `/semejnaya-ipoteka/` | Семейная ипотека | Будет создана |
| `/matkapital/` | Материнский капитал при покупке новостройки | Будет создана |
| `/molodaya-semya/` | Сертификат «Молодая семья» | Будет создана |
| `/novosti/` | Новости портала | Есть, нужно переосмыслить как общий раздел |
| `/spravochnik/` | Справочник покупателя | Будет создан |
| `/sravnenie/` | Сравнение новостроек | Будет создан |
| `/contacts/` | Общая заявка и контакты | Есть, нужно адаптировать под портал |
| `/privacy/` | Политика обработки персональных данных | Есть |
| `/karta-sayta/` | Карта сайта | Есть, нужно обновить |

## 4. URL ЖК «Теллерманов сад»

| URL | Назначение | Источник контента |
|---|---|---|
| `/zhk/tellermanov-sad/` | Главная страница ЖК | Текущий `/` |
| `/zhk/tellermanov-sad/o-zhk/` | О ЖК | Текущий `/o-zhk/` |
| `/zhk/tellermanov-sad/kvartiry/` | Квартиры | Текущий `/kvartiry/` |
| `/zhk/tellermanov-sad/planirovki/` | Планировки | Текущий `/planirovki/` |
| `/zhk/tellermanov-sad/ceny/` | Цены | Текущий `/ceny/` |
| `/zhk/tellermanov-sad/dokumenty/` | Документы | Текущий `/dokumenty/` |
| `/zhk/tellermanov-sad/proektnaya-deklaratsiya-36-001139/` | Проектная декларация | Текущий `/proektnaya-deklaratsiya-36-001139/` |
| `/zhk/tellermanov-sad/galereya/` | Галерея | Текущий `/galereya/` |
| `/zhk/tellermanov-sad/zastroyschik/` | Застройщик в контексте объекта | Текущий `/zastroyschik/` |
| `/zhk/tellermanov-sad/infrastruktura/` | Инфраструктура | Текущий `/infrastruktura/` |
| `/zhk/tellermanov-sad/ipoteka/` | Ипотека по ЖК | Текущий `/ipoteka/` |
| `/zhk/tellermanov-sad/hod-stroitelstva/` | Ход строительства | Текущий `/hod-stroitelstva/` |
| `/zhk/tellermanov-sad/novosti/` | Новости ЖК | Часть текущего `/novosti/` |
| `/zhk/tellermanov-sad/faq/` | FAQ по ЖК | Текущий `/faq/` |
| `/zhk/tellermanov-sad/contacts/` | Заявка по ЖК | Текущий `/contacts/` |
| `/zhk/tellermanov-sad/prostornaya-4a/` | Адресная посадочная страница | Текущий `/prostornaya-4a/` |

## 5. Старые URL и действия

| Старый URL | Действие на первом этапе | Действие после готовности портала |
|---|---|---|
| `/` | Оставить текущую главную ЖК | Заменить на главную портала, старую главную перенести в `/zhk/tellermanov-sad/` |
| `/o-zhk/` | Оставить | Редирект на `/zhk/tellermanov-sad/o-zhk/` |
| `/kvartiry/` | Оставить | Редирект на `/zhk/tellermanov-sad/kvartiry/` |
| `/planirovki/` | Оставить | Редирект на `/zhk/tellermanov-sad/planirovki/` |
| `/ceny/` | Оставить | Редирект на `/zhk/tellermanov-sad/ceny/` |
| `/dokumenty/` | Оставить | Редирект на `/zhk/tellermanov-sad/dokumenty/` |
| `/galereya/` | Оставить | Редирект на `/zhk/tellermanov-sad/galereya/` |
| `/zastroyschik/` | Оставить | Разделить на `/zhk/tellermanov-sad/zastroyschik/` и `/zastroyschiki/bm-group/` |
| `/infrastruktura/` | Оставить | Редирект на `/zhk/tellermanov-sad/infrastruktura/` |
| `/ipoteka/` | Оставить | Сделать общей страницей ипотеки, объектную перенести в `/zhk/tellermanov-sad/ipoteka/` |
| `/hod-stroitelstva/` | Оставить | Редирект на `/zhk/tellermanov-sad/hod-stroitelstva/` |
| `/faq/` | Оставить | Сделать общим FAQ портала или редирект на объектный FAQ после создания общего `/faq/` |
| `/contacts/` | Оставить | Сделать общей страницей заявки, объектную форму перенести в `/zhk/tellermanov-sad/contacts/` |
| `/privacy/` | Оставить | Оставить как общую страницу портала |
| `/karta-sayta/` | Оставить | Обновить под портал |

## 6. SEO-посадочные страницы

### 6.1. Городские страницы

```text
/novostroyki-borisoglebsk/
/kvartiry-v-novostroykah-borisoglebsk/
/kupit-kvartiru-v-novostroyke-borisoglebsk/
/novostroyki-s-ipotekoy-borisoglebsk/
/novostroyki-ot-zastroyschika-borisoglebsk/
```

Решение по ним нужно принять отдельно: часть можно объединить с `/novostroyki/`, часть оставить как SEO-посадочные.

### 6.2. Объектные страницы ЖК «Теллерманов сад»

```text
/zhk/tellermanov-sad/prostornaya-4a/
/zhk/tellermanov-sad/studii/
/zhk/tellermanov-sad/odnokomnatnye/
/zhk/tellermanov-sad/dvuhkomnatnye/
/zhk/tellermanov-sad/trehkomnatnye/
/zhk/tellermanov-sad/semejnaya-ipoteka/
/zhk/tellermanov-sad/matkapital/
```

Эти страницы можно создать позже, когда будет понятна необходимость продвижения по низкочастотным запросам.

## 7. Правила canonical

На этапе дублирования:

- старые страницы временно оставляют прежний canonical;
- новые страницы можно закрыть от индексации или оставить без sitemap до проверки;
- после утверждения новой структуры canonical переводится на новые URL.

После миграции:

- новый URL должен быть основным canonical;
- старый URL должен вести на новый через редирект или страницу-переадресатор;
- `sitemap.xml` должен содержать только основные canonical URL.

## 8. Правила sitemap

До миграции:

- оставить текущий `sitemap.xml`.

После готовности портала:

- добавить главную портала;
- добавить каталог новостроек;
- добавить раздел ЖК;
- добавить страницы ЖК «Теллерманов сад» по новым URL;
- удалить или заменить старые URL;
- обновить `lastmod`.

## 9. Правила robots.txt

Оставить закрытыми:

```text
/docs/
/data/
/tools/
/links/
/utm/
```

Не закрывать от индексации готовые коммерческие страницы портала и ЖК.

## 10. Первый безопасный технический шаг

Создать новые папки и страницы без изменения старых:

```text
/zhk/index.html
/zhk/tellermanov-sad/index.html
/novostroyki/index.html
/spravochnik/index.html
/zastroyschiki/index.html
```

После этого можно визуально проверить новую структуру и только затем менять главную страницу и sitemap.
