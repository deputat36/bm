# Карта переноса старых URL в структуру портала

Документ фиксирует старые адреса сайта одного ЖК и целевые страницы городского портала `novostroyki-borisoglebsk.ru`.

## Уже обработано в ветке `feature/portal-mvp`

| Старый URL | Новый URL | Статус |
|---|---|---|
| `/o-zhk/` | `/zhk/tellermanov-sad/` | старая страница заменена страницей переноса с `noindex` и canonical |
| `/kvartiry/` | `/zhk/tellermanov-sad/kvartiry/` | старая страница заменена страницей переноса с `noindex` и canonical |
| `/dokumenty/` | `/zhk/tellermanov-sad/dokumenty/` | старая страница заменена страницей переноса с `noindex` и canonical |
| `/galereya/` | `/zhk/tellermanov-sad/galereya/` | старая страница заменена страницей переноса с `noindex` и canonical |
| `/zastroyschik/` | `/zhk/tellermanov-sad/zastroyschik/` | старая страница заменена страницей переноса с `noindex` и canonical |
| `/infrastruktura/` | `/zhk/tellermanov-sad/infrastruktura/` | старая страница заменена страницей переноса с `noindex` и canonical |
| `/hod-stroitelstva/` | `/zhk/tellermanov-sad/hod-stroitelstva/` | старая страница заменена страницей переноса с `noindex` и canonical |
| `/proektnaya-deklaratsiya-36-001139/` | `/zhk/tellermanov-sad/dokumenty/` | старая страница заменена страницей переноса с `noindex` и canonical |
| `/prostornaya-4a/` | `/zhk/tellermanov-sad/` | старая страница заменена страницей переноса с `noindex` и canonical |
| `/novostroyka-borisoglebsk/` | `/novostroyki/` | старая страница заменена страницей переноса с `noindex` и canonical |
| `/kvartiry-ot-zastroyschika-borisoglebsk/` | `/kvartiry-v-novostroykakh/` | старая страница заменена страницей переноса с `noindex` и canonical |

## Созданные новые страницы в структуре портала

| Новый URL | Назначение |
|---|---|
| `/guides/` | раздел информационных материалов |
| `/guides/kak-vybrat-kvartiru-v-novostroyke/` | заготовка guide-страницы |
| `/guides/kak-sravnit-novostroyki/` | заготовка guide-страницы |
| `/guides/kak-vybrat-planirovku/` | заготовка guide-страницы |
| `/zhk/tellermanov-sad/galereya/` | галерея ЖК в новой структуре |
| `/zhk/tellermanov-sad/hod-stroitelstva/` | ход строительства ЖК |
| `/zhk/tellermanov-sad/faq/` | FAQ по ЖК |
| `/zhk/tellermanov-sad/zastroyschik/` | сведения о застройщике по ЖК |
| `/zhk/tellermanov-sad/infrastruktura/` | инфраструктура и локация ЖК |

## Добавлено в sitemap

В `sitemap.xml` добавлены городские хабы, основные дочерние страницы ЖК, `/zhk/tellermanov-sad/galereya/`, `/guides/` и три стартовые guide-страницы.

## Рекомендация для настоящего запуска

Для GitHub Pages страницы переноса с `noindex` и canonical являются временным решением. После решения по доменам лучше настроить настоящие 301-редиректы на уровне хостинга или CDN.

Если `tellermanovsad.ru` остается отдельным лендингом, не нужно слепо редиректить все страницы. В этом случае старый домен должен иметь уникальные тексты и canonical на себя, а городской портал должен развиваться как отдельный каталог.

Если главным становится `novostroyki-borisoglebsk.ru`, старые URL сайта одного ЖК лучше направить на соответствующие страницы `/zhk/tellermanov-sad/`.
