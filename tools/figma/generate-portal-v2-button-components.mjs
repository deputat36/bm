import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Button variants", "VERTICAL");
stage.itemSpacing = 24;
root.appendChild(stage);
const variants = [];
const types = ["Primary", "Secondary"];
const states = ["Default", "Hover", "Focus", "Disabled"];
for (const type of types) {
  for (const state of states) {
    const node = component("Type=" + type + ", State=" + state, "HORIZONTAL");
    node.primaryAxisAlignItems = "CENTER";
    node.counterAxisAlignItems = "CENTER";
    bind(node, "paddingLeft", spacing("lg"));
    bind(node, "paddingRight", spacing("lg"));
    bind(node, "paddingTop", spacing("md"));
    bind(node, "paddingBottom", spacing("md"));
    bind(node, "itemSpacing", spacing("xs"));
    radius(node, radiusToken("md"));
    const isPrimary = type === "Primary";
    const isDisabled = state === "Disabled";
    const isHover = state === "Hover";
    if (isPrimary) {
      fill(node, semantic(isHover ? "action/primary/hover" : "action/primary"));
      stroke(node, semantic(isHover ? "action/primary/hover" : "action/primary"));
    } else {
      fill(node, semantic(isHover ? "action/secondary" : "surface/primary"));
      stroke(node, semantic(isDisabled ? "border/default" : "action/secondary"));
    }
    if (state === "Focus") effect(node, "Effects/Focus");
    else if (!isDisabled) effect(node, "Effects/Card");
    if (isDisabled) node.opacity = 0.52;
    stage.appendChild(node);
    const labelProperty = property(node, "Label", "TEXT", "Подобрать квартиру");
    const label = await text(node, "Подобрать квартиру", {
      name: "Label",
      styleName: "Typography/Label",
      width: 180,
      color: semantic(isPrimary || isHover ? "text/inverse" : "text/primary")
    });
    label.textAlignHorizontal = "CENTER";
    bindTextProperty(label, labelProperty);
    node.description = type === "Primary"
      ? "Главное действие: консультация, подбор или расчёт. Не использовать для нескольких равнозначных действий рядом."
      : "Вторичное действие: открыть характеристики, сравнение или источник без давления на пользователя.";
    variants.push(node);
  }
}
const set = combine(variants, stage, "Button");
set.description = "Portal v2 Button · Type × State · minimum touch target 48 px";
const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила использования", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Primary используется один раз в смысловом блоке. Secondary не конкурирует с главным CTA. Focus обязателен для клавиатурной навигации. Disabled не должен заменять объяснение причины недоступности действия.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "05 Component · Button",
  componentKey: "button",
  title: "Button",
  description: "Главные и вторичные действия портала с явными состояниями Default, Hover, Focus и Disabled.",
  background: "background/soft"
}, body));
