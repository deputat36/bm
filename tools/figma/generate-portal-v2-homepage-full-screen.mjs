import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Homepage Full screens", "HORIZONTAL");
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
function appendInstance(parent, componentNode, name) {
  const instance = componentNode.createInstance();
  instance.name = name;
  parent.appendChild(instance);
  createdNodeIds.push(instance.id);
  return instance;
}
function setRoute(instance, key, value) {
  instance.setSharedPluginData("portal-v2", key, value);
}
function configureButton(parent, componentNode, label, route, fillWidth = false) {
  const instance = appendInstance(parent, componentNode, label + " action");
  setInstanceText(instance, "Label", label);
  if (fillWidth) instance.layoutSizingHorizontal = "FILL";
  if (route) setRoute(instance, "route", route);
  return instance;
}
function configureFact(parent, componentNode, value, label) {
  const instance = appendInstance(parent, componentNode, "Fact / " + value);
  setInstanceText(instance, "Value", value);
  setInstanceText(instance, "Label", label);
  return instance;
}
function exposedByName(instance, name) {
  const result = instance.exposedInstances.find((item) => item.name === name);
  if (!result) throw new Error("Missing exposed instance: " + name);
  return result;
}
function configureContent(parent, componentNode, name, titleValue, descriptionValue, actionValue, route) {
  const instance = appendInstance(parent, componentNode, name);
  setInstanceText(instance, "Title", titleValue);
  setInstanceText(instance, "Description", descriptionValue);
  if (actionValue) {
    setInstanceBoolean(instance, "Show action", true);
    setInstanceText(exposedByName(instance, "Primary action"), "Label", actionValue);
  } else {
    setInstanceBoolean(instance, "Show action", false);
  }
  if (route) setRoute(instance, "route", route);
  return instance;
}
function configureStep(parent, componentNode, name, stepValue, titleValue, descriptionValue) {
  const instance = appendInstance(parent, componentNode, name);
  setInstanceText(instance, "Step label", stepValue);
  setInstanceText(instance, "Title", titleValue);
  setInstanceText(instance, "Description", descriptionValue);
  setInstanceBoolean(instance, "Show step label", true);
  return instance;
}
function configureLink(parent, componentNode, name, titleValue, descriptionValue, route) {
  const instance = appendInstance(parent, componentNode, name);
  setInstanceText(instance, "Title", titleValue);
  setInstanceText(instance, "Description", descriptionValue);
  setRoute(instance, "route", route);
  return instance;
}
function configureFaq(parent, componentNode, name, question, answer) {
  const instance = appendInstance(parent, componentNode, name);
  setInstanceText(instance, "Question", question);
  setInstanceText(instance, "Answer", answer);
  return instance;
}
function configureProject(parent, componentNode, item) {
  const instance = appendInstance(parent, componentNode, "Project / " + item.title);
  setInstanceText(instance, "Project title", item.title);
  setInstanceText(instance, "Description", item.description);
  setInstanceText(instance, "Fact 1", item.facts[0]);
  setInstanceText(instance, "Fact 2", item.facts[1]);
  setInstanceText(instance, "Fact 3", item.facts[2]);
  setInstanceBoolean(instance, "Show secondary action", true);
  setRoute(instance, "primary-route", item.primaryRoute);
  setRoute(instance, "secondary-route", item.secondaryRoute);
  return instance;
}
function configureLead(instance, scope) {
  if (scope === "Quick") {
    setInstanceText(instance, "Eyebrow", "Заявка за 30 секунд");
    setInstanceBoolean(instance, "Show eyebrow", true);
    setInstanceText(instance, "Title", "Узнать, какие варианты вам подойдут");
    setInstanceText(instance, "Description", "Оставьте телефон и выберите объект. Специалист уточнит задачу, расскажет о проверенных данных и поможет определить следующий шаг.");
    setInstanceText(instance, "Consent text", "Согласен на обработку персональных данных для ответа на обращение. Заявка не является бронью и не фиксирует цену.");
    setInstanceText(instance, "Hint", "Заявка не является бронью и не фиксирует цену.");
    setInstanceBoolean(instance, "Show hint", true);
    setInstanceText(instance, "Footer note", "Удобнее сразу обсудить? Позвонить специалисту");
    setInstanceBoolean(instance, "Show footer note", true);
    setRoute(instance, "form-id", "homepage_quick_consultation");
  } else {
    setInstanceText(instance, "Eyebrow", "Подробная заявка");
    setInstanceBoolean(instance, "Show eyebrow", true);
    setInstanceText(instance, "Title", "Расскажите, что важно при покупке");
    setInstanceText(instance, "Description", "Если уже знаете свои параметры, заполните подробную форму. Это поможет специалисту подготовиться к разговору.");
    setInstanceBoolean(instance, "Show hint", false);
    setInstanceBoolean(instance, "Show footer note", false);
    setInstanceText(exposedByName(instance, "Submit action"), "Label", "Получить консультацию");
    setRoute(instance, "form-id", "homepage_priority_selection");
  }
  setRoute(instance, "lead-type", "portal_selection");
  setRoute(instance, "project", "Портал Новостройки Борисоглебска");
  return instance;
}
async function addEyebrow(parent, value, width, dark = false) {
  const eyebrow = auto("Section eyebrow", "HORIZONTAL");
  eyebrow.primaryAxisAlignItems = "CENTER";
  eyebrow.counterAxisAlignItems = "CENTER";
  bind(eyebrow, "paddingLeft", spacing("sm"));
  bind(eyebrow, "paddingRight", spacing("sm"));
  bind(eyebrow, "paddingTop", spacing("xs"));
  bind(eyebrow, "paddingBottom", spacing("xs"));
  radius(eyebrow, radiusToken("pill"));
  fill(eyebrow, dark ? semantic("surface/emphasis") : primitive("coral/100"));
  stroke(eyebrow, semantic("action/primary"));
  parent.appendChild(eyebrow);
  await text(eyebrow, value, {
    name: "Eyebrow label",
    styleName: "Typography/Label",
    width,
    color: dark ? primitive("coral/100") : semantic("action/primary/hover")
  });
  return eyebrow;
}
async function addSectionHeader(parent, eyebrowValue, titleValue, descriptionValue, width, dark = false) {
  const header = auto("Section header", "VERTICAL");
  bind(header, "itemSpacing", spacing("md"));
  parent.appendChild(header);
  if (eyebrowValue) await addEyebrow(header, eyebrowValue, Math.min(width, 280), dark);
  await text(header, titleValue, {
    name: "Section title",
    styleName: "Typography/H2",
    width,
    color: dark ? semantic("text/inverse") : semantic("text/primary")
  });
  const description = await text(header, descriptionValue, {
    name: "Section description",
    styleName: "Typography/Body Large",
    width,
    color: dark ? semantic("text/inverse") : semantic("text/muted")
  });
  if (dark) description.opacity = 0.78;
  return header;
}
function createSection(screen, key, name, screenWidth, contentWidth, backgroundToken, desktop) {
  const section = auto(name, "VERTICAL");
  section.counterAxisSizingMode = "FIXED";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisAlignItems = "CENTER";
  section.resize(screenWidth, desktop ? 900 : 1500);
  section.paddingTop = desktop ? 88 : 62;
  section.paddingBottom = desktop ? 88 : 62;
  fill(section, semantic(backgroundToken));
  section.setSharedPluginData("portal-v2", "section-key", key);
  screen.appendChild(section);

  const container = auto(name + " container", "VERTICAL");
  container.counterAxisSizingMode = "FIXED";
  container.primaryAxisSizingMode = "AUTO";
  container.resize(contentWidth, desktop ? 760 : 1300);
  bind(container, "itemSpacing", spacing("xl"));
  section.appendChild(container);
  return container;
}
function createGrid(parent, name, desktop, columns) {
  const grid = auto(name, desktop ? "HORIZONTAL" : "VERTICAL");
  bind(grid, "itemSpacing", spacing(columns === 4 ? "md" : "lg"));
  parent.appendChild(grid);
  return grid;
}
async function addBulletList(parent, items, width) {
  const list = auto("Lead benefits", "VERTICAL");
  bind(list, "itemSpacing", spacing("md"));
  parent.appendChild(list);
  for (const item of items) {
    const row = auto("Benefit / " + item, "HORIZONTAL");
    row.counterAxisAlignItems = "MIN";
    bind(row, "itemSpacing", spacing("sm"));
    list.appendChild(row);
    const dot = auto("Benefit marker", "HORIZONTAL");
    dot.primaryAxisSizingMode = "FIXED";
    dot.counterAxisSizingMode = "FIXED";
    dot.resize(10, 10);
    dot.cornerRadius = 5;
    fill(dot, primitive("amber/500"));
    row.appendChild(dot);
    const label = await text(row, item, {
      name: "Benefit text",
      styleName: "Typography/Body",
      width: width - 26,
      color: semantic("text/inverse")
    });
    label.opacity = 0.78;
  }
}

const navDesktop = localVariant("Top Navigation", ["Layout=Desktop", "Active=None"]);
const navMobile = localVariant("Top Navigation", ["Layout=Mobile", "Active=None"]);
const heroPrimary = localVariant("Button", ["Context=Hero", "Type=Primary", "State=Default"]);
const heroSecondary = localVariant("Button", ["Context=Hero", "Type=Secondary", "State=Default"]);
const lightPrimary = localVariant("Button", ["Context=Light", "Type=Primary", "State=Default"]);
const lightSecondary = localVariant("Button", ["Context=Light", "Type=Secondary", "State=Default"]);
const factDesktop = localVariant("Fact Card", ["Context=Hero", "Size=Desktop"]);
const factMobile = localVariant("Fact Card", ["Context=Hero", "Size=Mobile"]);
const quickLeadDesktop = localVariant("Lead Form Card", ["Layout=Desktop", "Scope=Quick"]);
const quickLeadMobile = localVariant("Lead Form Card", ["Layout=Mobile", "Scope=Quick"]);
const detailedLeadDesktop = localVariant("Lead Form Card", ["Layout=Desktop", "Scope=Detailed"]);
const detailedLeadMobile = localVariant("Lead Form Card", ["Layout=Mobile", "Scope=Detailed"]);
const scenarioDesktop = {
  Object: localVariant("Scenario Card", ["Layout=Desktop", "Intent=Object", "State=Default"]),
  Selection: localVariant("Scenario Card", ["Layout=Desktop", "Intent=Selection", "State=Default"]),
  Mortgage: localVariant("Scenario Card", ["Layout=Desktop", "Intent=Mortgage", "State=Default"])
};
const scenarioMobile = {
  Object: localVariant("Scenario Card", ["Layout=Mobile", "Intent=Object", "State=Default"]),
  Selection: localVariant("Scenario Card", ["Layout=Mobile", "Intent=Selection", "State=Default"]),
  Mortgage: localVariant("Scenario Card", ["Layout=Mobile", "Intent=Mortgage", "State=Default"])
};
const projectDesktop = localVariant("Project Card", ["Layout=Desktop", "Verification=Pending", "State=Default"]);
const projectMobile = localVariant("Project Card", ["Layout=Mobile", "Verification=Pending", "State=Default"]);
const selectionDesktop = localVariant("Content Card", ["Layout=Desktop", "Purpose=Selection", "State=Default"]);
const selectionMobile = localVariant("Content Card", ["Layout=Mobile", "Purpose=Selection", "State=Default"]);
const outcomeDesktop = localVariant("Content Card", ["Layout=Desktop", "Purpose=Outcome", "State=Default"]);
const outcomeMobile = localVariant("Content Card", ["Layout=Mobile", "Purpose=Outcome", "State=Default"]);
const stepThreeDesktop = localVariant("Step Card", ["Layout=Desktop", "Grid=Three", "State=Default"]);
const stepThreeMobile = localVariant("Step Card", ["Layout=Mobile", "Grid=Three", "State=Default"]);
const stepFourDesktop = localVariant("Step Card", ["Layout=Desktop", "Grid=Four", "State=Default"]);
const stepFourMobile = localVariant("Step Card", ["Layout=Mobile", "Grid=Four", "State=Default"]);
const linkDesktop = localVariant("Link Card", ["Layout=Desktop", "State=Default"]);
const linkMobile = localVariant("Link Card", ["Layout=Mobile", "State=Default"]);
const faqDesktopOpen = localVariant("FAQ Accordion", ["State=Open", "Size=Desktop"]);
const faqDesktopClosed = localVariant("FAQ Accordion", ["State=Closed", "Size=Desktop"]);
const faqMobileOpen = localVariant("FAQ Accordion", ["State=Open", "Size=Mobile"]);
const faqMobileClosed = localVariant("FAQ Accordion", ["State=Closed", "Size=Mobile"]);
const footerDesktop = localVariant("Site Footer", ["Layout=Desktop"]);
const footerMobile = localVariant("Site Footer", ["Layout=Mobile"]);

const projects = [
  {
    title: "Просторная 4А",
    description: "Собираем предварительные обращения и проверяем первичные сведения об объекте, документах, сроках, характеристиках и возможностях покупки.",
    facts: [
      "Карточка включена в приоритет проверки.",
      "Точные характеристики не публикуются без первичных источников.",
      "Специалист сообщит, какие данные подтверждены на момент обращения."
    ],
    primaryRoute: "catalog/prostornaya-4a/#quick-lead",
    secondaryRoute: "catalog/prostornaya-4a/"
  },
  {
    title: "Аэродромная 18Г",
    description: "Собираем интерес покупателей и проверяем сведения о застройщике, сроках, документах, квартирах и статусе дома.",
    facts: [
      "Адрес включён в первую очередь.",
      "Характеристики проходят проверку.",
      "Неподтверждённые цены не публикуются."
    ],
    primaryRoute: "catalog/aerodromnaya-18g/#quick-lead",
    secondaryRoute: "catalog/aerodromnaya-18g/"
  },
  {
    title: "Сенная 76",
    description: "Собираем предварительные обращения и проверяем сведения по дому, документам, квартирам и возможностям покупки.",
    facts: [
      "Объект включён в первую очередь.",
      "Источники и характеристики уточняются.",
      "Заявку можно оставить уже сейчас."
    ],
    primaryRoute: "catalog/sennaya-76/#quick-lead",
    secondaryRoute: "catalog/sennaya-76/"
  }
];
const apartments = [
  ["1-комнатные квартиры", "Подбор компактной квартиры для первой покупки, переезда, инвестирования или проживания одного-двух человек.", "Подобрать 1-комнатную"],
  ["2-комнатные квартиры", "Подбор квартиры с отдельной спальней, рабочей зоной или дополнительным пространством для семьи.", "Подобрать 2-комнатную"],
  ["3-комнатные квартиры", "Подбор семейной квартиры с учётом состава семьи, бюджета, сроков и возможного использования господдержки.", "Подобрать 3-комнатную"]
];
const outcomes = [
  ["Подходящие объекты", "Сопоставим адрес, комнатность, площадь, срок и ваши требования."],
  ["Финансовый сценарий", "Обсудим бюджет, первоначальный взнос, ипотеку, сертификаты и встречную продажу."],
  ["Проверенные данные", "Отделим подтверждённую информацию от сведений, которые ещё требуют уточнения."],
  ["Следующий шаг", "Определим, что делать дальше: запросить детали, рассчитать покупку или дождаться обновлений."]
];
const consultationSteps = [
  ["Шаг 1", "Уточняем задачу", "Какой объект интересует, когда планируется покупка и что нужно проверить в первую очередь."],
  ["Шаг 2", "Сверяем информацию", "Отделяем подтверждённые сведения от рабочих данных и отмечаем недостающие документы."],
  ["Шаг 3", "Определяем действие", "Запросить документы, выполнить расчёт, подобрать альтернативу или дождаться обновления."]
];
const purchaseSteps = [
  ["1", "Определить параметры", "Комнатность, бюджет, желаемый срок, способ покупки и требования к дому."],
  ["2", "Сравнить новые дома", "Сопоставить адреса и доступные подтверждённые сведения, не полагаясь на одно рекламное обещание."],
  ["3", "Проверить документы", "Уточнить продавца или застройщика, договор, порядок оплаты и разрешительные документы."],
  ["4", "Рассчитать покупку", "Оценить собственные средства, ипотеку, господдержку и продажу имеющейся недвижимости."]
];
const purchaseMethods = [
  ["Ипотека", "Предварительный расчёт бюджета, взноса и платежа.", "ipoteka/"],
  ["Семейная ипотека", "Проверка актуальных условий программы на момент обращения.", "ipoteka/"],
  ["Господдержка и обмен", "Материнский капитал, сертификат «Молодая семья» и продажа своей недвижимости.", "guides/"]
];
const resources = [
  ["Застройщики", "Связанные объекты и статус проверки данных.", "developers/"],
  ["Справочник покупателя", "Документы, ДДУ, сроки, ипотека и безопасная покупка.", "guides/"],
  ["Новости и обновления", "Документы, ход строительства и изменения по объектам.", "news/"]
];
const faqs = [
  ["Где посмотреть новостройки Борисоглебска?", "На портале собраны карточки новых домов Борисоглебска. Сведения по каждому объекту публикуются с указанием статуса проверки, а неподтверждённые цены и наличие не выдаются за актуальные."],
  ["Как узнать актуальные цены и наличие квартир?", "Оставьте заявку или позвоните специалисту. Перед консультацией уточняются доступные на дату обращения сведения о цене, наличии, документах и способе покупки."],
  ["Можно ли подобрать 1-, 2- или 3-комнатную квартиру?", "Да. В заявке можно указать нужную комнатность, бюджет, способ покупки и срок. Подбор не является бронью и не фиксирует стоимость квартиры."],
  ["Можно ли купить квартиру с семейной ипотекой?", "Возможность применения семейной ипотеки зависит от актуальных условий программы, характеристик объекта и ситуации покупателя. Это проверяется отдельно перед расчётом."],
  ["Какие документы нужно проверить перед покупкой?", "Набор документов зависит от объекта и схемы сделки. Обычно проверяют сведения о продавце или застройщике, разрешительные документы, договор, порядок оплаты и подтверждение полномочий стороны сделки."],
  ["Портал является сайтом застройщика?", "Нет. Портал является независимым городским каталогом новостроек Борисоглебска. Информация сверяется по доступным источникам и уточняется перед консультацией."]
];

for (const layout of ["Desktop", "Mobile"]) {
  const desktop = layout === "Desktop";
  const screenWidth = desktop ? 1440 : 360;
  const contentWidth = desktop ? 1200 : 336;
  const screen = auto("Homepage Full / " + layout, "VERTICAL");
  screen.counterAxisSizingMode = "FIXED";
  screen.primaryAxisSizingMode = "AUTO";
  screen.resize(screenWidth, desktop ? 13200 : 20200);
  screen.clipsContent = true;
  fill(screen, semantic("surface/primary"));
  stroke(screen, semantic("border/default"));
  radius(screen, radiusToken("xl"));
  screen.setSharedPluginData("portal-v2", "screen-key", "homepage-full-" + layout.toLowerCase());
  screen.setSharedPluginData("portal-v2", "source", "index.html");
  stage.appendChild(screen);

  const header = auto("Header", "HORIZONTAL");
  header.primaryAxisSizingMode = "FIXED";
  header.counterAxisSizingMode = "FIXED";
  header.primaryAxisAlignItems = "CENTER";
  header.counterAxisAlignItems = "CENTER";
  header.resize(screenWidth, desktop ? 84 : 132);
  fill(header, semantic("surface/primary"));
  screen.appendChild(header);
  appendInstance(header, desktop ? navDesktop : navMobile, "Top Navigation / " + layout);

  const hero = auto("Hero section", "VERTICAL");
  hero.counterAxisSizingMode = "FIXED";
  hero.primaryAxisSizingMode = "AUTO";
  hero.counterAxisAlignItems = "CENTER";
  hero.resize(screenWidth, desktop ? 1160 : 2050);
  hero.paddingTop = desktop ? 72 : 42;
  hero.paddingBottom = desktop ? 82 : 54;
  bind(hero, "itemSpacing", spacing("xl"));
  fill(hero, semantic("background/hero"));
  hero.setSharedPluginData("portal-v2", "section-key", "hero");
  screen.appendChild(hero);

  const heroContent = auto("Hero content", "VERTICAL");
  heroContent.counterAxisSizingMode = "FIXED";
  heroContent.primaryAxisSizingMode = "AUTO";
  heroContent.resize(contentWidth, desktop ? 1000 : 1950);
  bind(heroContent, "itemSpacing", spacing("xl"));
  hero.appendChild(heroContent);

  const heroMain = auto("Hero main", desktop ? "HORIZONTAL" : "VERTICAL");
  heroMain.counterAxisSizingMode = "FIXED";
  heroMain.primaryAxisSizingMode = "AUTO";
  heroMain.resize(contentWidth, desktop ? 800 : 1500);
  heroMain.itemSpacing = desktop ? 44 : 32;
  heroContent.appendChild(heroMain);

  const pitch = auto("Hero pitch", "VERTICAL");
  pitch.counterAxisSizingMode = "FIXED";
  pitch.primaryAxisSizingMode = "AUTO";
  pitch.resize(desktop ? 718 : 336, desktop ? 620 : 630);
  bind(pitch, "itemSpacing", spacing("lg"));
  heroMain.appendChild(pitch);
  await addEyebrow(pitch, "Городской каталог новых домов", 250, true);
  await text(pitch, "Новостройки Борисоглебска", {
    name: "Hero title",
    styleName: desktop ? "Typography/Display" : "Typography/H1",
    width: desktop ? 718 : 336,
    color: semantic("text/inverse")
  });
  const heroLead = await text(pitch, "Ищете квартиру в новом доме Борисоглебска? Выберите конкретный дом, получите общий подбор или предварительный расчёт покупки. Доступен подбор 1-, 2- и 3-комнатных квартир. Специалист проверит доступные документы и актуальные условия на дату обращения — без обещаний неподтверждённых цен и наличия.", {
    name: "Hero lead",
    styleName: "Typography/Body Large",
    width: desktop ? 718 : 336,
    color: semantic("text/inverse")
  });
  heroLead.opacity = 0.78;
  const heroActions = auto("Hero actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(heroActions, "itemSpacing", spacing("sm"));
  pitch.appendChild(heroActions);
  configureButton(heroActions, heroPrimary, "Выбрать сценарий", "#start", !desktop);
  configureButton(heroActions, heroSecondary, "Смотреть каталог", "catalog/", !desktop);
  if (desktop) configureButton(heroActions, heroSecondary, "8 903 857-69-09", "tel:+79038576909");

  const quickLead = appendInstance(heroMain, desktop ? quickLeadDesktop : quickLeadMobile, "Quick lead form / " + layout);
  configureLead(quickLead, "Quick");

  const facts = auto("Hero facts", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(facts, "itemSpacing", spacing("sm"));
  heroContent.appendChild(facts);
  const factVariant = desktop ? factDesktop : factMobile;
  configureFact(facts, factVariant, "3", "приоритетных объекта");
  configureFact(facts, factVariant, "1 каталог", "новостроек города");
  configureFact(facts, factVariant, "ипотека", "и другие способы покупки");
  configureFact(facts, factVariant, "без брони", "консультация без фиксации цены");

  const notice = auto("Independent portal notice", "HORIZONTAL");
  notice.counterAxisAlignItems = "CENTER";
  notice.counterAxisSizingMode = "FIXED";
  notice.primaryAxisSizingMode = "AUTO";
  notice.resize(desktop ? 880 : 336, desktop ? 76 : 118);
  notice.paddingLeft = 16;
  notice.paddingRight = 16;
  notice.paddingTop = 16;
  notice.paddingBottom = 16;
  bind(notice, "itemSpacing", spacing("sm"));
  radius(notice, radiusToken("md"));
  fill(notice, semantic("surface/emphasis"));
  stroke(notice, semantic("border/strong"));
  heroContent.appendChild(notice);
  const accent = auto("Notice accent", "HORIZONTAL");
  accent.primaryAxisSizingMode = "FIXED";
  accent.counterAxisSizingMode = "FIXED";
  accent.resize(5, desktop ? 44 : 82);
  radius(accent, radiusToken("pill"));
  fill(accent, semantic("focus/ring"));
  notice.appendChild(accent);
  const noticeText = await text(notice, "Портал не является официальным сайтом застройщика. Цена, наличие квартир и условия покупки уточняются перед консультацией.", {
    name: "Notice text",
    styleName: "Typography/Body",
    width: desktop ? 815 : 279,
    color: semantic("text/inverse")
  });
  noticeText.opacity = 0.75;

  const routesContainer = createSection(screen, "routes", "Start routes section", screenWidth, contentWidth, "background/soft", desktop);
  await addSectionHeader(routesContainer, "С чего начать", "Выберите свою задачу", "Портал направит к подходящему следующему шагу. Цена, наличие и применимость программы всё равно проверяются на дату обращения.", desktop ? 830 : 336);
  const routeGrid = createGrid(routesContainer, "Scenario cards", desktop, 3);
  const scenarioVariants = desktop ? scenarioDesktop : scenarioMobile;
  appendInstance(routeGrid, scenarioVariants.Object, "Scenario / Object");
  appendInstance(routeGrid, scenarioVariants.Selection, "Scenario / Selection");
  appendInstance(routeGrid, scenarioVariants.Mortgage, "Scenario / Mortgage");

  const objectsContainer = createSection(screen, "objects", "Objects section", screenWidth, contentWidth, "surface/primary", desktop);
  await addSectionHeader(objectsContainer, "Приоритет сбора заявок", "Выберите интересующий объект", "Каждая заявка привязывается к конкретному адресу. Для остальных новостроек доступен общий подбор через каталог.", desktop ? 830 : 336);
  const projectGrid = createGrid(objectsContainer, "Project cards", desktop, 3);
  for (const item of projects) configureProject(projectGrid, desktop ? projectDesktop : projectMobile, item);
  const objectActions = auto("Object actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(objectActions, "itemSpacing", spacing("sm"));
  objectsContainer.appendChild(objectActions);
  configureButton(objectActions, lightSecondary, "Посмотреть другие новостройки", "catalog/", !desktop);

  const apartmentsContainer = createSection(screen, "apartments", "Apartments section", screenWidth, contentWidth, "background/soft", desktop);
  await addSectionHeader(apartmentsContainer, "Подбор по комнатности", "Квартиры в новостройках Борисоглебска", "Укажите нужную комнатность, бюджет и способ покупки. Специалист проверит, какие варианты и сведения доступны на дату обращения.", desktop ? 830 : 336);
  const apartmentGrid = createGrid(apartmentsContainer, "Apartment selection cards", desktop, 3);
  for (const item of apartments) configureContent(apartmentGrid, desktop ? selectionDesktop : selectionMobile, "Apartment / " + item[0], item[0], item[1], item[2], "#lead");
  const apartmentActions = auto("Apartment actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(apartmentActions, "itemSpacing", spacing("sm"));
  apartmentsContainer.appendChild(apartmentActions);
  configureButton(apartmentActions, lightSecondary, "Ответить на 5 вопросов без телефона", "catalog/#quiz", !desktop);
  configureButton(apartmentActions, lightSecondary, "Позвонить: 8 903 857-69-09", "tel:+79038576909", !desktop);

  const outcomesContainer = createSection(screen, "consultation-outcomes", "Consultation outcomes section", screenWidth, contentWidth, "surface/primary", desktop);
  await addSectionHeader(outcomesContainer, "Польза консультации", "Что решим за один разговор", "Поможем собрать разрозненные сведения в понятный сценарий покупки — без обещаний неподтверждённых цен и наличия.", desktop ? 830 : 336);
  const outcomeGrid = createGrid(outcomesContainer, "Outcome cards", desktop, 4);
  for (const item of outcomes) configureContent(outcomeGrid, desktop ? outcomeDesktop : outcomeMobile, "Outcome / " + item[0], item[0], item[1], "", "");
  const outcomeActions = auto("Outcome actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(outcomeActions, "itemSpacing", spacing("sm"));
  outcomesContainer.appendChild(outcomeActions);
  configureButton(outcomeActions, lightPrimary, "Получить консультацию", "#quick-lead", !desktop);
  configureButton(outcomeActions, lightSecondary, "Изучить справочник", "guides/", !desktop);

  const consultationContainer = createSection(screen, "consultation-process", "Consultation process section", screenWidth, contentWidth, "background/soft", desktop);
  await addSectionHeader(consultationContainer, "Как проходит консультация", "От вопроса к понятному следующему шагу", "Без бронирования, фиксации цены и обязательств со стороны покупателя.", desktop ? 830 : 336);
  const consultationGrid = createGrid(consultationContainer, "Consultation steps", desktop, 3);
  for (const item of consultationSteps) configureStep(consultationGrid, desktop ? stepThreeDesktop : stepThreeMobile, "Consultation / " + item[0], item[0], item[1], item[2]);

  const purchaseContainer = createSection(screen, "purchase-steps", "Purchase steps section", screenWidth, contentWidth, "surface/primary", desktop);
  await addSectionHeader(purchaseContainer, "Покупка без лишней путаницы", "Как купить квартиру в новостройке Борисоглебска", "Начните не с передачи денег, а с определения задачи, проверки объекта и понятного финансового сценария.", desktop ? 830 : 336);
  const purchaseGrid = createGrid(purchaseContainer, "Purchase steps", desktop, 4);
  for (const item of purchaseSteps) configureStep(purchaseGrid, desktop ? stepFourDesktop : stepFourMobile, "Purchase / " + item[0], item[0], item[1], item[2]);
  const purchaseActions = auto("Purchase actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(purchaseActions, "itemSpacing", spacing("sm"));
  purchaseContainer.appendChild(purchaseActions);
  configureButton(purchaseActions, lightPrimary, "Начать подбор", "#quick-lead", !desktop);
  configureButton(purchaseActions, lightSecondary, "Что проверить перед покупкой", "guides/", !desktop);

  const methodsContainer = createSection(screen, "purchase-methods", "Purchase methods section", screenWidth, contentWidth, "background/soft", desktop);
  await addSectionHeader(methodsContainer, "", "Способы покупки", "Можно заранее обсудить бюджет и подготовиться к сделке.", desktop ? 830 : 336);
  const methodGrid = createGrid(methodsContainer, "Purchase method cards", desktop, 3);
  for (const item of purchaseMethods) configureLink(methodGrid, desktop ? linkDesktop : linkMobile, "Purchase method / " + item[0], item[0], item[1], item[2]);

  const resourcesContainer = createSection(screen, "useful-resources", "Useful resources section", screenWidth, contentWidth, "surface/primary", desktop);
  await addSectionHeader(resourcesContainer, "", "Полезные разделы", "Каталог дополняется справочной информацией для покупателей.", desktop ? 830 : 336);
  const resourceGrid = createGrid(resourcesContainer, "Useful resource cards", desktop, 3);
  for (const item of resources) configureLink(resourceGrid, desktop ? linkDesktop : linkMobile, "Resource / " + item[0], item[0], item[1], item[2]);

  const faqContainer = createSection(screen, "faq", "FAQ section", screenWidth, contentWidth, "background/soft", desktop);
  await addSectionHeader(faqContainer, "Частые вопросы", "О покупке квартиры в новостройке", "Краткие ответы перед выбором объекта и консультацией.", desktop ? 830 : 336);
  const faqCenter = auto("FAQ centered column", "HORIZONTAL");
  faqCenter.primaryAxisSizingMode = "FIXED";
  faqCenter.primaryAxisAlignItems = "CENTER";
  faqCenter.resize(contentWidth, 100);
  faqContainer.appendChild(faqCenter);
  const faqStack = auto("FAQ accordion stack", "VERTICAL");
  bind(faqStack, "itemSpacing", spacing("sm"));
  faqCenter.appendChild(faqStack);
  for (let index = 0; index < faqs.length; index += 1) {
    const item = faqs[index];
    const faqVariant = desktop
      ? (index === 0 ? faqDesktopOpen : faqDesktopClosed)
      : (index === 0 ? faqMobileOpen : faqMobileClosed);
    configureFaq(faqStack, faqVariant, "FAQ / " + item[0], item[0], item[1]);
  }
  const faqActions = auto("FAQ actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(faqActions, "itemSpacing", spacing("sm"));
  faqContainer.appendChild(faqActions);
  configureButton(faqActions, lightPrimary, "Задать вопрос специалисту", "#quick-lead", !desktop);
  configureButton(faqActions, lightSecondary, "Позвонить: 8 903 857-69-09", "tel:+79038576909", !desktop);

  const leadContainer = createSection(screen, "lead", "Detailed lead section", screenWidth, contentWidth, "background/hero", desktop);
  const leadLayout = auto("Detailed lead layout", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(leadLayout, "itemSpacing", spacing(desktop ? "2xl" : "xl"));
  leadContainer.appendChild(leadLayout);
  const leadInfo = auto("Detailed lead information", "VERTICAL");
  leadInfo.counterAxisSizingMode = "FIXED";
  leadInfo.primaryAxisSizingMode = "AUTO";
  leadInfo.resize(desktop ? 560 : 336, desktop ? 720 : 620);
  bind(leadInfo, "itemSpacing", spacing("lg"));
  leadLayout.appendChild(leadInfo);
  await addEyebrow(leadInfo, "Подробная заявка", 180, true);
  await text(leadInfo, "Расскажите, что важно при покупке", {
    name: "Lead section title",
    styleName: "Typography/H2",
    width: desktop ? 560 : 336,
    color: semantic("text/inverse")
  });
  const detailedDescription = await text(leadInfo, "Если уже знаете свои параметры, заполните подробную форму. Это поможет специалисту подготовиться к разговору.", {
    name: "Lead section description",
    styleName: "Typography/Body Large",
    width: desktop ? 540 : 336,
    color: semantic("text/inverse")
  });
  detailedDescription.opacity = 0.78;
  await addBulletList(leadInfo, [
    "Приоритет: Просторная 4А, Аэродромная 18Г и Сенная 76.",
    "Можно выбрать общий подбор среди всех новостроек.",
    "Заявка не является бронью и не фиксирует цену."
  ], desktop ? 540 : 336);
  configureButton(leadInfo, heroSecondary, "Позвонить: 8 903 857-69-09", "tel:+79038576909");
  const detailedLead = appendInstance(leadLayout, desktop ? detailedLeadDesktop : detailedLeadMobile, "Detailed lead form / " + layout);
  configureLead(detailedLead, "Detailed");

  const footerSection = auto("Footer section", "VERTICAL");
  footerSection.counterAxisSizingMode = "FIXED";
  footerSection.primaryAxisSizingMode = "AUTO";
  footerSection.counterAxisAlignItems = "CENTER";
  footerSection.resize(screenWidth, desktop ? 240 : 400);
  footerSection.paddingTop = desktop ? 24 : 32;
  footerSection.paddingBottom = desktop ? 24 : 32;
  fill(footerSection, semantic("surface/emphasis"));
  footerSection.setSharedPluginData("portal-v2", "section-key", "footer");
  screen.appendChild(footerSection);
  appendInstance(footerSection, desktop ? footerDesktop : footerMobile, "Site Footer / " + layout);
}

const notes = auto("Screen notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Состав полного экрана", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Homepage Full собирается напрямую из Top Navigation, Button, Fact Card, Lead Form Card, Scenario Card, Project Card, Content Card, Step Card, Link Card, FAQ Accordion и Site Footer. В Desktop и Mobile сохранён production-порядок всех двенадцати секций, точные тексты, route metadata, form metadata, независимое позиционирование портала и предупреждения об отсутствии брони и фиксации цены. Внешних изображений нет. Отдельные screen handoff остаются подробными эталонами секций, а этот экран является интеграционной сборкой и финальной проверкой целостности главной.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "25 Screen · Homepage Full",
  componentKey: "homepage-full-screen",
  title: "Homepage Full",
  description: "Единая Desktop и Mobile сборка главной страницы из всех компонентных секций портала.",
  background: "background/soft"
}, body));
