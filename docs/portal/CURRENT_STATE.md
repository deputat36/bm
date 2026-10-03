# Точка продолжения портала

Дата сверки: 2026-10-03.

Подробный статус: [STATUS.md](STATUS.md). Этот файл служит кратким входом в работу; исторические результаты сохраняются отдельно.

## Что завершено

- 14 форм на 7 страницах; единственный транспорт `newbuild-lead` → `public.newbuild_leads`.
- Исправления placement, lead_form_view, storage и browser-приёмка после #153: production desktop, Android Chromium, iPhone WebKit emulation — по 15/15 runs и 2/2 storage cases.
- Visual QA: 21 capture; accessibility и keyboard QA: по 14 audits согласно STATUS.
- Короткие primary-формы без обязательного имени, intent и CTA context handoff (#231–#237).
- Sitemap, robots/noindex и guide registry синхронизированы (#254/#257/#259/#262).
- Последние merged #269 и #271 исправили source framing 18Г и четыре legacy aliases.

Поздняя эмуляция не является физическим тестом. Исторические `0 passed / 14 failed / 28 blocked` от 03.08 не являются текущим browser state и не переписываются.

## Что пока не доказано

- Controlled real lead не выполнена; цепочка запись → ответственный → контакт → квалификация → консультация не принята end-to-end.
- Production live analytics не подтверждена.
- Operations: approved=1/8, pending=7/8, activation=false.
- Legal owner review и mobile/manual release policy остаются отдельными решениями.
- На read-only проверке 01.10, указанной в #79, принято 0 заявок; это датированное evidence, не новый запрос к базе 03.10.
- В реестре первой волны фактических публикаций нет; Search Console verification/inspection не подтверждены.

## Публикация на домене: подтверждённое расхождение

PR #274 слит (`71281c7`): custom Pages workflow собирает `_site`, семь public-safe JSON views и исключает internal roots/uncleared gallery. Все 13 PR checks прошли; Chromium desktop/mobile QA дал 14 captures. Реальный custom artifact `11270069478` проверен: 184 tar files, внутренние файлы и withheld values отсутствуют.

Однако live HTTP проверка 03.10 вечером всё ещё получила 200 для `/docs/portal/STATUS.md` и `/supabase/functions/newbuild-lead/index.ts`; в live JSON Аэродромной 18Г остаются 15 withheld values. Поэтому #272 остаётся открытой: успешная custom сборка не является принятием домена.

Параллельно выполняется managed `pages build and deployment`. Остаточный admin blocker #242: Settings → Pages → Source → GitHub Actions. После переключения требуется повторная custom выкладка и live acceptance. Не считать этот настройочный шаг выполненным без evidence.

`Live publication boundary` проверяет домен после выкладок и ежедневно; PR проверяет только mock-контракт, без внешних запросов. Live failure сохраняет отчёт с HTTP статусами и кодами ошибок без response bodies. Он не выключает сайт, не меняет release gates и не отправляет заявки.

## Следующий коммерческий шаг

Использовать [конкретный пакет согласования](LEAD_OPERATIONS_APPROVAL.md#пакет-ограниченного-запуска-03102026), получить недостающие owner/legal факты, применить утверждённые решения и отдельно разрешённую активацию, затем выполнить ровно одну согласованную real lead с серверным и операционным evidence.

Общий подбор и ипотечная консультация имеют отдельные prepared placements. BM Group approval относится только к covered object-specific рекламе Просторной 4А и не является глобальным запретом общего подбора. Общая кампания всё равно требует всех восьми campaign_launch gates; object indexing и городской completeness этим не повышаются.

## Источники истины

- [#71](https://github.com/deputat36/bm/issues/71) — P0 и позднее browser evidence;
- [#79](https://github.com/deputat36/bm/issues/79) и последние комментарии — roadmap и датированное live evidence;
- `data/operations/lead-operations-approval.json` — решения и активация;
- `data/legal/legal-owner-approval.json` — юридические решения;
- `data/qa/mobile-release-policy.json` — mobile policy;
- `data/release/real-lead-test.json` — согласие и результаты controlled lead;
- `data/analytics/live-provider.json` — внешний счётчик;
- `data/release/manual-gates.json` — ручные gates;
- `data/marketing/first-wave.json` и `campaign-publications.json` — план и факт публикаций.

Не повторять широкий source search без нового документа/доступа. Не начинать Figma или новый редизайн вместо активации обработки и получения доказанных заявок.
