# Чек-лист подключения домена к GitHub Pages

Основной домен: `tellermanovsad.ru`

## Текущее состояние в репозитории

Сделано:

- домен куплен на Beget;
- в корень репозитория добавлен файл `CNAME` со значением `tellermanovsad.ru`;
- `robots.txt` переведён на `https://tellermanovsad.ru/sitemap.xml`;
- `sitemap.xml` переведён на URL нового домена;
- на главной добавлены canonical, og:url, абсолютный og:image и url в JSON-LD.

## DNS Beget

Для основного домена нужны 4 A-записи GitHub Pages:

- 185.199.108.153
- 185.199.109.153
- 185.199.110.153
- 185.199.111.153

Для `www` нужна одна CNAME-запись на `deputat36.github.io.`.

У `www` не должно быть A, MX и TXT записей.

MX и TXT у основного домена можно оставить, если планируется почта через Beget.

## NS домена

Если Beget отвечает `Non-existent domain`, значит домен ещё не делегировался или DNS-зона Beget не активна.

В панели Beget у домена должны быть включены DNS-серверы Beget. Обычно это `ns1.beget.com`, `ns2.beget.com`, `ns1.beget.pro`, `ns2.beget.pro` или аналогичный набор Beget.

## GitHub Pages

В репозитории `deputat36/bm` нужно открыть Settings → Pages.

Там должно быть:

- Custom domain: `tellermanovsad.ru`;
- после проверки DNS нужно включить Enforce HTTPS.

## Проверка после запуска

Проверить:

- открывается `https://tellermanovsad.ru/`;
- открывается или перенаправляется `https://www.tellermanovsad.ru/`;
- открывается `https://tellermanovsad.ru/sitemap.xml`;
- открывается `https://tellermanovsad.ru/robots.txt`;
- на сайте указан телефон `8 903 857-69-09`;
- страница `/dokumenty/` открывается;
- страница `/proektnaya-deklaratsiya-36-001139/` открывается;
- в GitHub Pages включён HTTPS.

## Что ещё нужно до рекламы

1. Подключить Web3Forms, Supabase или CRM-обработчик заявок.
2. Подключить Яндекс.Метрику.
3. Проверить цели аналитики.
4. Дозагрузить все рендеры ЖК в хорошем качестве.
5. Проверить сайт с телефона.
