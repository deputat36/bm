import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Project Detail screens", "HORIZONTAL");
stage.itemSpacing = 64;
root.appendChild(stage);

const localComponents = await figma.getLocalComponentsAsync();
function localVariant(setName, fragments) {
  const result = localComponents.find((item) => {
    const parent = item.parent;
    return parent && parent.type === "COMPONENT_SET" && parent.name === setName && fragments.every((fragment) => item.name.includes(fragment));
  });
  if (!result) throw new Error("Missing dependency variant: " + setName + " / " + fragments.join(" / "));
  return result;
}
function nestedPropertyKey(instance, prefix) {
  const key = Object.keys(instance.componentProperties).find((item) => item === prefix || item.startsWith(prefix + "#"));
  if (!key) throw new Error("Missing nested component property: " + prefix);
  return key;
}
function setInstanceText(instance, prefix, value) {
  instance.setProperties({ [nestedPropertyKey(instance, prefix)]: value });
}
function setInstanceBoolean(instance, prefix, value) {
  instance.setProperties({ [nestedPropertyKey(instance, prefix)]: value });
}
function exposedByName(instance, name) {
  const result = instance.exposedInstances.find((item) => item.name === name);
  if (!result) throw new Error("Missing exposed instance: " + name);
  return result;
}
function appendInstance(parent, componentNode, name) {
  const instance = componentNode.createInstance();
  instance.name = name;
  parent.appendChild(instance);
  createdNodeIds.push(instance.id);
  return instance;
}
function setMeta(node, key, value) {
  node.setSharedPluginData("portal-v2", key, String(value));
}
function configureButton(parent, componentNode, label, route, objectId) {
  const instance = appendInstance(parent, componentNode, "Action / " + label);
  setInstanceText(instance, "Label", label);
  setMeta(instance, "route", route);
  if (objectId) setMeta(instance, "object-id", objectId);
  return instance;
}
function configureFact(parent, componentNode, value, label) {
  const instance = appendInstance(parent, componentNode, "Fact / " + value);
  setInstanceText(instance, "Value", value);
  setInstanceText(instance, "Label", label);
  return instance;
}
function configureContent(parent, componentNode, name, titleValue, descriptionValue) {
  const instance = appendInstance(parent, componentNode, name);
  setInstanceText(instance, "Title", titleValue);
  setInstanceText(instance, "Description", descriptionValue);
  setInstanceBoolean(instance, "Show action", false);
  return instance;
}
function configureFaq(parent, componentNode, name, question, answer) {
  const instance = appendInstance(parent, componentNode, name);
  setInstanceText(instance, "Question", question);
  setInstanceText(instance, "Answer", answer);
  return instance;
}
function configureLead(parent, componentNode, profile, scope) {
  const quick = scope === "Quick";
  const instance = appendInstance(parent, componentNode, profile.id + " / " + scope + " lead");
  setInstanceText(instance, "Eyebrow", quick ? "Заявка за 30 секунд" : profile.detailedEyebrow);
  setInstanceText(instance, "Title", quick ? profile.quickTitle : profile.detailedTitle);
  setInstanceText(instance, "Description", quick ? profile.quickDescription : profile.detailedDescription);
  setInstanceText(instance, "Consent text", "Согласен на обработку персональных данных для ответа на обращение. Заявка не является бронью и не фиксирует цену.");
  setInstanceText(instance, "Hint", quick ? profile.hint : "Заявка не является бронью и не фиксирует стоимость.");
  setInstanceBoolean(instance, "Show hint", quick);
  setInstanceBoolean(instance, "Show footer note", quick);
  if (quick) setInstanceText(instance, "Footer note", "Удобнее сразу обсудить? Позвонить специалисту");
  const submit = exposedByName(instance, "Submit action");
  setInstanceText(submit, "Label", quick ? profile.quickSubmit : profile.detailedSubmit);
  setMeta(instance, "form-id", quick ? profile.quickFormId : profile.detailedFormId);
  setMeta(instance, "lead-type", "project_consultation");
  setMeta(instance, "project", "Портал Новостройки Борисоглебска");
  setMeta(instance, "complex", profile.complex);
  setMeta(instance, "complex-id", profile.id);
  return instance;
}
async function addEyebrow(parent, value, width) {
  const badge = auto("Eyebrow", "HORIZONTAL");
  badge.primaryAxisAlignItems = "CENTER";
  badge.counterAxisAlignItems = "CENTER";
  bind(badge, "paddingLeft", spacing("sm"));
  bind(badge, "paddingRight", spacing("sm"));
  bind(badge, "paddingTop", spacing("xs"));
  bind(badge, "paddingBottom", spacing("xs"));
  radius(badge, radiusToken("pill"));
  fill(badge, primitive("coral/100"));
  stroke(badge, semantic("action/primary"));
  parent.appendChild(badge);
  await text(badge, value, { name: "Eyebrow label", styleName: "Typography/Label", width, color: semantic("action/primary/hover") });
}
async function addSectionHeader(parent, eyebrowValue, titleValue, descriptionValue, width) {
  const header = auto("Section header", "VERTICAL");
  bind(header, "itemSpacing", spacing("md"));
  parent.appendChild(header);
  if (eyebrowValue) await addEyebrow(header, eyebrowValue, Math.min(width, 320));
  await text(header, titleValue, { name: "Section title", styleName: "Typography/H2", width, color: semantic("text/primary") });
  await text(header, descriptionValue, { name: "Section description", styleName: "Typography/Body Large", width, color: semantic("text/muted") });
}
function createSection(screen, key, name, screenWidth, contentWidth, soft, desktop) {
  const section = auto(name, "VERTICAL");
  section.counterAxisSizingMode = "FIXED";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisAlignItems = "CENTER";
  section.resize(screenWidth, desktop ? 720 : 1180);
  section.paddingTop = desktop ? 80 : 56;
  section.paddingBottom = desktop ? 80 : 56;
  fill(section, semantic(soft ? "background/soft" : "surface/primary"));
  setMeta(section, "section-key", key);
  screen.appendChild(section);
  const container = auto(name + " container", "VERTICAL");
  container.counterAxisSizingMode = "FIXED";
  container.primaryAxisSizingMode = "AUTO";
  container.resize(contentWidth, desktop ? 620 : 1040);
  bind(container, "itemSpacing", spacing("xl"));
  section.appendChild(container);
  return container;
}
function createGrid(parent, name, desktop, gap = "lg") {
  const grid = auto(name, desktop ? "HORIZONTAL" : "VERTICAL");
  bind(grid, "itemSpacing", spacing(gap));
  parent.appendChild(grid);
  return grid;
}
async function addNotice(parent, value, width) {
  const notice = auto("Legal notice", "VERTICAL");
  notice.counterAxisSizingMode = "FIXED";
  notice.resize(width, 120);
  notice.paddingLeft = 20;
  notice.paddingRight = 20;
  notice.paddingTop = 18;
  notice.paddingBottom = 18;
  radius(notice, radiusToken("lg"));
  fill(notice, primitive("amber/100"));
  stroke(notice, primitive("amber/500"));
  parent.appendChild(notice);
  await text(notice, value, { name: "Notice text", styleName: "Typography/Body", width: width - 40, color: semantic("text/body") });
}

const profiles = [
  {
    id: "prostornaya-4a",
    short: "Prostornaya",
    complex: "Просторная 4А",
    title: "ЖК «Теллерманов сад»",
    eyebrow: "Старт продаж · комфорт-класс",
    lead: "Официальный проект BM Group на улице Просторной: два дома, 194 квартиры, закрытый двор, общедомовая котельная и улучшенная предчистовая отделка.",
    facts: [["2 дома", "в составе комплекса"], ["194", "квартиры в проекте"], ["2,7 м", "высота потолков"], ["I кв. 2028", "заявленный срок"]],
    notice: "Портал является независимым каталогом и не действует от имени застройщика. Характеристики сверены по официальной странице проекта 17 июля 2026 года. Цена и наличие уточняются на дату обращения.",
    quickTitle: "Получить подбор по «Теллерманову саду»",
    quickDescription: "Специалист проверит актуальный прайс, планировки и подходящий способ покупки.",
    quickSubmit: "Получить консультацию",
    hint: "Заявка не бронирует квартиру и не фиксирует цену.",
    detailedEyebrow: "Подробный подбор по ЖК «Теллерманов сад»",
    detailedTitle: "Указать параметры будущей квартиры",
    detailedDescription: "Сообщите комнатность, бюджет, способ и срок покупки. Специалист проверит актуальные предложения.",
    detailedSubmit: "Получить подбор квартир",
    quickFormId: "catalog_prostornaya_4a_quick_consultation",
    detailedFormId: "catalog_prostornaya_4a_priority_lead",
    source: "catalog/prostornaya-4a/index.html",
    verification: "data/verification/prostornaya-4a.json",
    heroRoute: "#apartments",
    heroLabel: "Какие квартиры будут",
    highlights: [
      ["Закрытый двор", "Заявлены пространство для отдыха, детских игр и спорта с ограниченным доступом."],
      ["Предчистовая отделка", "Состав отделки знакомит с проектом, но юридически значим договор выбранной квартиры."],
      ["Способы покупки", "Ипотека, материнский капитал, рассрочка и trade-in проверяются индивидуально."]
    ],
    evidenceEyebrow: "Документы проекта",
    evidenceTitle: "Первичные документы доступны для проверки",
    evidenceDescription: "Проектная декларация, разрешение на строительство и проект ДДУ проверяются в актуальной редакции перед сделкой.",
    confirmed: "Название, расположение, два дома, 194 квартиры, потолки, двор, котельная, отделка и опубликованные документы.",
    pending: "Цена, фактическое наличие, этажи, конкретные планировки, скидки, рассрочка, бронь и применимость ипотечной программы.",
    faq: ["Какие квартиры предусмотрены?", "От студий до четырёхкомнатных квартир. Актуальный выбор проверяется по шахматке."],
    footerTagline: "Независимая карточка проекта на улице Просторной."
  },
  {
    id: "aerodromnaya-18g",
    short: "Aerodromnaya",
    complex: "Аэродромная 18Г",
    title: "ЖК «Патриот» на Аэродромной 18Г",
    eyebrow: "Название подтверждено владельцем · документы секции проверяются отдельно",
    lead: "Название ЖК подтверждено владельцем проекта. Общие характеристики приведены по карточке ЦИАН, но статус секции, продавца и квартиры проверяется по первичным документам.",
    facts: [["кирпичный", "по карточке ЦИАН"], ["3–7 этажей", "диапазон площадки"], ["2,7 м", "нужна сверка секции"], ["черновая", "отделка площадки"]],
    notice: "Портал не является официальным сайтом застройщика. Название «Патриот» подтверждено владельцем; разрешение на ввод, ЕГРН, договор и продавец проверяются отдельно.",
    quickTitle: "Проверить вариант в ЖК «Патриот»",
    quickDescription: "Специалист сверит секцию, квартиру, документы и способ покупки.",
    quickSubmit: "Получить проверенный ответ",
    hint: "Заявка не является бронью и не фиксирует стоимость.",
    detailedEyebrow: "Подробная проверка",
    detailedTitle: "Указать квартиру, секцию и способ покупки",
    detailedDescription: "Специалист проверит предложение, документы и порядок сделки.",
    detailedSubmit: "Получить проверенный ответ",
    quickFormId: "catalog_aerodromnaya_18g_quick_consultation",
    detailedFormId: "catalog_aerodromnaya_18g_priority_lead",
    source: "catalog/aerodromnaya-18g/index.html",
    verification: "data/verification/aerodromnaya-18g.json",
    heroRoute: "#published",
    heroLabel: "Что известно",
    highlights: [
      ["Название и адрес", "ЖК «Патриот», улица Аэродромная 18Г. Название подтверждено владельцем проекта."],
      ["Характеристики площадки", "ЦИАН указывает материал, этажность, потолки и отделку; секция сверяется отдельно."],
      ["Проверка сделки", "ЕГРН, собственник, обременения, договор и получатель денег зависят от квартиры."]
    ],
    evidenceEyebrow: "Исправление источника",
    evidenceTitle: "Название площадки отделено от юридических фактов",
    evidenceDescription: "ЦИАН использует другое название, поэтому портал фиксирует подтверждённое владельцем название и отдельно проверяет секцию, ввод, продавца и договор.",
    confirmed: "Название ЖК «Патриот», адрес и атрибутированные характеристики карточки ЦИАН для знакомства с объектом.",
    pending: "Официальная нумерация секций, ввод, застройщик, продавец, договор, площадь, комплектация, цена, наличие и ипотека.",
    faq: ["Какие секции введены?", "Пока не подтверждено. Нужны разрешения на ввод и официальная нумерация."],
    footerTagline: "Независимая карточка объекта; секция и юридический статус проверяются отдельно."
  },
  {
    id: "sennaya-76",
    short: "Sennaya",
    complex: "Сенная 76",
    title: "Дом на Сенной 76",
    eyebrow: "Публичные сведения о доме · юридические данные проверяются отдельно",
    lead: "Характеристики основаны на публичном интервью главного инженера: материалы, индивидуальное отопление, благоустройство и инженерные решения требуют сверки по квартире и документам.",
    facts: [["кирпичный фасад", "заявлен в интервью"], ["керамическая кровля", "натуральная черепица"], ["индивидуальное отопление", "заявление представителя"], ["видеонаблюдение", "внутри и снаружи"]],
    notice: "Портал не является официальным сайтом застройщика. Публичное интервью подтверждает заявления о доме, но не заменяет ЕГРН, разрешение на ввод, документы продавца и проверку квартиры.",
    quickTitle: "Узнать о квартирах на Сенной 76",
    quickDescription: "Специалист проверит актуальные предложения, документы и возможный способ покупки.",
    quickSubmit: "Получить консультацию",
    hint: "Заявка не является бронью и не фиксирует стоимость.",
    detailedEyebrow: "Подробная проверка Сенной 76",
    detailedTitle: "Указать параметры квартиры и способ покупки",
    detailedDescription: "Специалист проверит предложения, документы и подготовит понятный следующий шаг.",
    detailedSubmit: "Получить проверенный ответ",
    quickFormId: "catalog_sennaya_76_quick_consultation",
    detailedFormId: "catalog_sennaya_76_priority_lead",
    source: "catalog/sennaya-76/index.html",
    verification: "data/verification/sennaya-76.json",
    heroRoute: "#comfort",
    heroLabel: "Посмотреть особенности",
    highlights: [
      ["Материалы", "Заявлены кирпичный фасад, керамическая кровля и утепление; состав сверяется по документации."],
      ["Инженерия", "Индивидуальное отопление и «умный дом» проверяются по комплектации выбранной квартиры."],
      ["Двор и безопасность", "Озеленение, автополив, освещение и видеонаблюдение описаны в публичном интервью."]
    ],
    evidenceEyebrow: "Источник информации",
    evidenceTitle: "Публичные заявления показаны с границей достоверности",
    evidenceDescription: "Интервью подтверждает слова представителя проекта, но не юридический статус дома, право продавца, отсутствие обременений и характеристики квартиры.",
    confirmed: "Публичные заявления представителя о фасаде, кровле, отоплении, благоустройстве, освещении и видеонаблюдении.",
    pending: "Разрешение на ввод, кадастровый номер, продавец, собственность, договор, квартирография, цена, наличие, ипотека и комплектация квартиры.",
    faq: ["Подтверждено ли разрешение на ввод?", "Нет. Публичное описание готового дома не заменяет проверяемую официальную ссылку на документ."],
    footerTagline: "Независимая карточка объекта; цена, наличие и юридический статус проверяются отдельно."
  }
];

for (const profile of profiles) {
  for (const layout of ["Desktop", "Mobile"]) {
    const desktop = layout === "Desktop";
    const screenWidth = desktop ? 1440 : 360;
    const contentWidth = desktop ? 1200 : 336;
    const screen = auto("Project Detail / " + profile.short + " / " + layout, "VERTICAL");
    screen.counterAxisSizingMode = "FIXED";
    screen.primaryAxisSizingMode = "AUTO";
    screen.resize(screenWidth, desktop ? 6600 : 9800);
    screen.clipsContent = true;
    fill(screen, semantic("surface/primary"));
    stroke(screen, semantic("border/default"));
    radius(screen, radiusToken("xl"));
    setMeta(screen, "screen-key", "project-detail-" + profile.id + "-" + layout.toLowerCase());
    setMeta(screen, "source", profile.source);
    setMeta(screen, "verification-profile", profile.verification);
    stage.appendChild(screen);

    const headerSection = createSection(screen, "header", "Header", screenWidth, contentWidth, false, desktop);
    headerSection.paddingTop = 0;
    headerSection.paddingBottom = 0;
    const nav = appendInstance(headerSection, localVariant("Top Navigation", ["Layout=" + layout, "Active=Catalog"]), "Catalog navigation");
    setMeta(nav, "cta-route", "#quick-lead");

    const heroSection = createSection(screen, "hero", "Project hero", screenWidth, contentWidth, true, desktop);
    const heroGrid = auto("Hero grid", desktop ? "HORIZONTAL" : "VERTICAL");
    bind(heroGrid, "itemSpacing", spacing("2xl"));
    heroSection.appendChild(heroGrid);
    const heroCopy = auto("Hero copy", "VERTICAL");
    heroCopy.counterAxisSizingMode = "FIXED";
    heroCopy.resize(desktop ? 700 : 336, 920);
    bind(heroCopy, "itemSpacing", spacing("lg"));
    heroGrid.appendChild(heroCopy);
    await addEyebrow(heroCopy, profile.eyebrow, desktop ? 520 : 300);
    await text(heroCopy, profile.title, { name: "Project title", styleName: "Typography/H1", width: desktop ? 700 : 336, color: semantic("text/primary") });
    await text(heroCopy, profile.lead, { name: "Project lead", styleName: "Typography/Body Large", width: desktop ? 700 : 336, color: semantic("text/muted") });
    const factGrid = createGrid(heroCopy, "Project facts", desktop, "md");
    const factComponent = localVariant("Fact Card", ["Context=Light", "Size=" + layout]);
    for (const fact of profile.facts) configureFact(factGrid, factComponent, fact[0], fact[1]);
    const actionRow = createGrid(heroCopy, "Project actions", desktop, "sm");
    const primaryButton = localVariant("Button", ["Context=Light", "Type=Primary", "State=Default"]);
    const secondaryButton = localVariant("Button", ["Context=Light", "Type=Secondary", "State=Default"]);
    configureButton(actionRow, primaryButton, profile.heroLabel, profile.heroRoute, profile.id);
    configureButton(actionRow, secondaryButton, "Проверить квартиру", "#quick-lead", profile.id);
    configureButton(actionRow, secondaryButton, "Рассчитать ипотеку", "../../ipoteka/", profile.id);
    await addNotice(heroCopy, profile.notice, desktop ? 700 : 336);
    configureLead(heroGrid, localVariant("Lead Form Card", ["Layout=" + layout, "Scope=Quick"]), profile, "Quick");

    const highlights = createSection(screen, "highlights", "Project highlights", screenWidth, contentWidth, false, desktop);
    await addSectionHeader(highlights, "Что можно изучить", "Ключевые особенности объекта", "Карточки отражают только атрибутированные сведения и не заменяют проверку конкретной квартиры.", desktop ? 850 : 336);
    const highlightGrid = createGrid(highlights, "Highlight cards", desktop);
    const contentComponent = localVariant("Content Card", ["Layout=" + layout, "Purpose=Outcome", "State=Default"]);
    for (const item of profile.highlights) configureContent(highlightGrid, contentComponent, profile.id + " / " + item[0], item[0], item[1]);

    const evidence = createSection(screen, "evidence", "Evidence and sources", screenWidth, contentWidth, true, desktop);
    await addSectionHeader(evidence, profile.evidenceEyebrow, profile.evidenceTitle, profile.evidenceDescription, desktop ? 900 : 336);
    setMeta(evidence, "source-path", profile.source);
    configureButton(evidence, secondaryButton, "Перейти к источникам страницы", profile.source + "#sources", profile.id);

    const verification = createSection(screen, "verification", "Verification summary", screenWidth, contentWidth, false, desktop);
    await addSectionHeader(verification, "Что известно и что проверяется", "Постоянные сведения отделены от сделки", "Статус источников не означает автоматическое подтверждение цены, наличия, продавца или юридической схемы.", desktop ? 900 : 336);
    const verificationGrid = createGrid(verification, "Verification cards", desktop);
    const confirmed = configureContent(verificationGrid, contentComponent, profile.id + " / Confirmed", "Опубликовано с источником", profile.confirmed);
    const pending = configureContent(verificationGrid, contentComponent, profile.id + " / Pending", "Проверяется перед консультацией", profile.pending);
    setMeta(confirmed, "verification-state", "confirmed");
    setMeta(pending, "verification-state", "pending");
    setMeta(verification, "verification-profile", profile.verification);

    const faq = createSection(screen, "faq", "Project FAQ", screenWidth, contentWidth, true, desktop);
    await addSectionHeader(faq, "Ответы покупателю", "Главный вопрос по объекту", "Первый вопрос раскрыт, остальные ответы production-страницы остаются доступными в исходной карточке.", desktop ? 850 : 336);
    configureFaq(faq, localVariant("FAQ Accordion", ["State=Open", "Size=" + layout]), profile.id + " / FAQ", profile.faq[0], profile.faq[1]);

    const lead = createSection(screen, "lead", "Detailed project lead", screenWidth, contentWidth, false, desktop);
    await addSectionHeader(lead, profile.detailedEyebrow, profile.detailedTitle, profile.detailedDescription, desktop ? 760 : 336);
    configureLead(lead, localVariant("Lead Form Card", ["Layout=" + layout, "Scope=Detailed"]), profile, "Detailed");

    const footerSection = createSection(screen, "footer", "Project footer", screenWidth, contentWidth, false, desktop);
    footerSection.paddingTop = 0;
    footerSection.paddingBottom = 0;
    const footer = appendInstance(footerSection, localVariant("Site Footer", ["Layout=" + layout]), profile.id + " footer");
    setInstanceText(footer, "Tagline", profile.footerTagline);
    setInstanceText(footer, "Disclaimer", profile.notice);
    setMeta(footer, "privacy-route", "../../privacy/");
  }
}

const notes = auto("Screen notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Состав экрана", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Страница содержит три доказательных профиля и шесть экранов. Просторная 4А опирается на официальную страницу проекта; Аэродромная 18Г отделяет подтверждённое название от юридических фактов секции; Сенная 76 показывает публичные заявления представителя с явной границей достоверности. Каждый экран хранит source, verification-profile, form IDs, routes и восемь section-key. Компоненты не публикуют неподтверждённые цены, наличие, бронь, одобрение ипотеки или юридический результат.", { name: "Notes body", styleName: "Typography/Body", width: 1080, color: semantic("text/body") });`;

process.stdout.write(buildComponentRuntime({
  pageName: "27 Screen · Project Detail",
  componentKey: "project-detail-screen",
  title: "Project Detail",
  description: "Три доказательных профиля карточки новостройки в Desktop и Mobile, собранные из существующих Portal v2 components.",
  background: "background/soft"
}, body));
