# CI smoke: HTML sitemap coverage

Дата: 2026-07-13

Ветка запускает pull request проверки после добавления команды:

```text
npm run validate:html-sitemap
```

Проверяются соответствие `karta-sayta/index.html` реестру `data/pages/index.json`, отсутствие ссылок на draft/archived страницы и полный набор Portal guards.
