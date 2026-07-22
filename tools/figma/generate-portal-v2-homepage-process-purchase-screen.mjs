import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Homepage Process and Purchase screens", "HORIZONTAL");
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
function configureButton(parent, componentNode, label, fillWidth = false) {
  const instance = appendInstance(parent, componentNode, label + " action");
  setInstanceText(instance, "Label", label);
  if (fillWidth) instance.layoutSizingHorizontal = "FILL";
  return instance;
}
function configureStepCard(parent, componentNode, name, stepLabel, titleValue, descriptionValue) {
  const instance = appendInstance(parent, componentNode, name);
  setInstanceText(instance, "Step label", stepLabel);
  setInstanceText(instance, "Title", titleValue);
  setInstanceText(instance, "Description", descriptionValue);
  setInstanceBoolean(instance, "Show step label", true);
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
    width: Math.min(width, 320),
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
function createSection(screen, name, screenWidth, contentWidth, soft, desktop) {
  const section = auto(name, "VERTICAL");
  section.counterAxisSizingMode = "FIXED";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisAlignItems = "CENTER";
  section.resize(screenWidth, desktop ? 610 : 1130);
  section.paddingTop = desktop ? 88 : 62;
  section.paddingBottom = desktop ? 88 : 62;
  fill(section, semantic(soft ? "background/soft" : "surface/primary"));
  screen.appendChild(section);

  const container = auto(name + " container", "VERTICAL");
  container.counterAxisSizingMode = "FIXED";
  container.primaryAxisSizingMode = "AUTO";
  container.resize(contentWidth, desktop ? 480 : 1000);
  bind(container, "itemSpacing", spacing("xl"));
  section.appendChild(container);
  return container;
}

const processDesktop = localVariant("Step Card", ["Layout=Desktop", "Grid=Three", "State=Default"]);
const processMobile = localVariant("Step Card", ["Layout=Mobile", "Grid=Three", "State=Default"]);
const purchaseDesktop = localVariant("Step Card", ["Layout=Desktop", "Grid=Four", "State=Default"]);
const purchaseMobile = localVariant("Step Card", ["Layout=Mobile", "Grid=Four", "State=Default"]);
const primaryButton = localVariant("Button", ["Context=Light", "Type=Primary", "State=Default"]);
const secondaryButton = localVariant("Button", ["Context=Light", "Type=Secondary", "State=Default"]);

const consultationSteps = [
  {
    step: "Шаг 1",
    title: "Уточняем задачу",
    description: "Какой объект интересует, когда планируется покупка и что нужно проверить в первую очередь."
  },
  {
    step: "Шаг 2",
    title: "Сверяем информацию",
    description: "Отделяем подтверждённые сведения от рабочих данных и отмечаем недостающие документы."
  },
  {
    step: "Шаг 3",
    title: "Определяем действие",
    description: "Запросить документы, выполнить расчёт, подобрать альтернативу или дождаться обновления."
  }
];
const purchaseSteps = [
  {
    step: "1",
    title: "Определить параметры",
    description: "Комнатность, бюджет, желаемый срок, способ покупки и требования к дому."
  },
  {
    step: "2",
    title: "Сравнить новые дома",
    description: "Сопоставить адреса и доступные подтверждённые сведения, не полагаясь на одно рекламное обещание."
  },
  {
    step: "3",
    title: "Проверить документы",
    description: "Уточнить продавца или застройщика, договор, порядок оплаты и разрешительные документы."
  },
  {
    step: "4",
    title: "Рассчитать покупку",
    description: "Оценить собственные средства, ипотеку, господдержку и продажу имеющейся недвижимости."
  }
];

for (const layout of ["Desktop", "Mobile"]) {
  const desktop = layout === "Desktop";
  const screenWidth = desktop ? 1440 : 360;
  const contentWidth = desktop ? 1200 : 336;
  const screen = auto("Homepage Process & Purchase / " + layout, "VERTICAL");
  screen.counterAxisSizingMode = "FIXED";
  screen.primaryAxisSizingMode = "AUTO";
  screen.resize(screenWidth, desktop ? 1320 : 2500);
  screen.clipsContent = true;
  fill(screen, semantic("surface/primary"));
  stroke(screen, semantic("border/default"));
  radius(screen, radiusToken("xl"));
  screen.setSharedPluginData("portal-v2", "screen-key", "homepage-process-purchase-" + layout.toLowerCase());
  stage.appendChild(screen);

  const processContainer = createSection(screen, "Consultation process section", screenWidth, contentWidth, true, desktop);
  await addSectionHeader(
    processContainer,
    "Как проходит консультация",
    "От вопроса к понятному следующему шагу",
    "Без бронирования, фиксации цены и обязательств со стороны покупателя.",
    desktop ? 830 : 336
  );

  const processGrid = auto("Consultation process cards", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(processGrid, "itemSpacing", spacing("lg"));
  processContainer.appendChild(processGrid);
  for (const item of consultationSteps) {
    configureStepCard(
      processGrid,
      desktop ? processDesktop : processMobile,
      "Consultation / " + item.step,
      item.step,
      item.title,
      item.description
    );
  }

  const purchaseContainer = createSection(screen, "Purchase steps section", screenWidth, contentWidth, false, desktop);
  await addSectionHeader(
    purchaseContainer,
    "Покупка без лишней путаницы",
    "Как купить квартиру в новостройке Борисоглебска",
    "Начните не с передачи денег, а с определения задачи, проверки объекта и понятного финансового сценария.",
    desktop ? 830 : 336
  );

  const purchaseGrid = auto("Purchase step cards", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(purchaseGrid, "itemSpacing", spacing("lg"));
  purchaseContainer.appendChild(purchaseGrid);
  for (const item of purchaseSteps) {
    configureStepCard(
      purchaseGrid,
      desktop ? purchaseDesktop : purchaseMobile,
      "Purchase / " + item.step,
      item.step,
      item.title,
      item.description
    );
  }

  const purchaseActions = auto("Purchase section actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(purchaseActions, "itemSpacing", spacing("sm"));
  purchaseContainer.appendChild(purchaseActions);
  configureButton(purchaseActions, primaryButton, "Начать подбор", !desktop);
  configureButton(purchaseActions, secondaryButton, "Что проверить перед покупкой", !desktop);
}

const notes = auto("Screen notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Состав экрана", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Экран собирается из локальных Step Card и Button instances. Desktop повторяет production-сетки: три консультационных шага по 384 px и четыре покупательских шага по 284 px. Mobile использует ширину 336 px и вертикальный поток. CTA размещены только после покупательских шагов. Тексты не обещают бронь, фиксацию цены, наличие квартиры, одобрение банка или юридический результат.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "20 Screen · Homepage Process & Purchase",
  componentKey: "homepage-process-purchase-screen",
  title: "Homepage Process & Purchase",
  description: "Секции процесса консультации и безопасного сценария покупки в Desktop и Mobile, собранные из локальных компонентов.",
  background: "background/soft"
}, body));
