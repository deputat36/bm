import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Catalog screens", "HORIZONTAL");
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
function exposedByName(instance, name) {
  const result = instance.exposedInstances.find((item) => item.name === name);
  if (!result) throw new Error("Missing exposed instance: " + name);
  return result;
}
function shared(instance, key, value) {
  instance.setSharedPluginData("portal-v2", key, value);
}
function configureButton(parent, componentNode, label, route, fillWidth = false) {
  const instance = appendInstance(parent, componentNode, label + " action");
  setInstanceText(instance, "Label", label);
  if (fillWidth) instance.layoutSizingHorizontal = "FILL";
  if (route) shared(instance, "route", route);
  return instance;
}
function configureLink(parent, componentNode, name, titleValue, descriptionValue, route, prefillInterest = "") {
  const instance = appendInstance(parent, componentNode, name);
  setInstanceText(instance, "Title", titleValue);
  setInstanceText(instance, "Description", descriptionValue);
  shared(instance, "route", route);
  if (prefillInterest) shared(instance, "prefill-interest", prefillInterest);
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
  shared(instance, "primary-route", item.primaryRoute);
  shared(instance, "secondary-route", item.secondaryRoute);
  shared(instance, "verification-profile", item.verificationProfile);
  return instance;
}
function configureLead(instance, scope) {
  if (scope === "Quick") {
    setInstanceText(instance, "Eyebrow", "Заявка за 30 секунд");
    setInstanceBoolean(instance, "Show eyebrow", true);
    setInstanceText(instance, "Title", "Начать подбор новостройки");
    setInstanceText(instance, "Description", "Оставьте контакты, выберите объект и главный вопрос. Остальные параметры специалист уточнит в разговоре.");
    setInstanceText(instance, "Consent text", "Согласен на обработку персональных данных для ответа на обращение. Без бронирования и фиксации цены.");
    setInstanceText(instance, "Hint", "Без бронирования и фиксации цены.");
    setInstanceBoolean(instance, "Show hint", true);
    setInstanceBoolean(instance, "Show footer note", false);
    shared(instance, "form-id", "catalog_quick_selection");
  } else {
    setInstanceText(instance, "Eyebrow", "Подробный подбор квартиры");
    setInstanceBoolean(instance, "Show eyebrow", true);
    setInstanceText(instance, "Title", "Указать параметры будущей квартиры");
    setInstanceText(instance, "Description", "Эта форма подходит, если вы готовы сразу сообщить комнатность, бюджет и способ покупки.");
    setInstanceBoolean(instance, "Show hint", false);
    setInstanceBoolean(instance, "Show footer note", false);
    setInstanceText(exposedByName(instance, "Submit action"), "Label", "Получить подробную консультацию");
    shared(instance, "form-id", "catalog_priority_selection");
  }
  shared(instance, "lead-type", "portal_selection");
  shared(instance, "project", "Портал Новостройки Борисоглебска");
  shared(instance, "source", "catalog/index.html");
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
  if (eyebrowValue) await addEyebrow(header, eyebrowValue, Math.min(width, 300), dark);
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
function createSection(screen, key, name, screenWidth, contentWidth, backgroundToken, desktop, top = 88, bottom = 88) {
  const section = auto(name, "VERTICAL");
  section.counterAxisSizingMode = "FIXED";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisAlignItems = "CENTER";
  section.resize(screenWidth, desktop ? 800 : 1300);
  section.paddingTop = desktop ? top : Math.max(44, top - 24);
  section.paddingBottom = desktop ? bottom : Math.max(44, bottom - 24);
  fill(section, semantic(backgroundToken));
  section.setSharedPluginData("portal-v2", "section-key", key);
  screen.appendChild(section);

  const container = auto(name + " container", "VERTICAL");
  container.counterAxisSizingMode = "FIXED";
  container.primaryAxisSizingMode = "AUTO";
  container.resize(contentWidth, desktop ? 700 : 1200);
  bind(container, "itemSpacing", spacing("xl"));
  section.appendChild(container);
  return container;
}
function createRows(parent, name, desktop, items, render) {
  if (!desktop) {
    const stack = auto(name, "VERTICAL");
    bind(stack, "itemSpacing", spacing("lg"));
    parent.appendChild(stack);
    items.forEach((item) => render(stack, item));
    return stack;
  }
  const rows = auto(name, "VERTICAL");
  bind(rows, "itemSpacing", spacing("lg"));
  parent.appendChild(rows);
  for (let index = 0; index < items.length; index += 3) {
    const row = auto(name + " row " + (index / 3 + 1), "HORIZONTAL");
    bind(row, "itemSpacing", spacing("lg"));
    rows.appendChild(row);
    items.slice(index, index + 3).forEach((item) => render(row, item));
  }
  return rows;
}
async function addNotice(parent, value, width, dark = false) {
  const notice = auto("Legal notice", "VERTICAL");
  notice.counterAxisSizingMode = "FIXED";
  notice.primaryAxisSizingMode = "AUTO";
  notice.resize(width, 100);
  bind(notice, "paddingLeft", spacing("md"));
  bind(notice, "paddingRight", spacing("md"));
  bind(notice, "paddingTop", spacing("md"));
  bind(notice, "paddingBottom", spacing("md"));
  radius(notice, radiusToken("md"));
  fill(notice, dark ? semantic("surface/emphasis") : semantic("surface/primary"));
  stroke(notice, dark ? primitive("amber/500") : semantic("border/default"));
  parent.appendChild(notice);
  const label = await text(notice, value, {
    name: "Legal notice text",
    styleName: "Typography/Body",
    width: width - 32,
    color: dark ? semantic("text/inverse") : semantic("text/body")
  });
  if (dark) label.opacity = 0.8;
  return notice;
}

const navDesktop = localVariant("Top Navigation", ["Layout=Desktop", "Active=Catalog"]);
const navMobile = localVariant("Top Navigation", ["Layout=Mobile", "Active=Catalog"]);
const heroPrimary = localVariant("Button", ["Context=Hero", "Type=Primary", "State=Default"]);
const heroSecondary = localVariant("Button", ["Context=Hero", "Type=Secondary", "State=Default"]);
const lightPrimary = localVariant("Button", ["Context=Light", "Type=Primary", "State=Default"]);
const lightSecondary = localVariant("Button", ["Context=Light", "Type=Secondary", "State=Default"]);
const quickDesktop = localVariant("Lead Form Card", ["Layout=Desktop", "Scope=Quick"]);
const quickMobile = localVariant("Lead Form Card", ["Layout=Mobile", "Scope=Quick"]);
const detailedDesktop = localVariant("Lead Form Card", ["Layout=Desktop", "Scope=Detailed"]);
const detailedMobile = localVariant("Lead Form Card", ["Layout=Mobile", "Scope=Detailed"]);
const linkDesktop = localVariant("Link Card", ["Layout=Desktop", "State=Default"]);
const linkMobile = localVariant("Link Card", ["Layout=Mobile", "State=Default"]);
const projectDesktop = localVariant("Project Card", ["Layout=Desktop", "Verification=Pending", "State=Default"]);
const projectMobile = localVariant("Project Card", ["Layout=Mobile", "Verification=Pending", "State=Default"]);
const footerDesktop = localVariant("Site Footer", ["Layout=Desktop"]);
const footerMobile = localVariant("Site Footer", ["Layout=Mobile"]);

const questionRoutes = [
  { title: "Наличие и статус", description: "Уточнить, есть ли подтверждённая информация о продажах и доступных вариантах на текущую дату.", action: "Проверить наличие", interest: "Наличие и актуальный статус" },
  { title: "Документы", description: "Запросить проверку первичных источников, реквизитов объекта и документов, связанных с покупкой.", action: "Проверить документы", interest: "Документы по объекту" },
  { title: "Схема покупки", description: "Разобрать продавца, договор, порядок оплаты и ограничения до передачи денег.", action: "Разобрать схему покупки", interest: "Схема покупки и договор" },
  { title: "Ипотека", description: "Предварительно оценить взнос, платёж и возможность применения программы после проверки объекта.", action: "Рассчитать ипотеку", interest: "Ипотека и расчёт покупки" },
  { title: "Альтернатива", description: "Сравнить другие новые дома, если выбранный объект не подходит по сроку, документам или способу покупки.", action: "Подобрать альтернативу", interest: "Альтернативы и общий подбор" }
];
const projects = [
  {
    title: "Просторная 4А",
    description: "Состояние внутренней проверки и доступные категории сведений без публикации неподтверждённых характеристик.",
    facts: ["Источники уточняются", "Ключевые сведения уточняются", "Категории сведений уточняются"],
    primaryRoute: "prostornaya-4a/#quick-lead",
    secondaryRoute: "prostornaya-4a/",
    verificationProfile: "../data/verification/prostornaya-4a.json"
  },
  {
    title: "Аэродромная 18Г",
    description: "Проверка сведений о доме, документах, статусе и доступных покупателю следующих шагах.",
    facts: ["Источники уточняются", "Ключевые сведения уточняются", "Категории сведений уточняются"],
    primaryRoute: "aerodromnaya-18g/#quick-lead",
    secondaryRoute: "aerodromnaya-18g/",
    verificationProfile: "../data/verification/aerodromnaya-18g.json"
  },
  {
    title: "Сенная 76",
    description: "Рабочая карточка проверки с безопасным отображением только подтверждаемого состояния данных.",
    facts: ["Источники уточняются", "Ключевые сведения уточняются", "Категории сведений уточняются"],
    primaryRoute: "sennaya-76/#quick-lead",
    secondaryRoute: "sennaya-76/",
    verificationProfile: "../data/verification/sennaya-76.json"
  }
];
const referenceItems = [
  { title: "Подтверждённый адрес", description: "Карточка появляется после проверки адреса, статуса и хотя бы одного публичного источника." },
  { title: "Публичный источник", description: "Неподтверждённые адреса и характеристики не выводятся в справочном каталоге." },
  { title: "Общий подбор", description: "Для справочных объектов используется общая форма без отдельной продающей страницы." }
];

for (const layout of ["Desktop", "Mobile"]) {
  const desktop = layout === "Desktop";
  const screenWidth = desktop ? 1440 : 360;
  const contentWidth = desktop ? 1200 : 336;
  const screen = auto("Catalog / " + layout, "VERTICAL");
  screen.counterAxisSizingMode = "FIXED";
  screen.primaryAxisSizingMode = "AUTO";
  screen.resize(screenWidth, desktop ? 6200 : 9800);
  screen.clipsContent = true;
  fill(screen, semantic("surface/primary"));
  stroke(screen, semantic("border/default"));
  radius(screen, radiusToken("xl"));
  screen.setSharedPluginData("portal-v2", "screen-key", "catalog-" + layout.toLowerCase());
  screen.setSharedPluginData("portal-v2", "source", "catalog/index.html");
  stage.appendChild(screen);

  const navigation = appendInstance(screen, desktop ? navDesktop : navMobile, "Catalog top navigation");
  navigation.setSharedPluginData("portal-v2", "section-key", "header");
  navigation.setSharedPluginData("portal-v2", "source", "catalog/index.html");

  const hero = createSection(screen, "hero", "Catalog hero", screenWidth, contentWidth, "surface/emphasis", desktop, 72, 72);
  const heroGrid = auto("Catalog hero grid", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(heroGrid, "itemSpacing", spacing("2xl"));
  hero.appendChild(heroGrid);
  const heroCopy = auto("Catalog hero copy", "VERTICAL");
  heroCopy.counterAxisSizingMode = "FIXED";
  heroCopy.resize(desktop ? 720 : 336, desktop ? 560 : 700);
  bind(heroCopy, "itemSpacing", spacing("lg"));
  heroGrid.appendChild(heroCopy);
  await addEyebrow(heroCopy, "Городской каталог", desktop ? 240 : 230, true);
  await text(heroCopy, "Новостройки Борисоглебска", {
    name: "Catalog H1",
    styleName: "Typography/Display",
    width: desktop ? 720 : 336,
    color: semantic("text/inverse")
  });
  const heroLead = await text(heroCopy, "Сравните объекты по статусу проверки, пройдите быстрый подбор или выберите главный вопрос. Специалист сообщит только сведения, которые можно подтвердить на дату обращения.", {
    name: "Catalog lead",
    styleName: "Typography/Body Large",
    width: desktop ? 700 : 336,
    color: semantic("text/inverse")
  });
  heroLead.opacity = 0.78;
  const heroActions = auto("Catalog hero actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(heroActions, "itemSpacing", spacing("sm"));
  heroCopy.appendChild(heroActions);
  configureButton(heroActions, heroPrimary, "Пройти быстрый подбор", "#quiz", !desktop);
  configureButton(heroActions, heroSecondary, "Выбрать вопрос", "#questions", !desktop);
  configureButton(heroActions, heroSecondary, "Сравнить объекты", "#priority", !desktop);
  configureButton(heroActions, heroSecondary, "8 903 857-69-09", "tel:+79038576909", !desktop);
  await addNotice(heroCopy, "Цена, наличие квартир и условия покупки уточняются перед консультацией. Заявка не является бронью и не фиксирует стоимость.", desktop ? 700 : 336, true);
  const quickLead = appendInstance(heroGrid, desktop ? quickDesktop : quickMobile, "Catalog quick lead");
  configureLead(quickLead, "Quick");

  const navigator = createSection(screen, "catalog-navigator", "Catalog navigator", screenWidth, contentWidth, "background/soft", desktop, 42, 42);
  await addSectionHeader(navigator, "Маршруты каталога", "Выберите следующий шаг", "Навигация ведёт к существующим разделам страницы и не заменяет проверку цены, наличия или документов.", desktop ? 820 : 336);
  const navigatorActions = auto("Catalog route actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(navigatorActions, "itemSpacing", spacing("sm"));
  navigator.appendChild(navigatorActions);
  for (const item of [
    ["Главный вопрос", "#questions"],
    ["Быстрый подбор", "#quiz"],
    ["Сравнить объекты", "#priority"],
    ["Другие новостройки", "#reference"]
  ]) configureButton(navigatorActions, lightSecondary, item[0], item[1], !desktop);

  const questions = createSection(screen, "questions", "Catalog question routes", screenWidth, contentWidth, "surface/primary", desktop);
  await addSectionHeader(questions, "Что нужно проверить", "Начните с главного вопроса", "Карточка переносит выбранный вопрос в существующую короткую форму. Пользователь может изменить вопрос и объект перед отправкой.", desktop ? 830 : 336);
  createRows(questions, "Question route cards", desktop, questionRoutes, (parent, item) => {
    const instance = configureLink(parent, desktop ? linkDesktop : linkMobile, "Question / " + item.title, item.title, item.description, "#quick-lead", item.interest);
    shared(instance, "action-label", item.action);
  });

  const quiz = createSection(screen, "quiz", "Catalog rule quiz", screenWidth, contentWidth, "background/soft", desktop);
  await addSectionHeader(quiz, "Подбор без звонка на первом шаге", "Ответьте на пять вопросов и получите следующий шаг", "Квиз не подбирает фактически свободную квартиру и не обещает одобрение ипотеки. Он помогает определить, что проверить в первую очередь.", desktop ? 900 : 336);
  const quizCard = auto("Quiz intro state", "VERTICAL");
  quizCard.counterAxisSizingMode = "FIXED";
  quizCard.resize(desktop ? 860 : 336, desktop ? 390 : 520);
  bind(quizCard, "itemSpacing", spacing("lg"));
  bind(quizCard, "paddingLeft", spacing("xl"));
  bind(quizCard, "paddingRight", spacing("xl"));
  bind(quizCard, "paddingTop", spacing("xl"));
  bind(quizCard, "paddingBottom", spacing("xl"));
  radius(quizCard, radiusToken("xl"));
  fill(quizCard, semantic("surface/primary"));
  stroke(quizCard, semantic("border/default"));
  effect(quizCard, "Effects/Card");
  quizCard.setSharedPluginData("portal-v2", "quiz-state", "intro");
  quizCard.setSharedPluginData("portal-v2", "quiz-version", "catalog-rule-v1");
  quiz.appendChild(quizCard);
  await text(quizCard, "Сначала результат — потом контакты", { name: "Quiz title", styleName: "Typography/H3", width: desktop ? 796 : 292, color: semantic("text/primary") });
  await text(quizCard, "Телефон не нужен для прохождения вопросов. После результата пользователь решает, оставлять ли заявку специалисту.", { name: "Quiz description", styleName: "Typography/Body Large", width: desktop ? 796 : 292, color: semantic("text/muted") });
  const quizSteps = auto("Quiz step inventory", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(quizSteps, "itemSpacing", spacing("sm"));
  quizCard.appendChild(quizSteps);
  for (const label of ["1. Приоритет", "2. Квартира", "3. Бюджет", "4. Покупка", "5. Срок"]) {
    const chip = auto("Quiz step / " + label, "HORIZONTAL");
    chip.primaryAxisAlignItems = "CENTER";
    chip.counterAxisAlignItems = "CENTER";
    bind(chip, "paddingLeft", spacing("sm"));
    bind(chip, "paddingRight", spacing("sm"));
    bind(chip, "paddingTop", spacing("xs"));
    bind(chip, "paddingBottom", spacing("xs"));
    radius(chip, radiusToken("pill"));
    fill(chip, primitive("sage/100"));
    quizSteps.appendChild(chip);
    await text(chip, label, { name: "Quiz step label", styleName: "Typography/Label", width: desktop ? 120 : 260, color: primitive("sage/700") });
  }
  configureButton(quizCard, lightPrimary, "Начать подбор", "action:catalog_quiz_start", !desktop);
  await addNotice(quizCard, "Результат основан только на ответах пользователя. Он не подтверждает наличие квартиры, цену, статус объекта или решение банка.", desktop ? 796 : 292);

  const priority = createSection(screen, "priority", "Catalog priority projects", screenWidth, contentWidth, "surface/primary", desktop);
  await addSectionHeader(priority, "Сравнение проверки", "Три ключевых объекта", "Сравнение показывает только состояние внутренней проверки и доступные категории сведений. Оно не раскрывает рабочие значения характеристик, документов, цен или наличия.", desktop ? 900 : 336);
  const projectGrid = auto("Priority project cards", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(projectGrid, "itemSpacing", spacing("lg"));
  priority.appendChild(projectGrid);
  projects.forEach((item) => configureProject(projectGrid, desktop ? projectDesktop : projectMobile, item));
  await addNotice(priority, "Нулевой показатель означает, что источник или ключевое сведение ещё не принято для публичного использования. Это не означает отсутствие самого объекта или документов.", desktop ? 900 : 336);

  const reference = createSection(screen, "reference", "Reference catalog", screenWidth, contentWidth, "background/soft", desktop);
  await addSectionHeader(reference, "Справочная часть", "Другие новостройки города", "Выводятся только объекты с подтверждённым адресом, статусом и хотя бы одним публичным источником. Для них используется общая форма подбора.", desktop ? 900 : 336);
  createRows(reference, "Reference rules", desktop, referenceItems, (parent, item) => configureLink(parent, desktop ? linkDesktop : linkMobile, "Reference / " + item.title, item.title, item.description, "#quick-lead"));
  await addNotice(reference, "Неподтверждённые адреса и характеристики не выводятся. Новая карточка появляется только после проверки источников и внутренней валидации.", desktop ? 900 : 336);

  const lead = createSection(screen, "lead", "Catalog detailed lead", screenWidth, contentWidth, "surface/emphasis", desktop);
  await addSectionHeader(lead, "Подробный подбор квартиры", "Указать параметры будущей квартиры", "Форма подходит, если пользователь готов сразу сообщить комнатность, бюджет и способ покупки.", desktop ? 760 : 336, true);
  const detailedLead = appendInstance(lead, desktop ? detailedDesktop : detailedMobile, "Catalog detailed lead form");
  configureLead(detailedLead, "Detailed");

  const footer = appendInstance(screen, desktop ? footerDesktop : footerMobile, "Catalog footer");
  footer.setSharedPluginData("portal-v2", "section-key", "footer");
  footer.setSharedPluginData("portal-v2", "source", "catalog/index.html");
}

const notes = auto("Screen notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Состав экрана каталога", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Экран повторяет production catalog/index.html: Top Navigation с активным Catalog, hero с короткой формой, четыре якорных маршрута, пять карточек главных вопросов, initial-state квиза catalog-rule-v1, сравнение трёх приоритетных объектов, правила справочного каталога, подробную форму и Site Footer. Квиз в макете показан в состоянии Intro; пять шагов и Result зафиксированы через quiz-state/quiz-version и описаны в handoff. Все CTA используют реальные routes или action metadata. Цена, наличие, документы, применимость ипотеки и решение банка не обещаются.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "26 Screen · Catalog",
  componentKey: "catalog-screen",
  title: "Catalog",
  description: "Полный каталог новостроек в Desktop и Mobile, собранный из Portal v2 components и production-safe content.",
  background: "background/soft"
}, body));
