import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Content Card variants", "VERTICAL");
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

const primaryButton = localVariant("Button", ["Context=Light", "Type=Primary", "State=Default"]);
const defaults = {
  Selection: {
    title: "1-комнатные квартиры",
    description: "Подбор компактной квартиры для первой покупки, переезда, инвестирования или проживания одного-двух человек.",
    action: "Подобрать 1-комнатную"
  },
  Outcome: {
    title: "Подходящие объекты",
    description: "Сопоставим адрес, комнатность, площадь, срок и ваши требования.",
    action: "Подробнее"
  }
};
const variants = [];

for (const layout of ["Desktop", "Mobile"]) {
  for (const purpose of ["Selection", "Outcome"]) {
    for (const state of ["Default", "Hover"]) {
      const desktop = layout === "Desktop";
      const selection = purpose === "Selection";
      const hovered = state === "Hover";
      const width = desktop ? (selection ? 384 : 284) : 336;
      const height = desktop ? (selection ? 292 : 224) : (selection ? 280 : 210);
      const padding = desktop ? 26 : 22;
      const content = defaults[purpose];
      const node = component("Layout=" + layout + ", Purpose=" + purpose + ", State=" + state, "HORIZONTAL");
      node.primaryAxisSizingMode = "FIXED";
      node.counterAxisSizingMode = "FIXED";
      node.resize(width, height);
      node.paddingLeft = padding;
      node.paddingRight = padding;
      node.paddingTop = padding;
      node.paddingBottom = padding;
      node.itemSpacing = selection ? 0 : 14;
      node.topLeftRadius = desktop ? 22 : 18;
      node.topRightRadius = desktop ? 22 : 18;
      node.bottomLeftRadius = desktop ? 22 : 18;
      node.bottomRightRadius = desktop ? 22 : 18;
      fill(node, semantic("surface/primary"));
      stroke(node, semantic(hovered ? "border/strong" : "border/default"));
      effect(node, hovered ? "Effects/Card Hover" : "Effects/Card");
      stage.appendChild(node);

      if (!selection) {
        const accent = auto("Outcome accent", "VERTICAL");
        accent.primaryAxisSizingMode = "FIXED";
        accent.counterAxisSizingMode = "FIXED";
        const accentHeight = height - padding * 2;
        accent.resize(5, accentHeight);
        accent.itemSpacing = 0;
        radius(accent, radiusToken("pill"));
        node.appendChild(accent);

        const verifiedPart = auto("Verified accent", "HORIZONTAL");
        verifiedPart.primaryAxisSizingMode = "FIXED";
        verifiedPart.counterAxisSizingMode = "FIXED";
        verifiedPart.resize(5, Math.ceil(accentHeight / 2));
        fill(verifiedPart, semantic("status/verified"));
        accent.appendChild(verifiedPart);

        const amberPart = auto("Amber accent", "HORIZONTAL");
        amberPart.primaryAxisSizingMode = "FIXED";
        amberPart.counterAxisSizingMode = "FIXED";
        amberPart.resize(5, Math.floor(accentHeight / 2));
        fill(amberPart, primitive("amber/500"));
        accent.appendChild(amberPart);
      }

      const body = auto("Card content", "VERTICAL");
      body.primaryAxisSizingMode = "FIXED";
      body.counterAxisSizingMode = "FIXED";
      const bodyWidth = width - padding * 2 - (selection ? 0 : 19);
      body.resize(bodyWidth, height - padding * 2);
      bind(body, "itemSpacing", spacing("md"));
      node.appendChild(body);

      const titleProperty = property(node, "Title", "TEXT", content.title);
      const title = await text(body, content.title, {
        name: "Title",
        styleName: "Typography/H3",
        width: bodyWidth,
        color: semantic("text/primary")
      });
      bindTextProperty(title, titleProperty);

      const descriptionProperty = property(node, "Description", "TEXT", content.description);
      const description = await text(body, content.description, {
        name: "Description",
        styleName: "Typography/Body",
        width: bodyWidth,
        color: semantic("text/muted")
      });
      bindTextProperty(description, descriptionProperty);

      const spacer = auto("Flexible spacer", "VERTICAL");
      spacer.primaryAxisSizingMode = "FIXED";
      spacer.counterAxisSizingMode = "FIXED";
      spacer.resize(bodyWidth, selection ? 8 : 1);
      body.appendChild(spacer);

      const action = primaryButton.createInstance();
      action.name = "Primary action";
      setInstanceText(action, "Label", content.action);
      action.visible = selection;
      body.appendChild(action);
      action.isExposedInstance = true;
      createdNodeIds.push(action.id);
      const showActionProperty = property(node, "Show action", "BOOLEAN", selection);
      bindVisibilityProperty(action, showActionProperty);

      node.description = selection
        ? "CTA-карточка подбора по комнатности. Не обещает наличие конкретной квартиры или фиксированную цену."
        : "Информационная карточка результата консультации с вертикальным акцентом и без собственного CTA.";
      variants.push(node);
    }
  }
}

const set = combine(variants, stage, "Content Card");
set.description = "Portal v2 Content Card · Layout × Purpose × State · Selection uses exposed Light Button; Outcome uses token-bound accent";

const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила использования", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Selection используется для выбора комнатности или другого понятного направления с одним Primary CTA Context=Light. Вложенный Button помечен как exposed instance, поэтому его Label можно менять без фиктивного свойства родительской карточки. Outcome кратко описывает результат консультации и не содержит отдельного действия. Компонент не публикует неподтверждённые цены, наличие, ставки или гарантии. Вертикальный акцент Outcome собран из status/verified и amber/500, а не из hardcoded градиента. Desktop повторяет production-сетки 384 и 284 px, Mobile — 336 px.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "17 Component · Content Card",
  componentKey: "content-card",
  title: "Content Card",
  description: "Переиспользуемая карточка выбора или результата консультации с безопасным контентом и управляемым CTA.",
  background: "background/soft"
}, body));