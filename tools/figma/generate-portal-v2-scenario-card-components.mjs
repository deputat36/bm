import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Scenario Card variants", "VERTICAL");
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
const intentContent = {
  Object: {
    title: "Интересует конкретный дом",
    description: "Перейдите к объектам, выберите адрес и запросите документы, статус или условия покупки.",
    action: "Выбрать дом"
  },
  Selection: {
    title: "Нужен подбор новостройки",
    description: "Ответьте на пять вопросов, получите предварительный следующий шаг и только потом решите, оставлять ли контакты.",
    action: "Пройти подбор"
  },
  Mortgage: {
    title: "Нужно рассчитать покупку",
    description: "Перейдите к предварительному расчёту ипотеки, взноса, платежа и доступных источников средств.",
    action: "Рассчитать покупку"
  }
};
const intents = ["Object", "Selection", "Mortgage"];
const variants = [];

for (const layout of ["Desktop", "Mobile"]) {
  for (const intent of intents) {
    for (const state of ["Default", "Hover"]) {
      const desktop = layout === "Desktop";
      const hovered = state === "Hover";
      const content = intentContent[intent];
      const node = component("Layout=" + layout + ", Intent=" + intent + ", State=" + state, "VERTICAL");
      node.counterAxisSizingMode = "FIXED";
      node.primaryAxisSizingMode = "AUTO";
      node.resize(desktop ? 384 : 336, desktop ? 292 : 280);
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

      const titleProperty = property(node, "Title", "TEXT", content.title);
      const title = await text(node, content.title, {
        name: "Title",
        styleName: "Typography/H3",
        width: desktop ? 332 : 292,
        color: semantic("text/primary")
      });
      bindTextProperty(title, titleProperty);

      const descriptionProperty = property(node, "Description", "TEXT", content.description);
      const description = await text(node, content.description, {
        name: "Description",
        styleName: "Typography/Body",
        width: desktop ? 332 : 292,
        color: semantic("text/muted")
      });
      bindTextProperty(description, descriptionProperty);

      const spacer = auto("Flexible spacer", "VERTICAL");
      spacer.primaryAxisSizingMode = "FIXED";
      spacer.counterAxisSizingMode = "FIXED";
      spacer.resize(desktop ? 332 : 292, 8);
      node.appendChild(spacer);

      const action = primaryButton.createInstance();
      action.name = "Primary action";
      setInstanceText(action, "Label", content.action);
      node.appendChild(action);
      createdNodeIds.push(action.id);
      const showActionProperty = property(node, "Show action", "BOOLEAN", true);
      bindVisibilityProperty(action, showActionProperty);

      node.description = intent === "Object"
        ? "Сценарий перехода к выбору конкретного объекта. Не подменяет карточку объекта."
        : intent === "Selection"
          ? "Сценарий общего подбора без требования сразу оставить контакты."
          : "Сценарий предварительного расчёта без обещания ставки или одобрения банка.";
      variants.push(node);
    }
  }
}

const set = combine(variants, stage, "Scenario Card");
set.description = "Portal v2 Scenario Card · Layout × Intent × State · built from Light Button instance";

const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила использования", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Scenario Card помогает выбрать следующий маршрут: конкретный дом, общий подбор или предварительный расчёт покупки. В карточке используется один Primary CTA Context=Light. Компонент не содержит цену, наличие, срок строительства, ставку или статус проверки объекта. Для этих задач используются Project Card, Verification Status и профильные страницы. Desktop повторяет production-карточку шириной около 384 px, Mobile — 336 px.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "15 Component · Scenario Card",
  componentKey: "scenario-card",
  title: "Scenario Card",
  description: "Карточка выбора следующего шага без перегрузки фактами объекта и без рекламных обещаний.",
  background: "background/soft"
}, body));
