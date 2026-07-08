# Чек-лист ручной проверки MVP портала

Документ нужен для проверки PR `feature/portal-mvp` перед merge и запуском портала `novostroyki-borisoglebsk.ru`.

## 1. Общая проверка портала

- [ ] Главная страница открывается и выглядит как городской портал, а не как сайт одного ЖК.
- [ ] Главная страница воспринимается как каталог всех новостроек Борисоглебска.
- [ ] В шапке нет визуальной привязки к одному застройщику.
- [ ] В футере есть дисклеймер о том, что портал является информационным городским каталогом.
- [ ] Основная навигация ведет на рабочие страницы.
- [ ] На мобильной ширине шапка, карточки, таблицы и формы не ломаются.

## 2. Основные городские разделы

Проверить открытие, заголовки, canonical, ссылки и CTA:

- [ ] `/`
- [ ] `/novostroyki/`
- [ ] `/kvartiry-v-novostroykakh/`
- [ ] `/planirovki/`
- [ ] `/ceny/`
- [ ] `/ipoteka/`
- [ ] `/zastroyschiki/`
- [ ] `/rayony/`
- [ ] `/faq/`
- [ ] `/contacts/`
- [ ] `/karta-sayta/`
- [ ] `/privacy/`

## 3. Страницы ЖК «Теллерманов сад»

Проверить открытие, внутренние ссылки, хлебные крошки и дисклеймеры:

- [ ] `/zhk/tellermanov-sad/`
- [ ] `/zhk/tellermanov-sad/kvartiry/`
- [ ] `/zhk/tellermanov-sad/planirovki/`
- [ ] `/zhk/tellermanov-sad/ceny/`
- [ ] `/zhk/tellermanov-sad/ipoteka/`
- [ ] `/zhk/tellermanov-sad/dokumenty/`
- [ ] `/zhk/tellermanov-sad/galereya/`
- [ ] `/zhk/tellermanov-sad/hod-stroitelstva/`
- [ ] `/zhk/tellermanov-sad/faq/`
- [ ] `/zhk/tellermanov-sad/zastroyschik/`
- [ ] `/zhk/tellermanov-sad/infrastruktura/`

## 4. Guide-раздел

Guide-страницы пока являются заготовками. Проверить, что они открываются и не дают 404:

- [ ] `/guides/`
- [ ] `/guides/kak-vybrat-kvartiru-v-novostroyke/`
- [ ] `/guides/kak-sravnit-novostroyki/`
- [ ] `/guides/kak-vybrat-planirovku/`

## 5. Старые URL и временный перенос

Старые страницы должны быть закрыты от индексации через `noindex,follow` и указывать canonical на новую структуру:

- [ ] `/o-zhk/` → `/zhk/tellermanov-sad/`
- [ ] `/kvartiry/` → `/zhk/tellermanov-sad/kvartiry/`
- [ ] `/dokumenty/` → `/zhk/tellermanov-sad/dokumenty/`
- [ ] `/galereya/` → `/zhk/tellermanov-sad/galereya/`
- [ ] `/zastroyschik/` → `/zhk/tellermanov-sad/zastroyschik/`
- [ ] `/infrastruktura/` → `/zhk/tellermanov-sad/infrastruktura/`
- [ ] `/hod-stroitelstva/` → `/zhk/tellermanov-sad/hod-stroitelstva/`
- [ ] `/proektnaya-deklaratsiya-36-001139/` → `/zhk/tellermanov-sad/dokumenty/`
- [ ] `/prostornaya-4a/` → `/zhk/tellermanov-sad/`
- [ ] `/novostroyka-borisoglebsk/` → `/novostroyki/`
- [ ] `/kvartiry-ot-zastroyschika-borisoglebsk/` → `/kvartiry-v-novostroykakh/`

## 6. SEO-проверка

- [ ] `sitemap.xml` открывается и содержит основные городские страницы.
- [ ] `sitemap.xml` содержит страницы ЖК.
- [ ] `sitemap.xml` содержит `/guides/` и три guide-страницы.
- [ ] `robots.txt` указывает на `https://novostroyki-borisoglebsk.ru/sitemap.xml`.
- [ ] На новых страницах canonical указывает на `https://novostroyki-borisoglebsk.ru/...`.
- [ ] В новых страницах нет canonical на старый домен.
- [ ] Пустые или временные старые страницы закрыты от индексации.
- [ ] Проверен новый документ `docs/seo-strategy-portal-catalog.md`.
- [ ] Главная `/` соответствует стратегии: это каталог всех новостроек, а не страница одного ЖК.

## 7. Формы и лидогенерация

Проверить формы без отправки реальных заявок или с тестовыми данными:

- [ ] Форма на главной.
- [ ] Форма на `/contacts/`.
- [ ] Форма на странице ЖК.
- [ ] Формы на страницах цен, планировок, квартир и ипотеки.
- [ ] У форм разные `lead_type` и `form_id`.
- [ ] После отправки показывается понятный статус.
- [ ] В скрытые поля передаются UTM и данные страницы.

## 8. Юридическая и смысловая проверка

- [ ] Портал не называется официальным сайтом застройщика.
- [ ] Заявка не описывается как бронь.
- [ ] Цена не обещается без подтверждения.
- [ ] Ипотечные условия не обещаются как гарантированные.
- [ ] По документам есть оговорка о проверке актуальных источников.
- [ ] В текстах нет формулировок от имени застройщика.

## 9. Что не делать до решения по доменам

- [ ] Не мержить PR, если не решено, какой домен становится основным.
- [ ] Не включать настоящие 301-редиректы без решения по `tellermanovsad.ru`.
- [ ] Не индексировать старые страницы как самостоятельные дубли.
- [ ] Не расширять guide-страницы спорными юридическими или финансовыми утверждениями без отдельной проверки.

## 10. Следующий технический шаг

Перед merge нужно подтянуть актуальный `main`, потому что ветка `feature/portal-mvp` существенно отстает от основной ветки. После подтягивания проверить конфликты, особенно в `index.html`, `sitemap.xml`, `robots.txt`, старых URL и страницах ЖК.
