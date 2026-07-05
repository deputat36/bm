# Аудит ссылок и относительных путей

Дата фиксации: 2026-07-05

## 1. Назначение

Документ фиксирует ручную проверку относительных путей в новых черновых разделах портала.

Новые страницы пока закрыты от индексации через `noindex,follow`, поэтому задача аудита — убедиться, что перед будущим снятием `noindex` не будет сломанных CSS, JS, навигации и форм.

## 2. Проверенные правила путей

### Страницы первого уровня

Для страниц первого уровня:

```text
/novostroyki/
/zhk/
/zastroyschiki/
/spravochnik/
/sravnenie/
/portal-preview/
```

CSS и JS должны подключаться так:

```text
../assets/css/styles.css
../assets/js/main.js
```

### Страницы второго уровня

Для страниц второго уровня:

```text
/zhk/tellermanov-sad/
/zastroyschiki/bm-group/
```

CSS и JS должны подключаться так:

```text
../../assets/css/styles.css
../../assets/js/main.js
```

### Страницы третьего уровня

Для страниц третьего уровня:

```text
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
```

CSS и JS должны подключаться так:

```text
../../../assets/css/styles.css
../../../assets/js/main.js
```

### Статьи четвертого уровня

Для страниц четвертого уровня:

```text
/zhk/tellermanov-sad/novosti/chto-izvestno-o-zhk-tellermanov-sad/
```

CSS и JS должны подключаться так:

```text
../../../../assets/css/styles.css
../../../../assets/js/main.js
```

## 3. Что уже проверено вручную

- `/novostroyki/` подключает `../assets/css/styles.css` и `../assets/js/main.js`.
- `/zhk/tellermanov-sad/` подключает `../../assets/css/styles.css` и `../../assets/js/main.js`.
- `/zhk/tellermanov-sad/contacts/` подключает `../../../assets/css/styles.css` и `../../../assets/js/main.js`.
- `/portal-preview/` подключает `../assets/css/styles.css` и `../assets/js/main.js`.
- Новые формы получили `data-lead-type`, `data-project`, `data-project-id`, `data-project-name` и при необходимости `data-complex-id`.

## 4. Что нужно проверить перед публикацией

- [ ] Открыть каждую новую страницу в браузере.
- [ ] Проверить загрузку CSS.
- [ ] Проверить отсутствие ошибок JS в консоли.
- [ ] Проверить отправку тестовой заявки на `/portal-preview/`.
- [ ] Проверить отправку тестовой заявки на `/novostroyki/`.
- [ ] Проверить отправку тестовой заявки на `/zhk/tellermanov-sad/`.
- [ ] Проверить отправку тестовой заявки на `/zhk/tellermanov-sad/contacts/`.
- [ ] Проверить, что thank-you redirect ведет на `/spasibo/`.
- [ ] Проверить, что в заявке есть `project_id`, `project_name`, `residential_complex_id`, `lead_type`, `page_url`, UTM и consent.

## 5. Статус

Черновая структура выглядит согласованной, но перед снятием `noindex` нужна визуальная проверка в браузере и тестовые заявки.

`sitemap.xml` и canonical пока не обновляются намеренно.
