import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Fact Card variants", "VERTICAL");
stage.itemSpacing = 24;
root.appendChild(stage);

const variants = [];
for (const context of ["Light", "Hero"]) {
  for (const size of ["Desktop", "Mobile"]) {
    const desktop = size === "Desktop";
    const hero = context === "Hero";
    const node = component("Context=" + context + ", Size=" + size, "VERTICAL");
    node.counterAxisSizingMode = "FIXED";
    node.resize(desktop ? 278 : 336, desktop ? 124 : 104);
    node.primaryAxisSizingMode = "AUTO";
    bind(node, "paddingLeft", spacing(desktop ? "lg" : "md"));
    bind(node, "paddingRight", spacing(desktop ? "lg" : "md"));
    bind(node, "paddingTop", spacing(desktop ? "lg" : "md"));
    bind(node, "paddingBottom", spacing(desktop ? "lg" : "md"));
    bind(node, "itemSpacing", spacing("xs"));
    radius(node, radiusToken(desktop ? "xl" : "lg"));
    fill(node, semantic(hero ? "surface/emphasis" : "surface/primary"));
    stroke(node, semantic(hero ? "border/strong" : "border/default"));
    if (!hero) effect(node, "Effects/Card");
    stage.appendChild(node);

    const defaultValue = hero ? "без брони" : "3";
    const valueProperty = property(node, "Value", "TEXT", defaultValue);
    const value = await text(node, defaultValue, {
      name: "Value",
      font: black,
      size: desktop ? 40 : 28,
      lineHeight: { unit: "PERCENT", value: 100 },
      width: desktop ? 230 : 304,
      color: hero ? primitive("coral/100") : semantic("action/primary")
    });
    value.letterSpacing = { unit: "PERCENT", value: -3.5 };
    bindTextProperty(value, valueProperty);

    const defaultLabel = hero ? "консультация без фиксации цены" : "приоритетных объекта";
    const labelProperty = property(node, "Label", "TEXT", defaultLabel);
    const label = await text(node, defaultLabel, {
      name: "Label",
      font: bold,
      size: 14,
      lineHeight: { unit: "PERCENT", value: 135 },
      width: desktop ? 230 : 304,
      color: semantic(hero ? "text/inverse" : "text/body")
    });
    bindTextProperty(label, labelProperty);

    node.description = hero
      ? "Fact Card для тёмного hero. Использует контрастный фон без карточной тени."
      : "Fact Card для светлых секций и живой витрины дизайн-системы.";
    variants.push(node);
  }
}

const set = combine(variants, stage, "Fact Card");
set.description = "Portal v2 Fact Card · Context × Size · short verified metric or neutral orientation";

const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила использования", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Fact Card показывает одну короткую цифру, категорию или нейтральный ориентир. Компонент не подтверждает актуальную цену, наличие квартиры, срок строительства, ставку или одобрение банка. Для статуса источника используется Verification Status. Значение должно оставаться коротким, а пояснение — помещаться максимум в две строки. Hero применяется только на тёмной поверхности, Light — на светлых секциях.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "12 Component · Fact Card",
  componentKey: "fact-card",
  title: "Fact Card",
  description: "Короткий показатель или ориентир без рекламного преувеличения и без подмены статуса проверки.",
  background: "background/soft"
}, body));
