import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Site Footer variants", "VERTICAL");
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
function nestedPropertyKey(instance, prefix) {
  const key = Object.keys(instance.componentProperties).find((item) => item === prefix || item.startsWith(prefix + "#"));
  if (!key) throw new Error("Missing nested component property: " + prefix);
  return key;
}
function setInstanceText(instance, prefix, value) {
  instance.setProperties({ [nestedPropertyKey(instance, prefix)]: value });
}

const variants = [];
for (const layout of ["Desktop", "Mobile"]) {
  const desktop = layout === "Desktop";
  const width = desktop ? 1200 : 336;
  const node = component("Layout=" + layout, desktop ? "HORIZONTAL" : "VERTICAL");
  node.counterAxisSizingMode = "FIXED";
  node.primaryAxisSizingMode = "AUTO";
  node.resize(width, desktop ? 190 : 330);
  node.paddingLeft = desktop ? 32 : 24;
  node.paddingRight = desktop ? 32 : 24;
  node.paddingTop = desktop ? 34 : 28;
  node.paddingBottom = desktop ? 34 : 28;
  bind(node, "itemSpacing", spacing(desktop ? "2xl" : "xl"));
  fill(node, semantic("surface/emphasis"));
  stage.appendChild(node);

  const left = auto("Portal identity", "VERTICAL");
  left.counterAxisSizingMode = "FIXED";
  left.resize(desktop ? 500 : 288, 120);
  bind(left, "itemSpacing", spacing("sm"));
  node.appendChild(left);

  const brand = localVariant("Brand", ["Context=Dark", "Size=" + layout]).createInstance();
  brand.name = "Portal brand";
  setInstanceText(brand, "Title", "Новостройки Борисоглебска");
  left.appendChild(brand);
  createdNodeIds.push(brand.id);

  const taglineValue = "Городской каталог новых домов и квартир.";
  const taglineProperty = property(node, "Tagline", "TEXT", taglineValue);
  const tagline = await text(left, taglineValue, {
    name: "Tagline",
    styleName: "Typography/Body",
    width: desktop ? 500 : 288,
    color: semantic("text/inverse")
  });
  tagline.opacity = 0.72;
  bindTextProperty(tagline, taglineProperty);

  const phoneValue = "8 903 857-69-09";
  const phoneProperty = property(node, "Phone", "TEXT", phoneValue);
  const phone = await text(left, phoneValue, {
    name: "Phone",
    styleName: "Typography/Label",
    width: desktop ? 300 : 288,
    color: primitive("coral/100")
  });
  bindTextProperty(phone, phoneProperty);

  const right = auto("Legal information", "VERTICAL");
  right.counterAxisSizingMode = "FIXED";
  right.resize(desktop ? 556 : 288, 120);
  bind(right, "itemSpacing", spacing("md"));
  node.appendChild(right);

  const disclaimerValue = "Не является официальным сайтом застройщика. Информация уточняется по публичным источникам.";
  const disclaimerProperty = property(node, "Disclaimer", "TEXT", disclaimerValue);
  const disclaimer = await text(right, disclaimerValue, {
    name: "Disclaimer",
    styleName: "Typography/Body",
    width: desktop ? 556 : 288,
    color: semantic("text/inverse")
  });
  disclaimer.opacity = 0.72;
  bindTextProperty(disclaimer, disclaimerProperty);

  const linksValue = "Источники · Политика данных · Контакты";
  const linksProperty = property(node, "Links", "TEXT", linksValue);
  const links = await text(right, linksValue, {
    name: "Legal links",
    styleName: "Typography/Label",
    width: desktop ? 556 : 288,
    color: primitive("coral/100")
  });
  bindTextProperty(links, linksProperty);

  node.setSharedPluginData("portal-v2", "phone-route", "tel:+79038576909");
  node.setSharedPluginData("portal-v2", "sources-route", "sources/");
  node.setSharedPluginData("portal-v2", "privacy-route", "privacy/");
  node.setSharedPluginData("portal-v2", "contacts-route", "contacts/");
  node.description = desktop
    ? "Desktop footer независимого городского каталога: Brand Dark, телефон, публичные источники и юридические ссылки."
    : "Mobile footer шириной 336 px с вертикальной структурой и тем же юридическим смыслом.";
  variants.push(node);
}

const set = combine(variants, stage, "Site Footer");
set.description = "Portal v2 Site Footer · Layout · Dark Brand, contact and legal navigation metadata";

const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила использования", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Site Footer завершает независимый городской портал. Он использует Brand Context=Dark, не содержит бренда одного застройщика и обязательно сохраняет оговорку о публичных источниках. Телефон и маршруты Sources, Privacy и Contacts записываются в shared plugin data. Mobile использует системную ширину 336 px.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "24 Component · Site Footer",
  componentKey: "site-footer",
  title: "Site Footer",
  description: "Тёмный подвал независимого портала с контактами, юридической оговоркой и навигацией по источникам.",
  background: "background/soft"
}, body));
