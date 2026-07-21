import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Verification status variants", "VERTICAL");
stage.itemSpacing = 24;
root.appendChild(stage);
const variants = [];
for (const tone of ["Verified", "Pending"]) {
  for (const layout of ["Compact", "Card"]) {
    const node = component("Tone=" + tone + ", Layout=" + layout, layout === "Compact" ? "HORIZONTAL" : "VERTICAL");
    node.itemSpacing = 12;
    node.primaryAxisAlignItems = layout === "Compact" ? "CENTER" : "MIN";
    node.counterAxisAlignItems = "MIN";
    bind(node, "paddingLeft", spacing(layout === "Compact" ? "md" : "lg"));
    bind(node, "paddingRight", spacing(layout === "Compact" ? "md" : "lg"));
    bind(node, "paddingTop", spacing(layout === "Compact" ? "sm" : "lg"));
    bind(node, "paddingBottom", spacing(layout === "Compact" ? "sm" : "lg"));
    radius(node, radiusToken(layout === "Compact" ? "pill" : "lg"));
    const verified = tone === "Verified";
    fill(node, primitive(verified ? "sage/100" : "amber/100"));
    stroke(node, semantic(verified ? "status/verified" : "status/pending"));
    stage.appendChild(node);
    const header = auto("Status header", "HORIZONTAL");
    header.itemSpacing = 10;
    header.counterAxisAlignItems = "CENTER";
    node.appendChild(header);
    const icon = auto("Status icon", "HORIZONTAL");
    icon.primaryAxisAlignItems = "CENTER";
    icon.counterAxisAlignItems = "CENTER";
    icon.paddingTop = 5;
    icon.paddingRight = 8;
    icon.paddingBottom = 5;
    icon.paddingLeft = 8;
    fill(icon, semantic(verified ? "status/verified" : "status/pending"));
    radius(icon, radiusToken("pill"));
    header.appendChild(icon);
    await text(icon, verified ? "✓" : "!", {
      name: "Icon glyph",
      font: bold,
      size: 14,
      width: 14,
      color: semantic("text/inverse")
    });
    const defaultTitle = verified ? "Сведения подтверждены" : "Сведения проверяются";
    const titleProperty = property(node, "Title", "TEXT", defaultTitle);
    const title = await text(header, defaultTitle, {
      name: "Title",
      styleName: "Typography/Label",
      width: layout === "Compact" ? 210 : 440,
      color: semantic(verified ? "status/verified" : "status/pending")
    });
    bindTextProperty(title, titleProperty);
    const defaultDetail = verified
      ? "Информация сверена с доступным первичным источником."
      : "Уточним актуальность цены, наличия и условий на дату обращения.";
    const detailProperty = property(node, "Detail", "TEXT", defaultDetail);
    const detailVisible = property(node, "Show detail", "BOOLEAN", layout === "Card");
    const detail = await text(node, defaultDetail, {
      name: "Detail",
      styleName: "Typography/Body",
      width: 480,
      color: semantic("text/body")
    });
    detail.visible = layout === "Card";
    bindTextProperty(detail, detailProperty);
    bindVisibilityProperty(detail, detailVisible);
    node.description = verified
      ? "Использовать только после сверки с первичным или официально предоставленным источником."
      : "Использовать для цены, наличия, сроков и условий, которые требуют повторной проверки.";
    variants.push(node);
  }
}
const set = combine(variants, stage, "Verification Status");
set.description = "Portal v2 Verification Status · Tone × Layout";
const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Юридически безопасное использование", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Verified не является гарантией сделки и не заменяет повторную проверку перед публикацией или консультацией. Pending должен объяснять, что именно будет уточнено, а не создавать искусственную срочность.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "06 Component · Verification Status",
  componentKey: "verification-status",
  title: "Verification Status",
  description: "Визуально различает подтверждённые сведения и данные, которые необходимо уточнить на дату обращения.",
  background: "background/soft"
}, body));
