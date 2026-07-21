import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Top Navigation variants", "VERTICAL");
stage.itemSpacing = 24;
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
function setInstanceText(instance, prefix, value) {
  const key = Object.keys(instance.componentProperties).find((item) => item === prefix || item.startsWith(prefix + "#"));
  if (!key) throw new Error("Missing nested component property: " + prefix);
  instance.setProperties({ [key]: value });
}
async function navigationItem(parent, owner, label, propertyName, width, active) {
  const item = auto("Navigation item / " + propertyName, "HORIZONTAL");
  item.primaryAxisAlignItems = "CENTER";
  item.counterAxisAlignItems = "CENTER";
  bind(item, "paddingLeft", spacing("sm"));
  bind(item, "paddingRight", spacing("sm"));
  bind(item, "paddingTop", spacing("sm"));
  bind(item, "paddingBottom", spacing("sm"));
  radius(item, radiusToken("md"));
  fill(item, semantic(active ? "background/soft" : "surface/primary"));
  parent.appendChild(item);
  const labelProperty = property(owner, propertyName + " label", "TEXT", label);
  const labelNode = await text(item, label, {
    name: propertyName + " label",
    styleName: "Typography/Label",
    width,
    color: semantic(active ? "text/primary" : "text/body")
  });
  labelNode.textAlignHorizontal = "CENTER";
  bindTextProperty(labelNode, labelProperty);
  if (active) item.setSharedPluginData("portal-v2", "active-page", propertyName);
  return item;
}

const brandDesktop = localVariant("Brand", ["Context=Light", "Size=Desktop"]);
const brandMobile = localVariant("Brand", ["Context=Light", "Size=Mobile"]);
const primaryButton = localVariant("Button", ["Context=Light", "Type=Primary", "State=Default"]);
const activePages = ["None", "Catalog", "Developers", "Mortgage", "Guide", "News", "Contacts"];
const variants = [];

for (const layout of ["Desktop", "Mobile"]) {
  for (const activePage of activePages) {
    const desktop = layout === "Desktop";
    const node = component("Layout=" + layout + ", Active=" + activePage, desktop ? "HORIZONTAL" : "VERTICAL");
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.resize(desktop ? 1200 : 360, desktop ? 84 : 132);
    node.primaryAxisAlignItems = desktop ? "SPACE_BETWEEN" : "MIN";
    node.counterAxisAlignItems = desktop ? "CENTER" : "MIN";
    bind(node, "paddingLeft", spacing(desktop ? "md" : "sm"));
    bind(node, "paddingRight", spacing(desktop ? "md" : "sm"));
    bind(node, "paddingTop", spacing(desktop ? "md" : "sm"));
    bind(node, "paddingBottom", spacing(desktop ? "md" : "sm"));
    bind(node, "itemSpacing", spacing(desktop ? "lg" : "sm"));
    fill(node, semantic("surface/primary"));
    stroke(node, semantic("border/default"));
    radius(node, radiusToken("lg"));
    effect(node, "Effects/Header");
    stage.appendChild(node);

    const brand = (desktop ? brandDesktop : brandMobile).createInstance();
    brand.name = "Brand instance";
    node.appendChild(brand);
    createdNodeIds.push(brand.id);

    const viewport = auto(desktop ? "Navigation row" : "Scrollable navigation viewport", "HORIZONTAL");
    viewport.counterAxisAlignItems = "CENTER";
    if (!desktop) {
      viewport.primaryAxisSizingMode = "FIXED";
      viewport.counterAxisSizingMode = "FIXED";
      viewport.resize(336, 58);
      viewport.clipsContent = true;
    }
    node.appendChild(viewport);

    const row = auto("Navigation items", "HORIZONTAL");
    row.counterAxisAlignItems = "CENTER";
    bind(row, "itemSpacing", spacing("xs"));
    viewport.appendChild(row);

    await navigationItem(row, node, "Каталог", "Catalog", 72, activePage === "Catalog");
    await navigationItem(row, node, "Застройщики", "Developers", 104, activePage === "Developers");
    await navigationItem(row, node, "Ипотека", "Mortgage", 72, activePage === "Mortgage");
    await navigationItem(row, node, "Справочник", "Guide", 92, activePage === "Guide");
    await navigationItem(row, node, "Новости", "News", 72, activePage === "News");
    await navigationItem(row, node, "Контакты", "Contacts", 80, activePage === "Contacts");

    const cta = primaryButton.createInstance();
    cta.name = "Primary CTA";
    setInstanceText(cta, "Label", "Оставить заявку");
    row.appendChild(cta);
    createdNodeIds.push(cta.id);
    const showCtaProperty = property(node, "Show CTA", "BOOLEAN", true);
    bindVisibilityProperty(cta, showCtaProperty);

    node.description = desktop
      ? "Desktop header 1200 px: Brand, six navigation routes and one Light Primary CTA."
      : "Mobile header 360 px: Brand above a clipped horizontal navigation viewport.";
    variants.push(node);
  }
}

const set = combine(variants, stage, "Top Navigation");
set.description = "Portal v2 Top Navigation · Layout × Active page · built from Brand and Light Button instances";

const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила использования", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Brand ведёт на главную страницу и не дублируется пунктом меню. В каждой внутренней странице используется ровно один Active variant. На мобильной ширине пункты не сжимаются до нечитаемого состояния, а находятся в горизонтально прокручиваемом viewport. Главный CTA использует Button Context=Light и не заменяется обещанием цены, брони или одобрения ипотеки.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "10 Component · Top Navigation",
  componentKey: "top-navigation",
  title: "Top Navigation",
  description: "Главная навигация независимого городского портала с активным разделом, desktop и mobile компоновкой.",
  background: "background/soft"
}, body));