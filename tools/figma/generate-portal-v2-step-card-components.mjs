import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Step Card variants", "VERTICAL");
stage.itemSpacing = 24;
root.appendChild(stage);

const defaults = {
  Three: {
    step: "Шаг 1",
    title: "Уточняем задачу",
    description: "Какой объект интересует, когда планируется покупка и что нужно проверить в первую очередь."
  },
  Four: {
    step: "1",
    title: "Определить параметры",
    description: "Комнатность, бюджет, желаемый срок, способ покупки и требования к дому."
  }
};
const variants = [];

for (const layout of ["Desktop", "Mobile"]) {
  for (const grid of ["Three", "Four"]) {
    for (const state of ["Default", "Hover"]) {
      const desktop = layout === "Desktop";
      const three = grid === "Three";
      const hovered = state === "Hover";
      const width = desktop ? (three ? 384 : 284) : 336;
      const height = desktop ? (three ? 236 : 230) : 220;
      const padding = desktop ? 26 : 22;
      const content = defaults[grid];

      const node = component("Layout=" + layout + ", Grid=" + grid + ", State=" + state, "VERTICAL");
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

      const marker = auto("Step marker", "HORIZONTAL");
      marker.primaryAxisAlignItems = "CENTER";
      marker.counterAxisAlignItems = "CENTER";
      bind(marker, "paddingLeft", spacing("sm"));
      bind(marker, "paddingRight", spacing("sm"));
      bind(marker, "paddingTop", spacing("xs"));
      bind(marker, "paddingBottom", spacing("xs"));
      radius(marker, radiusToken("pill"));
      fill(marker, primitive("coral/100"));
      stroke(marker, semantic("action/primary"));
      node.appendChild(marker);

      const stepProperty = property(node, "Step label", "TEXT", content.step);
      const stepText = await text(marker, content.step, {
        name: "Step label",
        styleName: "Typography/Label",
        width: three ? 82 : 30,
        color: semantic("action/primary/hover")
      });
      bindTextProperty(stepText, stepProperty);
      const showStepProperty = property(node, "Show step label", "BOOLEAN", true);
      bindVisibilityProperty(marker, showStepProperty);

      const titleProperty = property(node, "Title", "TEXT", content.title);
      const title = await text(node, content.title, {
        name: "Title",
        styleName: "Typography/H3",
        width: width - padding * 2,
        color: semantic("text/primary")
      });
      bindTextProperty(title, titleProperty);

      const descriptionProperty = property(node, "Description", "TEXT", content.description);
      const description = await text(node, content.description, {
        name: "Description",
        styleName: "Typography/Body",
        width: width - padding * 2,
        color: semantic("text/muted")
      });
      bindTextProperty(description, descriptionProperty);

      node.description = three
        ? "Шаг консультации в сетке из трёх карточек. Не обещает бронь, цену или обязательный результат."
        : "Шаг безопасного сценария покупки в сетке из четырёх карточек. Не подменяет юридическую или банковскую проверку.";
      variants.push(node);
    }
  }
}

const set = combine(variants, stage, "Step Card");
set.description = "Portal v2 Step Card · Layout × Grid × State · token-bound marker and editable step content";

const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила использования", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Step Card используется для последовательных этапов консультации и покупки. Grid=Three повторяет production-сетку из трёх карточек шириной около 384 px, Grid=Four — сетку из четырёх карточек шириной около 284 px. Mobile использует ширину 336 px. Маркер шага, заголовок и описание редактируются через component properties. Компонент не содержит CTA, цены, наличия, ставки, гарантии одобрения или юридического результата.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "19 Component · Step Card",
  componentKey: "step-card",
  title: "Step Card",
  description: "Карточка последовательного шага консультации или покупки с явным маркером и безопасным объяснением.",
  background: "background/soft"
}, body));
