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
/ipoteka/
/guides/
/news/
/contacts/
/privacy/
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

## 7. Что переносится до редиректов

### Документы

Номера, даты и реквизиты переносятся только после сверки с первичными источниками. Источником истины должен быть профиль проекта, а не отдельная HTML-страница.

### Галерея

Для каждого изображения нужно подтвердить:

1. происхождение;
2. право публикации;
3. актуальность версии проекта;
4. корректную подпись;
5. предупреждение о возможном отличии результата строительства.

### FAQ

Общие вопросы переносятся в `/guides/`. Вопросы конкретного объекта — в карточку Просторной 4А. Ответы о цене, наличии, сроках и ипотеке публикуются только после актуальной проверки.

## 8. Служебные URL

| URL | Решение |
|---|---|
| `/zayavka/` | оставить закрытой от индексации до решения о назначении |
| `/spasibo/` | сохранить как служебную страницу |
| `/privacy/` | сохранить |
| `/personal-data-consent/` | сохранить |
| `/legal/` | проверить и сохранить |
| `/sources/` | проверить и сохранить |

## 9. Sitemap и robots

В `sitemap.xml` нельзя включать:

```text
transition_page
requires_check
is_public_ready=false
служебные страницы форм и благодарности
```

`robots.txt` должен указывать только sitemap домена `novostroyki-borisoglebsk.ru`.

## 10. Условия выпуска редиректа

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

## 11. Следующий этап

1. Перенести проверенные документные сведения в профиль и карточку Просторной 4А.
2. Провести инвентаризацию изображений галереи.
3. Подготовить безопасный FAQ в структуре карточки и справочника.
4. Определить платформу размещения и синтаксис серверных редиректов.
5. Провести контролируемый тест основной формы.
6. После проверки помечать отдельные маршруты как `redirect_ready`.