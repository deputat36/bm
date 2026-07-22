import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Homepage FAQ and Lead screens", "HORIZONTAL");
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
function configureFaq(parent, componentNode, name, question, answer) {
  const instance = appendInstance(parent, componentNode, name);
  setInstanceText(instance, "Question", question);
  setInstanceText(instance, "Answer", answer);
  return instance;
}
function exposedSubmit(instance) {
  const submit = instance.exposedInstances.find((item) => item.name === "Submit action");
  if (!submit) throw new Error("Missing exposed Submit action in Lead Form Card");
  return submit;
}
function configureLeadForm(parent, componentNode, layout) {
  const instance = appendInstance(parent, componentNode, "Detailed lead form / " + layout);
  setInstanceText(instance, "Eyebrow", "Подробная заявка");
  setInstanceBoolean(instance, "Show eyebrow", true);
  setInstanceText(instance, "Title", "Расскажите, что важно при покупке");
  setInstanceText(instance, "Description", "Если уже знаете свои параметры, заполните подробную форму. Это поможет специалисту подготовиться к разговору.");
  setInstanceBoolean(instance, "Show hint", false);
  setInstanceBoolean(instance, "Show footer note", false);
  setInstanceText(exposedSubmit(instance), "Label", "Получить консультацию");
  instance.setSharedPluginData("portal-v2", "form-id", "homepage_priority_selection");
  instance.setSharedPluginData("portal-v2", "lead-type", "portal_selection");
  instance.setSharedPluginData("portal-v2", "project", "Портал Новостройки Борисоглебска");
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
  fill(eyebrow, primitive("coral/100"));
  stroke(eyebrow, semantic("action/primary"));
  parent.appendChild(eyebrow);
  await text(eyebrow, value, {
    name: "Eyebrow label",
    styleName: "Typography/Label",
    width,
    color: dark ? semantic("action/primary/hover") : semantic("action/primary/hover")
  });
  return eyebrow;
}
async function addSectionHeader(parent, eyebrowValue, titleValue, descriptionValue, width) {
  const header = auto("Section header", "VERTICAL");
  bind(header, "itemSpacing", spacing("md"));
  parent.appendChild(header);
  await addEyebrow(header, eyebrowValue, Math.min(width, 240));
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
function createSection(screen, name, screenWidth, contentWidth, backgroundToken, desktop) {
  const section = auto(name, "VERTICAL");
  section.counterAxisSizingMode = "FIXED";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisAlignItems = "CENTER";
  section.resize(screenWidth, desktop ? 900 : 1500);
  section.paddingTop = desktop ? 88 : 62;
  section.paddingBottom = desktop ? 88 : 62;
  fill(section, semantic(backgroundToken));
  screen.appendChild(section);

  const container = auto(name + " container", "VERTICAL");
  container.counterAxisSizingMode = "FIXED";
  container.primaryAxisSizingMode = "AUTO";
  container.resize(contentWidth, desktop ? 760 : 1300);
  bind(container, "itemSpacing", spacing("xl"));
  section.appendChild(container);
  return container;
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
  return list;
}

const faqDesktopOpen = localVariant("FAQ Accordion", ["State=Open", "Size=Desktop"]);
const faqDesktopClosed = localVariant("FAQ Accordion", ["State=Closed", "Size=Desktop"]);
const faqMobileOpen = localVariant("FAQ Accordion", ["State=Open", "Size=Mobile"]);
const faqMobileClosed = localVariant("FAQ Accordion", ["State=Closed", "Size=Mobile"]);
const lightPrimary = localVariant("Button", ["Context=Light", "Type=Primary", "State=Default"]);
const lightSecondary = localVariant("Button", ["Context=Light", "Type=Secondary", "State=Default"]);
const heroSecondary = localVariant("Button", ["Context=Hero", "Type=Secondary", "State=Default"]);
const leadDesktop = localVariant("Lead Form Card", ["Layout=Desktop", "Scope=Detailed"]);
const leadMobile = localVariant("Lead Form Card", ["Layout=Mobile", "Scope=Detailed"]);

const faqs = [
  {
    question: "Где посмотреть новостройки Борисоглебска?",
    answer: "На портале собраны карточки новых домов Борисоглебска. Сведения по каждому объекту публикуются с указанием статуса проверки, а неподтверждённые цены и наличие не выдаются за актуальные."
  },
  {
    question: "Как узнать актуальные цены и наличие квартир?",
    answer: "Оставьте заявку или позвоните специалисту. Перед консультацией уточняются доступные на дату обращения сведения о цене, наличии, документах и способе покупки."
  },
  {
    question: "Можно ли подобрать 1-, 2- или 3-комнатную квартиру?",
    answer: "Да. В заявке можно указать нужную комнатность, бюджет, способ покупки и срок. Подбор не является бронью и не фиксирует стоимость квартиры."
  },
  {
    question: "Можно ли купить квартиру с семейной ипотекой?",
    answer: "Возможность применения семейной ипотеки зависит от актуальных условий программы, характеристик объекта и ситуации покупателя. Это проверяется отдельно перед расчётом."
  },
  {
    question: "Какие документы нужно проверить перед покупкой?",
    answer: "Набор документов зависит от объекта и схемы сделки. Обычно проверяют сведения о продавце или застройщике, разрешительные документы, договор, порядок оплаты и подтверждение полномочий стороны сделки."
  },
  {
    question: "Портал является сайтом застройщика?",
    answer: "Нет. Портал является независимым городским каталогом новостроек Борисоглебска. Информация сверяется по доступным источникам и уточняется перед консультацией."
  }
];

for (const layout of ["Desktop", "Mobile"]) {
  const desktop = layout === "Desktop";
  const screenWidth = desktop ? 1440 : 360;
  const contentWidth = desktop ? 1200 : 336;
  const screen = auto("Homepage FAQ & Lead / " + layout, "VERTICAL");
  screen.counterAxisSizingMode = "FIXED";
  screen.primaryAxisSizingMode = "AUTO";
  screen.resize(screenWidth, desktop ? 2450 : 3900);
  screen.clipsContent = true;
  fill(screen, semantic("surface/primary"));
  stroke(screen, semantic("border/default"));
  radius(screen, radiusToken("xl"));
  screen.setSharedPluginData("portal-v2", "screen-key", "homepage-faq-lead-" + layout.toLowerCase());
  stage.appendChild(screen);

  const faqContainer = createSection(screen, "FAQ section", screenWidth, contentWidth, "background/soft", desktop);
  await addSectionHeader(
    faqContainer,
    "Частые вопросы",
    "О покупке квартиры в новостройке",
    "Краткие ответы перед выбором объекта и консультацией.",
    desktop ? 830 : 336
  );

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
    const componentNode = desktop
      ? (index === 0 ? faqDesktopOpen : faqDesktopClosed)
      : (index === 0 ? faqMobileOpen : faqMobileClosed);
    configureFaq(faqStack, componentNode, "FAQ / " + item.question, item.question, item.answer);
  }

  const faqActions = auto("FAQ actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(faqActions, "itemSpacing", spacing("sm"));
  faqContainer.appendChild(faqActions);
  configureButton(faqActions, lightPrimary, "Задать вопрос специалисту", !desktop);
  configureButton(faqActions, lightSecondary, "Позвонить: 8 903 857-69-09", !desktop);

  const leadContainer = createSection(screen, "Detailed lead section", screenWidth, contentWidth, "background/hero", desktop);
  const leadLayout = auto("Detailed lead layout", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(leadLayout, "itemSpacing", spacing(desktop ? "xxl" : "xl"));
  leadContainer.appendChild(leadLayout);

  const info = auto("Detailed lead information", "VERTICAL");
  info.counterAxisSizingMode = "FIXED";
  info.primaryAxisSizingMode = "AUTO";
  info.resize(desktop ? 560 : 336, desktop ? 720 : 620);
  bind(info, "itemSpacing", spacing("lg"));
  leadLayout.appendChild(info);

  await addEyebrow(info, "Подробная заявка", 180, true);
  await text(info, "Расскажите, что важно при покупке", {
    name: "Lead section title",
    styleName: "Typography/H2",
    width: desktop ? 560 : 336,
    color: semantic("text/inverse")
  });
  const leadDescription = await text(info, "Если уже знаете свои параметры, заполните подробную форму. Это поможет специалисту подготовиться к разговору.", {
    name: "Lead section description",
    styleName: "Typography/Body Large",
    width: desktop ? 540 : 336,
    color: semantic("text/inverse")
  });
  leadDescription.opacity = 0.78;
  await addBulletList(info, [
    "Приоритет: Просторная 4А, Аэродромная 18Г и Сенная 76.",
    "Можно выбрать общий подбор среди всех новостроек.",
    "Заявка не является бронью и не фиксирует цену."
  ], desktop ? 540 : 336);
  configureButton(info, heroSecondary, "Позвонить: 8 903 857-69-09", false);

  configureLeadForm(leadLayout, desktop ? leadDesktop : leadMobile, layout);
}

const notes = auto("Screen notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Состав экрана", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Экран собирается только из существующих FAQ Accordion, Button и Lead Form Card instances. FAQ сохраняет шесть production-вопросов и ответов, но использует более читаемый вертикальный аккордеон: первый вопрос открыт, остальные закрыты. Mobile FAQ исправлен до системной ширины 336 px. Финальная тёмная секция использует Detailed Lead Form Card с восемью полями, обязательным согласием и exposed Submit action, чей Label переопределён на production-текст «Получить консультацию». Form ID и lead metadata сохраняются через shared plugin data.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "23 Screen · Homepage FAQ & Lead",
  componentKey: "homepage-faq-lead-screen",
  title: "Homepage FAQ & Lead",
  description: "FAQ и финальная подробная заявка в Desktop и Mobile, собранные из существующих компонентов дизайн-системы.",
  background: "background/soft"
}, body));