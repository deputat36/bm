import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Homepage Start and Objects screens", "HORIZONTAL");
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
async function addSectionHeader(parent, eyebrowValue, titleValue, descriptionValue, width) {
  const header = auto("Section header", "VERTICAL");
  bind(header, "itemSpacing", spacing("md"));
  parent.appendChild(header);

  const eyebrow = auto("Section eyebrow", "HORIZONTAL");
  eyebrow.primaryAxisAlignItems = "CENTER";
  eyebrow.counterAxisAlignItems = "CENTER";
  bind(eyebrow, "paddingLeft", spacing("sm"));
  bind(eyebrow, "paddingRight", spacing("sm"));
  bind(eyebrow, "paddingTop", spacing("xs"));
  bind(eyebrow, "paddingBottom", spacing("xs"));
  radius(eyebrow, radiusToken("pill"));
  fill(eyebrow, primitive("coral/100"));
  stroke(eyebrow, semantic("action/primary"));
  header.appendChild(eyebrow);
  await text(eyebrow, eyebrowValue, {
    name: "Eyebrow label",
    styleName: "Typography/Label",
    width: Math.min(width, 280),
    color: semantic("action/primary/hover")
  });

  await text(header, titleValue, {
    name: "Section title",
    styleName: "Typography/H2",
    width,
    color: semantic("text/primary")
  });
  await text(header, descriptionValue, {
    name: "Section description",
    styleName: "Typography/Body Large",
    width,
    color: semantic("text/muted")
  });
  return header;
}

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
const secondaryButton = localVariant("Button", ["Context=Light", "Type=Secondary", "State=Default"]);

const projects = [
  {
    title: "Просторная 4А",
    description: "Собираем предварительные обращения и проверяем первичные сведения об объекте, документах, сроках, характеристиках и возможностях покупки.",
    facts: [
      "Карточка включена в приоритет проверки.",
      "Точные характеристики не публикуются без первичных источников.",
      "Специалист сообщит, какие данные подтверждены на момент обращения."
    ]
  },
  {
    title: "Аэродромная 18Г",
    description: "Собираем интерес покупателей и проверяем сведения о застройщике, сроках, документах, квартирах и статусе дома.",
    facts: [
      "Адрес включён в первую очередь.",
      "Характеристики проходят проверку.",
      "Неподтверждённые цены не публикуются."
    ]
  },
  {
    title: "Сенная 76",
    description: "Собираем предварительные обращения и проверяем сведения по дому, документам, квартирам и возможностям покупки.",
    facts: [
      "Объект включён в первую очередь.",
      "Источники и характеристики уточняются.",
      "Заявку можно оставить уже сейчас."
    ]
  }
];

for (const layout of ["Desktop", "Mobile"]) {
  const desktop = layout === "Desktop";
  const screenWidth = desktop ? 1440 : 360;
  const contentWidth = desktop ? 1200 : 336;
  const screen = auto("Homepage Start and Objects / " + layout, "VERTICAL");
  screen.counterAxisSizingMode = "FIXED";
  screen.primaryAxisSizingMode = "AUTO";
  screen.resize(screenWidth, desktop ? 1650 : 3300);
  screen.clipsContent = true;
  fill(screen, semantic("surface/primary"));
  stroke(screen, semantic("border/default"));
  radius(screen, radiusToken("xl"));
  screen.setSharedPluginData("portal-v2", "screen-key", "homepage-start-objects-" + layout.toLowerCase());
  stage.appendChild(screen);

  const startSection = auto("Start section", "VERTICAL");
  startSection.counterAxisSizingMode = "FIXED";
  startSection.primaryAxisSizingMode = "AUTO";
  startSection.counterAxisAlignItems = "CENTER";
  startSection.resize(screenWidth, desktop ? 620 : 1300);
  startSection.paddingTop = desktop ? 88 : 62;
  startSection.paddingBottom = desktop ? 88 : 62;
  fill(startSection, semantic("background/soft"));
  screen.appendChild(startSection);

  const startContent = auto("Start content", "VERTICAL");
  startContent.counterAxisSizingMode = "FIXED";
  startContent.primaryAxisSizingMode = "AUTO";
  startContent.resize(contentWidth, desktop ? 500 : 1180);
  bind(startContent, "itemSpacing", spacing(desktop ? "xl" : "lg"));
  startSection.appendChild(startContent);

  await addSectionHeader(
    startContent,
    "С чего начать",
    "Выберите свою задачу",
    "Портал направит к подходящему следующему шагу. Цена, наличие и применимость программы всё равно проверяются на дату обращения.",
    desktop ? 830 : 336
  );

  const scenarioGrid = auto("Scenario cards", desktop ? "HORIZONTAL" : "VERTICAL");
  scenarioGrid.itemSpacing = desktop ? 22 : 18;
  startContent.appendChild(scenarioGrid);
  const scenarioVariants = desktop ? scenarioDesktop : scenarioMobile;
  appendInstance(scenarioGrid, scenarioVariants.Object, "Scenario / Object");
  appendInstance(scenarioGrid, scenarioVariants.Selection, "Scenario / Selection");
  appendInstance(scenarioGrid, scenarioVariants.Mortgage, "Scenario / Mortgage");

  const objectsSection = auto("Priority objects section", "VERTICAL");
  objectsSection.counterAxisSizingMode = "FIXED";
  objectsSection.primaryAxisSizingMode = "AUTO";
  objectsSection.counterAxisAlignItems = "CENTER";
  objectsSection.resize(screenWidth, desktop ? 930 : 1900);
  objectsSection.paddingTop = desktop ? 88 : 62;
  objectsSection.paddingBottom = desktop ? 88 : 62;
  fill(objectsSection, semantic("surface/primary"));
  screen.appendChild(objectsSection);

  const objectsContent = auto("Priority objects content", "VERTICAL");
  objectsContent.counterAxisSizingMode = "FIXED";
  objectsContent.primaryAxisSizingMode = "AUTO";
  objectsContent.resize(contentWidth, desktop ? 800 : 1780);
  bind(objectsContent, "itemSpacing", spacing(desktop ? "xl" : "lg"));
  objectsSection.appendChild(objectsContent);

  await addSectionHeader(
    objectsContent,
    "Приоритет сбора заявок",
    "Выберите интересующий объект",
    "Каждая заявка привязывается к конкретному адресу. Для остальных новостроек доступен общий подбор через каталог.",
    desktop ? 830 : 336
  );

  const projectGrid = auto("Priority project cards", desktop ? "HORIZONTAL" : "VERTICAL");
  projectGrid.itemSpacing = desktop ? 22 : 18;
  objectsContent.appendChild(projectGrid);
  for (const project of projects) {
    const card = appendInstance(projectGrid, desktop ? projectDesktop : projectMobile, "Project / " + project.title);
    setInstanceText(card, "Project title", project.title);
    setInstanceText(card, "Description", project.description);
    setInstanceText(card, "Fact 1", project.facts[0]);
    setInstanceText(card, "Fact 2", project.facts[1]);
    setInstanceText(card, "Fact 3", project.facts[2]);
    setInstanceBoolean(card, "Show secondary action", true);
  }

  const catalogAction = appendInstance(objectsContent, secondaryButton, "Other new buildings action");
  setInstanceText(catalogAction, "Label", "Посмотреть другие новостройки");
  if (!desktop) catalogAction.layoutSizingHorizontal = "FILL";
}

const notes = auto("Screen notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Состав экрана", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Экран содержит две последовательные production-секции: выбор задачи и приоритетные объекты. Scenario Card не смешивается с данными жилого дома. Project Card использует Verification=Pending и сообщает статус до описания. Все CTA являются локальными Button instances; «Оставить заявку» не означает бронь, фиксацию цены или подтверждение наличия. Desktop использует контейнер 1200 px и три колонки, Mobile — 336 px и вертикальный поток. Внешних изображений нет.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "16 Screen · Homepage Start & Objects",
  componentKey: "homepage-start-objects-screen",
  title: "Homepage Start & Objects",
  description: "Две следующие секции главной страницы в Desktop и Mobile, собранные из Scenario Card и Pending Project Card.",
  background: "background/soft"
}, body));
