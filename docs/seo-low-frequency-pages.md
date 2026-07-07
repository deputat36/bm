# Низкочастотные SEO-страницы портала

Дата фиксации: 2026-07-05

## 1. Назначение

Низкочастотные страницы нужны, чтобы постепенно собрать поисковый спрос вокруг новостроек Борисоглебска без превращения портала в сайт одного застройщика.

Страницы создаются как черновики с `noindex,follow`. В sitemap их можно добавлять только после проверки текста, данных, юридической безопасности и форм.

## 2. Уже добавленные черновики

```text
/novostroyki/kvartiry-v-novostroykah/
/spravochnik/proverka-dokumentov-novostroyki/
```

## 3. Коммерческие страницы

Приоритетные коммерческие страницы:

```text
/novostroyki/kvartiry-v-novostroykah/
/novostroyki/studii/
/novostroyki/odnokomnatnye/
/novostroyki/dvuhkomnatnye/
/novostroyki/trehkomnatnye/
/novostroyki/ipoteka/
/novostroyki/semejnaya-ipoteka/
/novostroyki/materinskij-kapital/
```

Эти страницы должны вести к каталогу, карточкам ЖК и форме подбора, а не обещать наличие квартир или фиксированные цены без подтверждения.

## 4. Информационные страницы

Приоритетные справочные страницы:

```text
/spravochnik/proverka-dokumentov-novostroyki/
/spravochnik/proektnaya-deklaratsiya/
/spravochnik/razreshenie-na-stroitelstvo/
/spravochnik/kak-vybrat-planirovku/
/spravochnik/kak-kupit-kvartiru-v-novostroyke/
/spravochnik/chto-proverit-pered-pokupkoj/
```

## 5. Правила публикации

1. До проверки каждая страница должна иметь `noindex,follow`.
2. В `data/pages/index.json` статус должен быть `draft`.
3. Нельзя публиковать неподтвержденные цены как факт.
4. Нельзя называть страницу официальной страницей ЖК или застройщика.
5. В тексте должен быть дисклеймер, если материал справочный.
6. На коммерческих страницах форма заявки не должна называться бронью.
7. Перед переводом в `published` нужно пройти `npm run validate` и `npm run validate:json`.

## 6. Структура страницы

Рекомендуемая структура:

1. Hero с понятным H1.
2. Короткое объяснение для покупателя.
3. Блоки выбора или чек-лист.
4. Ссылки на каталог, ЖК, сравнение или справочник.
5. Юридически безопасная форма заявки.
6. Дисклеймер по статусу данных.

## 7. Ближайшие страницы для добавления

1. `/spravochnik/proektnaya-deklaratsiya/`
2. `/spravochnik/kak-vybrat-planirovku/`
3. `/novostroyki/semejnaya-ipoteka/`
4. `/novostroyki/studii/`
5. `/novostroyki/dvuhkomnatnye/`
