import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Link Card variants", "VERTICAL");
stage.itemSpacing = 24;
root.appendChild(stage);

const defaults = {
  title: "Ипотека",
  description: "Предварительный расчёт бюджета, взноса и платежа."
};
const variants = [];

for (const layout of ["Desktop", "Mobile"]) {
  for (const state of ["Default", "Hover"]) {
    const desktop = layout === "Desktop";
    const hovered = state === "Hover";
    const width = desktop ? 384 : 336;
    const height = desktop ? 192 : 180;
    const padding = desktop ? 26 : 22;

    const node = component("Layout=" + layout + ", State=" + state, "VERTICAL");
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.resize(width, height);
    node.paddingLeft = padding;
    node.paddingRight = padding;
    node.paddingTop = padding;
    node.paddingBottom = padding;
    bind(node, "itemSpacing", spacing("md"));
    node.topLeftRadius = desktop ? 22 : 18;
    node.topRightRadius = desktop ? 22 : 18;
    node.bottomLeftRadius = desktop ? 22 : 18;
    node.bottomRightRadius = desktop ? 22 : 18;
    fill(node, semantic("surface/primary"));
    stroke(node, semantic(hovered ? "border/strong" : "border/default"));
    effect(node, hovered ? "Effects/Card Hover" : "Effects/Card");
    stage.appendChild(node);

    const titleProperty = property(node, "Title", "TEXT", defaults.title);
    const title = await text(node, defaults.title, {
      name: "Title",
      styleName: "Typography/H3",
      width: width - padding * 2,
      color: semantic("text/primary")
    });
    bindTextProperty(title, titleProperty);

    const descriptionProperty = property(node, "Description", "TEXT", defaults.description);
    const description = await text(node, defaults.description, {
      name: "Description",
      styleName: "Typography/Body",
      width: width - padding * 2,
      color: semantic("text/muted")
    });
    bindTextProperty(description, descriptionProperty);

    node.description = "Кликабельная карточка перехода в раздел портала. Destination хранится на экземпляре экрана через shared plugin data, а не показывается как неподтверждённое действие.";
    variants.push(node);
  }
}

const set = combine(variants, stage, "Link Card");
set.description = "Portal v2 Link Card · Layout × State · editable title and description; route stored on screen instance";

const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила использования", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Link Card используется для полностью кликабельных карточек-направлений: способы покупки, справочные разделы и другие маршруты портала. Desktop повторяет production-сетку из трёх карточек шириной около 384 px, Mobile — 336 px. Компонент не содержит отдельной кнопки, цены, ставки, обещания одобрения или подтверждения применимости программы. Адрес перехода хранится на экземпляре составного экрана через shared plugin data portal-v2/route.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "21 Component · Link Card",
  componentKey: "link-card",
  title: "Link Card",
  description: "Кликабельная карточка перехода в раздел портала без лишнего CTA и рекламных обещаний.",
  background: "background/soft"
}, body));