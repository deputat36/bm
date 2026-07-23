# Figma Project Detail Screen Handoff

## Назначение

`27 Screen · Project Detail` переносит в Figma три действующие карточки объектов:

- `catalog/prostornaya-4a/index.html`;
- `catalog/aerodromnaya-18g/index.html`;
- `catalog/sennaya-76/index.html`.

Экран не усредняет объекты. Он сохраняет три разных уровня доказательности и собирается из существующих Portal v2 components.

## Figma-файл

- File key: `rhFYa5gPDhF009hZsfEGSX`
- Страница: `27 Screen · Project Detail`
- Generator: `tools/figma/generate-portal-v2-project-detail-screen.mjs`
- Generated root key: `project-detail-screen`

Физический запуск выполняется одним атомарным `Figma.use_figma` call. При ошибке выполнение останавливается без заявления о частичных изменениях.

## Экраны

Generator создаёт шесть frames:

- `Project Detail / Prostornaya / Desktop`;
- `Project Detail / Prostornaya / Mobile`;
- `Project Detail / Aerodromnaya / Desktop`;
- `Project Detail / Aerodromnaya / Mobile`;
- `Project Detail / Sennaya / Desktop`;
- `Project Detail / Sennaya / Mobile`.

Screen keys:

- `project-detail-prostornaya-4a-desktop`;
- `project-detail-prostornaya-4a-mobile`;
- `project-detail-aerodromnaya-18g-desktop`;
- `project-detail-aerodromnaya-18g-mobile`;
- `project-detail-sennaya-76-desktop`;
- `project-detail-sennaya-76-mobile`.

## Общие секции

Каждый frame содержит восемь section-key:

1. `header`;
2. `hero`;
3. `highlights`;
4. `evidence`;
5. `verification`;
6. `faq`;
7. `lead`;
8. `footer`.

## Доказательные профили

### Просторная 4А

Профиль опирается на официальную страницу проекта BM Group и публичные документы. В Figma сохраняются подтверждённые характеристики проекта, но цена, наличие, конкретные планировки, скидки, рассрочка, бронь и применимость ипотеки остаются проверяемыми перед консультацией.

Metadata:

- source: `catalog/prostornaya-4a/index.html`;
- verification profile: `data/verification/prostornaya-4a.json`;
- quick form: `catalog_prostornaya_4a_quick_consultation`;
- detailed form: `catalog_prostornaya_4a_priority_lead`.

### Аэродромная 18Г

Название ЖК «Патриот» подтверждено владельцем проекта, но сведения секции, ввода, продавца и договора не выводятся как автоматически подтверждённые. Атрибутированные характеристики ЦИАН отделены от юридических фактов сделки.

Metadata:

- source: `catalog/aerodromnaya-18g/index.html`;
- verification profile: `data/verification/aerodromnaya-18g.json`;
- quick form: `catalog_aerodromnaya_18g_quick_consultation`;
- detailed form: `catalog_aerodromnaya_18g_priority_lead`.

### Сенная 76

Профиль показывает публичные заявления главного инженера о материалах, отоплении, благоустройстве и инженерии. Эти заявления не заменяют разрешение на ввод, ЕГРН, документы продавца и проверку конкретной квартиры.

Metadata:

- source: `catalog/sennaya-76/index.html`;
- verification profile: `data/verification/sennaya-76.json`;
- quick form: `catalog_sennaya_76_quick_consultation`;
- detailed form: `catalog_sennaya_76_priority_lead`.

## Использованные ComponentSet

- Top Navigation;
- Button;
- Fact Card;
- Lead Form Card;
- Content Card;
- FAQ Accordion;
- Site Footer.

Новый ComponentSet не создаётся. Итог сохраняется на уровне 14 ComponentSet и 119 вариантов.

## Размеры

- Desktop: frame 1440 px, content width 1200 px;
- Mobile: frame 360 px, content width 336 px.

Все структурные контейнеры используют auto-layout. Desktop и Mobile создаются как отдельные frames, а не масштабированные копии.

## Forms и routes

Каждая Lead Form Card хранит:

- `portal-v2/form-id`;
- `portal-v2/lead-type = project_consultation`;
- `portal-v2/project = Портал Новостройки Борисоглебска`;
- `portal-v2/complex`;
- `portal-v2/complex-id`.

Hero actions сохраняют реальные маршруты production-страниц, включая anchors, ипотечный раздел и форму консультации.

## Verification metadata

Каждый screen и verification section хранит `portal-v2/verification-profile`. Карточки подтверждённого и проверяемого состояния дополнительно получают:

- `portal-v2/verification-state = confirmed`;
- `portal-v2/verification-state = pending`.

## Юридическая безопасность

Экран не должен:

- позиционировать портал как официальный сайт застройщика;
- обещать фактическое наличие;
- фиксировать цену или бронь;
- гарантировать ипотеку;
- выдавать рекламную площадку или интервью за полный комплект первичных документов;
- объединять три объекта в один уровень достоверности.

## Интеграция в пакеты

После применения migration:

- Figma Execution Pack содержит 29 атомарных шагов;
- последняя страница — `27 Screen · Project Detail`;
- Figma Visual QA Pack содержит 24 audit payload;
- screen page audits: 9;
- screenshot targets: 36;
- source-map содержит 9 экранов;
- ComponentSet остаётся 14, вариантов — 119.

## Visual QA

После восстановления Figma MCP нужно получить:

- page ID и generated root ID;
- IDs всех шести frames;
- шесть screenshots;
- missingFonts;
- detachedInstances;
- overflowCandidates;
- routeNodes и formNodes;
- все восемь section-key;
- verification profile и verification state metadata.

Результаты фиксируются в issue №116.

## Ограничение Figma Starter

Месячный лимит Figma MCP Starter исчерпан. Generator и validators готовы, но физические Figma-слои, node IDs и screenshots не заявляются до успешного выполнения Execution Pack.
