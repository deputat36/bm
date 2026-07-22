import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Homepage Purchase and Resources screens", "HORIZONTAL");
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
function appendInstance(parent, componentNode, name) {
  const instance = componentNode.createInstance();
  instance.name = name;
  parent.appendChild(instance);
  createdNodeIds.push(instance.id);
  return instance;
}
function configureLinkCard(parent, componentNode, name, titleValue, descriptionValue, route) {
  const instance = appendInstance(parent, componentNode, name);
  setInstanceText(instance, "Title", titleValue);
  setInstanceText(instance, "Description", descriptionValue);
  instance.setSharedPluginData("portal-v2", "route", route);
  return instance;
}
async function addSectionHeader(parent, titleValue, descriptionValue, width) {
  const header = auto("Section header", "VERTICAL");
  bind(header, "itemSpacing", spacing("md"));
  parent.appendChild(header);
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
  section.resize(screenWidth, desktop ? 500 : 820);
  section.paddingTop = desktop ? 88 : 62;
  section.paddingBottom = desktop ? 88 : 62;
  fill(section, semantic(soft ? "background/soft" : "surface/primary"));
  screen.appendChild(section);

  const container = auto(name + " container", "VERTICAL");
  container.counterAxisSizingMode = "FIXED";
  container.primaryAxisSizingMode = "AUTO";
  container.resize(contentWidth, desktop ? 340 : 700);
  bind(container, "itemSpacing", spacing("xl"));
  section.appendChild(container);
  return container;
}

const linkDesktop = localVariant("Link Card", ["Layout=Desktop", "State=Default"]);
const linkMobile = localVariant("Link Card", ["Layout=Mobile", "State=Default"]);

const purchaseMethods = [
  {
    title: "Ипотека",
    description: "Предварительный расчёт бюджета, взноса и платежа.",
    route: "ipoteka/"
  },
  {
    title: "Семейная ипотека",
    description: "Проверка актуальных условий программы на момент обращения.",
    route: "ipoteka/"
  },
  {
    title: "Господдержка и обмен",
    description: "Материнский капитал, сертификат «Молодая семья» и продажа своей недвижимости.",
    route: "guides/"
  }
];
const usefulResources = [
  {
    title: "Застройщики",
    description: "Связанные объекты и статус проверки данных.",
    route: "developers/"
  },
  {
    title: "Справочник покупателя",
    description: "Документы, ДДУ, сроки, ипотека и безопасная покупка.",
    route: "guides/"
  },
  {
    title: "Новости и обновления",
    description: "Документы, ход строительства и изменения по объектам.",
    route: "news/"
  }
];

for (const layout of ["Desktop", "Mobile"]) {
  const desktop = layout === "Desktop";
  const screenWidth = desktop ? 1440 : 360;
  const contentWidth = desktop ? 1200 : 336;
  const screen = auto("Homepage Purchase & Resources / " + layout, "VERTICAL");
  screen.counterAxisSizingMode = "FIXED";
  screen.primaryAxisSizingMode = "AUTO";
  screen.resize(screenWidth, desktop ? 1100 : 1800);
  screen.clipsContent = true;
  fill(screen, semantic("surface/primary"));
  stroke(screen, semantic("border/default"));
  radius(screen, radiusToken("xl"));
  screen.setSharedPluginData("portal-v2", "screen-key", "homepage-purchase-resources-" + layout.toLowerCase());
  stage.appendChild(screen);

  const purchaseContainer = createSection(screen, "Purchase methods section", screenWidth, contentWidth, true, desktop);
  await addSectionHeader(
    purchaseContainer,
    "Способы покупки",
    "Можно заранее обсудить бюджет и подготовиться к сделке.",
    desktop ? 830 : 336
  );
  const purchaseGrid = auto("Purchase method cards", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(purchaseGrid, "itemSpacing", spacing("lg"));
  purchaseContainer.appendChild(purchaseGrid);
  for (const item of purchaseMethods) {
    configureLinkCard(
      purchaseGrid,
      desktop ? linkDesktop : linkMobile,
      "Purchase method / " + item.title,
      item.title,
      item.description,
      item.route
    );
  }

  const resourcesContainer = createSection(screen, "Useful resources section", screenWidth, contentWidth, false, desktop);
  await addSectionHeader(
    resourcesContainer,
    "Полезные разделы",
    "Каталог дополняется справочной информацией для покупателей.",
    desktop ? 830 : 336
  );
  const resourcesGrid = auto("Useful resource cards", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(resourcesGrid, "itemSpacing", spacing("lg"));
  resourcesContainer.appendChild(resourcesGrid);
  for (const item of usefulResources) {
    configureLinkCard(
      resourcesGrid,
      desktop ? linkDesktop : linkMobile,
      "Useful resource / " + item.title,
      item.title,
      item.description,
      item.route
    );
  }
}

const notes = auto("Screen notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Состав экрана", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Экран собирается из шести локальных Link Card instances. Desktop повторяет две production-сетки по три карточки шириной 384 px, Mobile использует ширину 336 px и вертикальный поток. Карточка целиком является переходом; destination хранится в shared plugin data portal-v2/route. Семейная ипотека описывается только как проверка актуальных условий на дату обращения, без обещания ставки или применимости программы.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "22 Screen · Homepage Purchase & Resources",
  componentKey: "homepage-purchase-resources-screen",
  title: "Homepage Purchase & Resources",
  description: "Секции способов покупки и полезных разделов в Desktop и Mobile, собранные из Link Card instances.",
  background: "background/soft"
}, body));