# Карта миграции URL портала novostroyki-borisoglebsk.ru

Дата обновления: 2026-07-13

Репозиторий: `deputat36/bm`.

## 1. Рабочая структура

```text
/
/catalog/
/catalog/prostornaya-4a/
/catalog/aerodromnaya-18g/
/catalog/sennaya-76/
/developers/
/developers/bm-group/
/ipoteka/
/guides/
/news/
/contacts/
/about/
/sources/
/legal/
/privacy/
/personal-data-consent/
/advertising/
/karta-sayta/
/spasibo/
```

Корень уже работает как независимый городской портал. Внутренние разделы сохраняют `noindex,follow`, пока данные, формы и материалы не прошли финальную проверку.

## 2. Правило миграции

```text
старый URL → безопасная transition_page → перенос полезного содержания → проверенный целевой URL → серверный редирект
```

До выпуска серверного правила запрещены:

```text
meta refresh
JavaScript redirect
удаление старого файла
редирект всех URL на главную
цепочки перенаправлений
```

## 3. Машиночитаемый реестр

Все маршруты хранятся в:

```text
data/migration/legacy-routes.json
```

Проверка:

```bash
npm run validate:legacy
```

Обязательные поля:

```text
source_url
source_file
target_url
target_file
target_href
status
migration_action
redirect_phase
redirect_ready
blocking_reason
```

Допустимые действия:

```text
redirect        — после проверки выпустить серверный редирект
retain_content  — сначала перенести полезные данные или материалы
retire          — самостоятельная страница не имеет ценности и будет выведена из структуры
```

Для `retain_content` обязательно поле `content_migration_status`.

## 4. Первая очередь

| Старый URL | Целевой URL | Действие |
|---|---|---|
| `/portal-preview/` | `/` | redirect |
| `/novostroyki/` | `/catalog/` | redirect |
| `/zhk/` | `/catalog/` | redirect |
| `/zastroyschiki/` | `/developers/` | redirect |
| `/spravochnik/` | `/guides/` | redirect |
| `/novosti/` | `/news/` | redirect |

Все страницы первой очереди переведены в `transition_page`, закрыты от индексации и очищены от старого брендинга и форм.

## 5. Вторая очередь: основные дубли Просторной 4А

| Старый URL | Целевой URL | Действие |
|---|---|---|
| `/prostornaya-4a/` | `/catalog/prostornaya-4a/` | redirect |
| `/zhk/tellermanov-sad/` | `/catalog/prostornaya-4a/` | redirect |
| `/o-zhk/` | `/catalog/prostornaya-4a/` | redirect |
| `/kvartiry/` | `/catalog/prostornaya-4a/` | redirect |
| `/planirovki/` | `/catalog/prostornaya-4a/` | redirect |
| `/ceny/` | `/catalog/prostornaya-4a/` | redirect |
| `/dokumenty/` | `/catalog/prostornaya-4a/` | retain_content |

Критические исправления:

- удалён canonical старого домена со страницы `/prostornaya-4a/`;
- удалена дублирующая форма со страницы `/zhk/tellermanov-sad/`;
- все URL получили `noindex,follow`;
- все обращения направляются в `catalog_prostornaya_4a_priority_lead`.

Аудит:

```text
docs/portal/LEGACY_OBJECT_PAGES_AUDIT_2026-07-13.md
```

## 6. Третья очередь: содержательные и тонкие страницы

| Старый URL | Целевой URL | Действие | Причина |
|---|---|---|---|
| `/galereya/` | `/catalog/prostornaya-4a/` | retain_content | проверить изображения и права публикации |
| `/infrastruktura/` | `/catalog/prostornaya-4a/` | retire | отсутствовало проверенное самостоятельное содержание |
| `/hod-stroitelstva/` | `/catalog/prostornaya-4a/` | retire | отсутствовали датированные фотоотчёты |
| `/zastroyschik/` | `/developers/` | redirect | сведения должны находиться в нейтральном справочнике |
| `/proektnaya-deklaratsiya-36-001139/` | `/catalog/prostornaya-4a/` | retain_content | реквизиты нужно сверить и перенести |
| `/faq/` | `/catalog/prostornaya-4a/` и `/guides/` | retain_content | вопросы нужно разделить по назначению |

На этих страницах удалены:

```text
canonical и OG старого домена
брендинг Этажи и BM Group
старая объектная навигация
устаревшие CTA и формы
FAQ schema с неподтверждёнными ответами
```

Аудит:

```text
docs/portal/LEGACY_OBJECT_PAGES_PHASE3_AUDIT_2026-07-13.md
```

## 7. Четвёртая очередь: служебные и справочные дубли

| Старый URL | Целевой URL | Действие | Причина |
|---|---|---|---|
| `/zayavka/` | `/contacts/` | redirect | старая страница содержала несколько форм с привязкой к одному ЖК |
| `/zastroyschiki/bm-group/` | `/developers/bm-group/` | redirect | старая карточка использовала архивную структуру и брендинг |

На `/zayavka/` удалены все самостоятельные формы. Пользователь получает ссылки на единую форму `/contacts/`, общий подбор и ипотечную консультацию.

Новая карточка `/developers/bm-group/` остаётся в `noindex,follow` и не выдаёт рабочую связь с Просторной 4А за окончательно подтверждённый факт.

## 8. Что переносится до редиректов

### Документы

Номера, даты и реквизиты переносятся только после сверки с первичными источниками. Источником истины должен быть профиль проекта, а не отдельная HTML-страница.

### Галерея

Для каждого изображения нужно подтвердить:

1. происхождение;
2. право публикации;
3. актуальность версии проекта;
4. корректную подпись;
5. предупреждение о возможном отличии результата строительства.

Реестр:

```text
data/media/prostornaya-4a.json
```

### FAQ

Общие вопросы переносятся в `/guides/`. Вопросы конкретного объекта — в карточку Просторной 4А. Ответы о цене, наличии, сроках и ипотеке публикуются только после актуальной проверки.

## 9. Служебные URL

| URL | Решение |
|---|---|
| `/zayavka/` | transition_page, будущий редирект на `/contacts/` |
| `/spasibo/` | сохранить как служебную страницу |
| `/privacy/` | сохранить в noindex до юридической проверки |
| `/personal-data-consent/` | сохранить в noindex до юридической проверки |
| `/legal/` | сохранить в noindex до юридической проверки |
| `/sources/` | сохранить как страницу прозрачности данных |
| `/advertising/` | сохранить как рабочую политику рекламных материалов |
| `/karta-sayta/` | сохранить как актуальную HTML-карту без legacy-ссылок |

## 10. Sitemap и robots

В `sitemap.xml` нельзя включать:

```text
transition_page
requires_check
is_public_ready=false
служебные страницы форм и благодарности
```

`robots.txt` должен указывать только sitemap домена `novostroyki-borisoglebsk.ru`.

## 11. Условия выпуска редиректа

Для каждого маршрута обязательны:

1. существующий целевой URL;
2. проверенные данные;
3. проверенная форма и системные ID;
4. юридическая валидация;
5. завершённый перенос `retain_content`;
6. определённая платформа размещения;
7. один серверный переход без цепочки;
8. сохранение UTM-параметров;
9. отсутствие старого URL в sitemap;
10. план отката.

## 12. Следующий этап

1. Сверить документы Просторной 4А по первичным источникам.
2. Проверить происхождение и права на семь визуализаций.
3. Провести контролируемый тест формы `/contacts/`.
4. Определить платформу размещения и синтаксис серверных редиректов.
5. После проверки помечать отдельные маршруты как `redirect_ready`.
