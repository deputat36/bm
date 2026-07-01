# Перенос MVP в отдельный репозиторий

## Цель

Вынести папку `novostroyki-borisoglebsk/` в отдельный репозиторий под домен:

`novostroyki-borisoglebsk.ru`

## Рекомендуемый репозиторий

`deputat36/novostroyki-borisoglebsk`

## Что перенести

Из текущего репозитория перенести содержимое папки:

`novostroyki-borisoglebsk/`

В корень нового репозитория.

## После переноса

В корне нового репозитория должны быть:

- `index.html`
- `CNAME`
- `robots.txt`
- `sitemap.xml`
- `404.html`
- `assets/css/city.css`
- `catalog/`
- `contacts/`
- `ipoteka/`
- `guides/`

## GitHub Pages

1. Открыть Settings репозитория.
2. Перейти в Pages.
3. Source: Deploy from a branch.
4. Branch: `main`.
5. Folder: `/root`.
6. Custom domain: `novostroyki-borisoglebsk.ru`.
7. Включить Enforce HTTPS после проверки DNS.

## DNS

A-записи для корня домена:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

CNAME для `www`:

`deputat36.github.io.`

## Важно

Текущий сайт `tellermanovsad.ru` не трогать до запуска нового домена.
После запуска нового сайта решить: закрыть старый сайт, оставить как прототип или сделать редирект.
