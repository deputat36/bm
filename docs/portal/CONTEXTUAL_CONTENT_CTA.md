# Контекстные CTA в справочных разделах

Дата обновления: 2026-07-14

## Цель

Справочник, новости и раздел застройщиков должны помогать пользователю перейти от изучения информации к консультации, но не должны превращаться в набор повторяющихся форм.

Используется маршрут:

```text
справочный материал
→ контекстная кнопка
→ существующая короткая форма
→ подробная квалификация после первого контакта
```

## Охваченные страницы

1. `/guides/` — общий справочник.
2. `/news/` — новости и обновления.
3. `/developers/` — справочный раздел о застройщиках.
4. `/guides/proverka-dokumentov-novostroyki/`.
5. `/guides/proektnaya-deklaratsiya/`.
6. `/guides/kak-vybrat-planirovku/`.

## Целевые формы

Контекстные кнопки направляют только к существующим первичным формам:

```text
/catalog/?lead_source=internal_content&placement=<placement>#quick-lead
/contacts/?lead_source=internal_content&placement=<placement>#quick-lead
/ipoteka/?lead_source=internal_content&placement=<placement>#quick-lead
```

Переход к подробному якорю `#lead` из редакционного контента запрещён.

## Внутренняя атрибуция

Каждая ссылка передаёт только два разрешённых параметра:

```text
lead_source=internal_content
placement=<точное размещение кнопки>
```

Они уже входят в `TRACKING_KEYS` файла `assets/js/main.js`. При открытии целевой страницы существующий tracking-контур:

1. распознаёт входящие параметры;
2. обновляет `last_touch`;
3. сохраняет страницу назначения и браузерный referrer;
4. сохраняет `lead_source` и `placement` в `tracking.current`;
5. добавляет весь tracking-контекст в данные заявки.

Внешние UTM-метки при этом не заменяются внутренними UTM-метками. Контекстная навигация не использует `utm_source`, `utm_medium`, `utm_campaign` и `utm_content`.

## Размещения аналитики

```text
guides_hero
news_hero
developers_hero
guide_documents_footer
guide_declaration_footer
guide_layout_footer
```

Основные действия:

```text
quick_selection
quick_mortgage
```

Каждый клик создаёт обычное событие `lead_cta_click` через `conversion-tracking.js`.

## Локальная проверка

На страницах подключён `analytics-debug.js` перед `conversion-tracking.js`. Безопасная проверка выполняется с параметрами:

```text
?lead_test=dry-run&analytics_test=debug&test_ack=1
```

В этом режиме клик записывается только в локальный журнал и не отправляется в рабочие счётчики.

## Ограничения

- новые формы на справочных страницах не создаются;
- персональные данные на этих страницах не собираются;
- страницы сохраняют `noindex,follow`;
- кнопки не обещают цену, наличие, бронь, одобрение ипотеки или подтверждённость объекта;
- юридические и справочные предупреждения сохраняются;
- целевая страница обязана содержать `id="quick-lead"` внутри `data-primary-lead`;
- query-параметры с персональными данными, test/debug и рекламными UTM запрещены;
- значение query-параметра `placement` должно совпадать с `data-track-placement`.

## Автоматическая проверка

Команда:

```bash
npm run validate:contextual-conversion
```

Validator проверяет:

- шесть справочных страниц;
- двенадцать контекстных CTA;
- короткий якорь `#quick-lead`;
- `lead_source=internal_content`;
- совпадение query `placement` и `data-track-placement`;
- только два разрешённых query-параметра;
- отсутствие UTM, test/debug и персональных параметров;
- `data-track-action` и `data-track-placement`;
- наличие класса `button`;
- отсутствие самостоятельных лид-форм;
- отсутствие переходов к `#lead`;
- порядок подключения debug и tracking-скриптов;
- наличие первичной формы на каждой целевой странице;
- поддержку `lead_source` и `placement` в существующем tracking-контуре.
