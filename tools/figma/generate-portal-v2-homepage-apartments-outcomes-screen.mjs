import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Homepage Apartments and Outcomes screens", "HORIZONTAL");
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
function exposedButton(instance) {
  const button = instance.exposedInstances.find((item) => item.name === "Primary action");
  if (!button) throw new Error("Missing exposed Primary action in Content Card");
  return button;
}
function configureButton(parent, componentNode, label, fillWidth = false) {
  const instance = appendInstance(parent, componentNode, label + " action");
  setInstanceText(instance, "Label", label);
  if (fillWidth) instance.layoutSizingHorizontal = "FILL";
  return instance;
}
function configureContentCard(parent, componentNode, name, titleValue, descriptionValue, showAction, actionLabel = "") {
  const instance = appendInstance(parent, componentNode, name);
  setInstanceText(instance, "Title", titleValue);
  setInstanceText(instance, "Description", descriptionValue);
  setInstanceBoolean(instance, "Show action", showAction);
  if (showAction) setInstanceText(exposedButton(instance), "Label", actionLabel);
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
    width: Math.min(width, 300),
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
  section.resize(screenWidth, desktop ? 640 : 1220);
  section.paddingTop = desktop ? 88 : 62;
  section.paddingBottom = desktop ? 88 : 62;
  fill(section, semantic(soft ? "background/soft" : "surface/primary"));
  screen.appendChild(section);

  const container = auto(name + " container", "VERTICAL");
  container.counterAxisSizingMode = "FIXED";
  container.primaryAxisSizingMode = "AUTO";
  container.resize(contentWidth, desktop ? 500 : 1080);
  bind(container, "itemSpacing", spacing("xl"));
  section.appendChild(container);
  return container;
}

const selectionDesktop = localVariant("Content Card", ["Layout=Desktop", "Purpose=Selection", "State=Default"]);
const selectionMobile = localVariant("Content Card", ["Layout=Mobile", "Purpose=Selection", "State=Default"]);
const outcomeDesktop = localVariant("Content Card", ["Layout=Desktop", "Purpose=Outcome", "State=Default"]);
const outcomeMobile = localVariant("Content Card", ["Layout=Mobile", "Purpose=Outcome", "State=Default"]);
const primaryButton = localVariant("Button", ["Context=Light", "Type=Primary", "State=Default"]);
const secondaryButton = localVariant("Button", ["Context=Light", "Type=Secondary", "State=Default"]);

const apartments = [
  {
    title: "1-комнатные квартиры",
    description: "Подбор компактной квартиры для первой покупки, переезда, инвестирования или проживания одного-двух человек.",
    action: "Подобрать 1-комнатную"
  },
  {
    title: "2-комнатные квартиры",
    description: "Подбор квартиры с отдельной спальней, рабочей зоной или дополнительным пространством для семьи.",
    action: "Подобрать 2-комнатную"
  },
  {
    title: "3-комнатные квартиры",
    description: "Подбор семейной квартиры с учётом состава семьи, бюджета, сроков и возможного использования господдержки.",
    action: "Подобрать 3-комнатную"
  }
];
const outcomes = [
  {
    title: "Подходящие объекты",
    description: "Сопоставим адрес, комнатность, площадь, срок и ваши требования."
  },
  {
    title: "Финансовый сценарий",
    description: "Обсудим бюджет, первоначальный взнос, ипотеку, сертификаты и встречную продажу."
  },
  {
    title: "Проверенные данные",
    description: "Отделим подтверждённую информацию от сведений, которые ещё требуют уточнения."
  },
  {
    title: "Следующий шаг",
    description: "Определим, что делать дальше: запросить детали, рассчитать покупку или дождаться обновлений."
  }
];

for (const layout of ["Desktop", "Mobile"]) {
  const desktop = layout === "Desktop";
  const screenWidth = desktop ? 1440 : 360;
  const contentWidth = desktop ? 1200 : 336;
  const screen = auto("Homepage Apartments & Outcomes / " + layout, "VERTICAL");
  screen.counterAxisSizingMode = "FIXED";
  screen.primaryAxisSizingMode = "AUTO";
  screen.resize(screenWidth, desktop ? 1500 : 2600);
  screen.clipsContent = true;
  fill(screen, semantic("surface/primary"));
  stroke(screen, semantic("border/default"));
  radius(screen, radiusToken("xl"));
  screen.setSharedPluginData("portal-v2", "screen-key", "homepage-apartments-outcomes-" + layout.toLowerCase());
  stage.appendChild(screen);

  const apartmentsContainer = createSection(screen, "Apartments section", screenWidth, contentWidth, true, desktop);
  await addSectionHeader(
    apartmentsContainer,
    "Подбор по комнатности",
    "Квартиры в новостройках Борисоглебска",
    "Укажите нужную комнатность, бюджет и способ покупки. Специалист проверит, какие варианты и сведения доступны на дату обращения.",
    desktop ? 830 : 336
  );

  const apartmentGrid = auto("Apartment cards", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(apartmentGrid, "itemSpacing", spacing("lg"));
  apartmentsContainer.appendChild(apartmentGrid);
  for (const apartment of apartments) {
    configureContentCard(
      apartmentGrid,
      desktop ? selectionDesktop : selectionMobile,
      "Room selection / " + apartment.title,
      apartment.title,
      apartment.description,
      true,
      apartment.action
    );
  }

  const apartmentActions = auto("Apartment section actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(apartmentActions, "itemSpacing", spacing("sm"));
  apartmentsContainer.appendChild(apartmentActions);
  configureButton(apartmentActions, secondaryButton, "Ответить на 5 вопросов без телефона", !desktop);
  configureButton(apartmentActions, secondaryButton, "Позвонить: 8 903 857-69-09", !desktop);

  const outcomesContainer = createSection(screen, "Consultation outcomes section", screenWidth, contentWidth, false, desktop);
  await addSectionHeader(
    outcomesContainer,
    "Польза консультации",
    "Что решим за один разговор",
    "Поможем собрать разрозненные сведения в понятный сценарий покупки — без обещаний неподтверждённых цен и наличия.",
    desktop ? 830 : 336
  );

  const outcomeGrid = auto("Consultation outcome cards", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(outcomeGrid, "itemSpacing", spacing("lg"));
  outcomesContainer.appendChild(outcomeGrid);
  for (const outcome of outcomes) {
    configureContentCard(
      outcomeGrid,
      desktop ? outcomeDesktop : outcomeMobile,
      "Consultation outcome / " + outcome.title,
      outcome.title,
      outcome.description,
      false
    );
  }

  const outcomeActions = auto("Consultation outcome actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(outcomeActions, "itemSpacing", spacing("sm"));
  outcomesContainer.appendChild(outcomeActions);
  configureButton(outcomeActions, primaryButton, "Получить консультацию", !desktop);
  configureButton(outcomeActions, secondaryButton, "Изучить справочник", !desktop);
}

const notes = auto("Screen notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Состав экрана", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Экран собирается из локальных Content Card и Button instances. Desktop повторяет production-сетки: три Selection-карточки по 384 px и четыре Outcome-карточки по 284 px. Mobile использует ширину 336 px и вертикальный поток. Label каждой комнатной CTA меняется через exposed Button instance. Тексты сохраняют проверяемый характер данных: подбор не означает наличие конкретной квартиры, а консультация не обещает цену или результат.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "18 Screen · Homepage Apartments & Outcomes",
  componentKey: "homepage-apartments-outcomes-screen",
  title: "Homepage Apartments & Outcomes",
  description: "Секции подбора по комнатности и результатов консультации в Desktop и Mobile, собранные из локальных компонентов.",
  background: "background/soft"
}, body));