import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Brand variants", "VERTICAL");
stage.itemSpacing = 24;
root.appendChild(stage);

function brandMarkSvg(size) {
  const radius = size === 42 ? 13 : 11;
  const verticalWidth = size * 0.12;
  const horizontalHeight = size * 0.12;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<defs><linearGradient id="brand-gradient" x1="0" y1="0.5" x2="1" y2="0.5" gradientTransform="rotate(55 .5 .5)">' +
    '<stop offset="0" stop-color="rgb(232,93,63)"/><stop offset="1" stop-color="rgb(243,138,84)"/>' +
    '</linearGradient></defs>' +
    '<rect width="' + size + '" height="' + size + '" rx="' + radius + '" fill="url(#brand-gradient)"/>' +
    '<rect x="' + size * 0.25 + '" y="0" width="' + verticalWidth + '" height="' + size + '" fill="rgb(255,255,255)" opacity=".78"/>' +
    '<rect x="' + size * 0.63 + '" y="0" width="' + verticalWidth + '" height="' + size + '" fill="rgb(255,255,255)" opacity=".78"/>' +
    '<rect x="0" y="' + size * 0.26 + '" width="' + size + '" height="' + horizontalHeight + '" fill="rgb(255,255,255)" opacity=".75"/>' +
    '<rect x="0" y="' + size * 0.62 + '" width="' + size + '" height="' + horizontalHeight + '" fill="rgb(255,255,255)" opacity=".75"/>' +
    '</svg>';
}

const variants = [];
for (const context of ["Light", "Dark"]) {
  for (const size of ["Desktop", "Mobile"]) {
    const node = component("Context=" + context + ", Size=" + size, "HORIZONTAL");
    node.primaryAxisAlignItems = "CENTER";
    node.counterAxisAlignItems = "CENTER";
    bind(node, "itemSpacing", spacing("sm"));
    stage.appendChild(node);

    const markSize = size === "Desktop" ? 42 : 36;
    const mark = figma.createNodeFromSvg(brandMarkSvg(markSize));
    mark.name = "Brand mark";
    mark.resize(markSize, markSize);
    effect(mark, "Effects/Brand Mark");
    node.appendChild(mark);
    createdNodeIds.push(mark.id, ...mark.findAll().map((item) => item.id));

    const titleProperty = property(node, "Title", "TEXT", "Новостройки Борисоглебска");
    const titleVisible = property(node, "Show title", "BOOLEAN", true);
    const title = await text(node, "Новостройки Борисоглебска", {
      name: "Brand title",
      styleName: "Typography/Brand",
      width: size === "Desktop" ? 208 : 184,
      color: semantic(context === "Dark" ? "text/inverse" : "text/primary")
    });
    bindTextProperty(title, titleProperty);
    bindVisibilityProperty(title, titleVisible);

    node.description = context === "Dark"
      ? "Версия для тёмного hero, footer и контрастных поверхностей."
      : "Основная версия для header и светлых поверхностей.";
    variants.push(node);
  }
}

const set = combine(variants, stage, "Brand");
set.description = "Portal v2 Brand · Context × Size · exact production artwork";

const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила использования", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Название портала не сокращается и не заменяется названием застройщика или жилого комплекса. Light применяется на светлом header, Dark — на тёмных поверхностях. Brand mark является закрытым фирменным artwork: его градиент и сетка не перекрашиваются семантическими статусами.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "09 Component · Brand",
  componentKey: "brand",
  title: "Brand",
  description: "Независимая идентичность городского портала для светлых и тёмных поверхностей, desktop и mobile.",
  background: "background/soft"
}, body));
