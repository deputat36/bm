import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Project Card variants", "VERTICAL");
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
function setInstanceBoolean(instance, prefix, value) {
  instance.setProperties({ [nestedPropertyKey(instance, prefix)]: value });
}
async function factRow(parent, owner, index, value, width) {
  const row = auto("Fact " + index, "HORIZONTAL");
  row.counterAxisAlignItems = "MIN";
  bind(row, "itemSpacing", spacing("sm"));
  parent.appendChild(row);

  const dot = auto("Fact marker", "HORIZONTAL");
  dot.primaryAxisSizingMode = "FIXED";
  dot.counterAxisSizingMode = "FIXED";
  dot.resize(9, 9);
  fill(dot, semantic("status/verified"));
  radius(dot, radiusToken("pill"));
  row.appendChild(dot);

  const factProperty = property(owner, "Fact " + index, "TEXT", value);
  const fact = await text(row, value, {
    name: "Fact " + index + " text",
    styleName: "Typography/Body",
    width,
    color: semantic("text/body")
  });
  bindTextProperty(fact, factProperty);
}

const verifiedStatus = localVariant("Verification Status", ["Tone=Verified", "Layout=Compact"]);
const pendingStatus = localVariant("Verification Status", ["Tone=Pending", "Layout=Compact"]);
const primaryButton = localVariant("Button", ["Context=Light", "Type=Primary", "State=Default"]);
const secondaryButton = localVariant("Button", ["Context=Light", "Type=Secondary", "State=Default"]);
const variants = [];

for (const layout of ["Desktop", "Mobile"]) {
  for (const verification of ["Verified", "Pending"]) {
    for (const state of ["Default", "Hover"]) {
      const desktop = layout === "Desktop";
      const verified = verification === "Verified";
      const hovered = state === "Hover";
      const node = component("Layout=" + layout + ", Verification=" + verification + ", State=" + state, "VERTICAL");
      node.counterAxisSizingMode = "FIXED";
      node.resize(desktop ? 384 : 336, 520);
      node.primaryAxisSizingMode = "AUTO";
      node.paddingLeft = desktop ? 26 : 22;
      node.paddingRight = desktop ? 26 : 22;
      node.paddingTop = desktop ? 26 : 22;
      node.paddingBottom = desktop ? 26 : 22;
      bind(node, "itemSpacing", spacing("md"));
      node.topLeftRadius = desktop ? 22 : 18;
      node.topRightRadius = desktop ? 22 : 18;
      node.bottomLeftRadius = desktop ? 22 : 18;
      node.bottomRightRadius = desktop ? 22 : 18;
      fill(node, semantic("surface/primary"));
      stroke(node, semantic(hovered ? "border/strong" : "border/default"));
      effect(node, hovered ? "Effects/Card Hover" : "Effects/Card");
      stage.appendChild(node);

      const status = (verified ? verifiedStatus : pendingStatus).createInstance();
      status.name = "Verification status";
      setInstanceText(status, "Title", verified ? "Сведения подтверждены" : "Данные уточняются");
      setInstanceBoolean(status, "Show detail", false);
      node.appendChild(status);
      createdNodeIds.push(status.id);

      const titleValue = verified ? "ЖК «Теллерманов сад»" : "Просторная 4А";
      const titleProperty = property(node, "Project title", "TEXT", titleValue);
      const title = await text(node, titleValue, {
        name: "Project title",
        styleName: "Typography/H3",
        width: desktop ? 332 : 292,
        color: semantic("text/primary")
      });
      bindTextProperty(title, titleProperty);

      const descriptionValue = verified
        ? "Карточка объединяет подтверждённые сведения, полезный контекст и безопасный следующий шаг."
        : "Специалист проверит актуальность сведений об объекте и сообщит, что подтверждено на дату обращения.";
      const descriptionProperty = property(node, "Description", "TEXT", descriptionValue);
      const description = await text(node, descriptionValue, {
        name: "Description",
        styleName: "Typography/Body",
        width: desktop ? 332 : 292,
        color: semantic("text/muted")
      });
      bindTextProperty(description, descriptionProperty);

      const facts = auto("Project facts", "VERTICAL");
      bind(facts, "itemSpacing", spacing("xs"));
      node.appendChild(facts);
      await factRow(facts, node, 1, verified ? "Проверенные источники и статус." : "Источники и характеристики уточняются.", desktop ? 308 : 268);
      await factRow(facts, node, 2, verified ? "Планировки и способы покупки." : "Неподтверждённые цены не публикуются.", desktop ? 308 : 268);
      await factRow(facts, node, 3, verified ? "Консультация без бронирования." : "Специалист сообщит актуальный статус.", desktop ? 308 : 268);

      const actions = auto("Actions", desktop ? "HORIZONTAL" : "VERTICAL");
      bind(actions, "itemSpacing", spacing("sm"));
      node.appendChild(actions);

      const primary = primaryButton.createInstance();
      primary.name = "Primary action";
      setInstanceText(primary, "Label", verified ? "Открыть карточку" : "Оставить заявку");
      actions.appendChild(primary);
      createdNodeIds.push(primary.id);

      const secondary = secondaryButton.createInstance();
      secondary.name = "Secondary action";
      setInstanceText(secondary, "Label", "Подробнее");
      actions.appendChild(secondary);
      createdNodeIds.push(secondary.id);
      const showSecondary = property(node, "Show secondary action", "BOOLEAN", true);
      bindVisibilityProperty(secondary, showSecondary);

      node.description = verified
        ? "Карточка объекта с подтверждённым статусом. Verified не заменяет повторную проверку перед консультацией."
        : "Карточка объекта на проверке. CTA предлагает оставить обращение, но не обещает цену, наличие, бронь или сроки.";
      variants.push(node);
    }
  }
}

const set = combine(variants, stage, "Project Card");
set.description = "Portal v2 Project Card · Layout × Verification × State · built from Verification Status and Light Button instances";

const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила использования", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Карточка сообщает статус проверки до описания объекта. Verified применяется только после сверки с первичным или официально предоставленным источником. Pending объясняет, что уточняется, и не создаёт ложной срочности. Изображение не является обязательной частью компонента до появления единого production-контракта для медиаматериалов. Основной CTA Pending — «Оставить заявку»: это обращение за консультацией, а не бронь, фиксация цены или подтверждение наличия. Вложенные кнопки всегда используют Context=Light.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "11 Component · Project Card",
  componentKey: "project-card",
  title: "Project Card",
  description: "Карточка жилого объекта с явным статусом проверки, полезным контекстом и безопасным следующим шагом.",
  background: "background/soft"
}, body));
