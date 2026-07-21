import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Form field variants", "VERTICAL");
stage.itemSpacing = 24;
root.appendChild(stage);
const variants = [];
const fieldWidths = { Wide: 520, Compact: 378, Mobile: 292 };
for (const size of ["Wide", "Compact", "Mobile"]) {
  for (const controlType of ["Input", "Select", "Textarea"]) {
    for (const state of ["Default", "Focus", "Disabled"]) {
      const fieldWidth = fieldWidths[size];
      const node = component("Size=" + size + ", Control=" + controlType + ", State=" + state, "VERTICAL");
      node.itemSpacing = 8;
      node.counterAxisSizingMode = "FIXED";
      node.resize(fieldWidth, controlType === "Textarea" ? 180 : 136);
      stage.appendChild(node);

      const labelProperty = property(node, "Label", "TEXT", "Ваш телефон");
      const label = await text(node, "Ваш телефон", {
        name: "Field label",
        styleName: "Typography/Label",
        width: fieldWidth,
        color: semantic("text/primary")
      });
      bindTextProperty(label, labelProperty);

      const control = auto("Control", "HORIZONTAL");
      control.primaryAxisSizingMode = "FIXED";
      control.counterAxisSizingMode = "AUTO";
      control.resize(fieldWidth, controlType === "Textarea" ? 104 : 52);
      control.primaryAxisAlignItems = "MIN";
      control.counterAxisAlignItems = controlType === "Textarea" ? "MIN" : "CENTER";
      bind(control, "paddingLeft", spacing("md"));
      bind(control, "paddingRight", spacing("md"));
      bind(control, "paddingTop", spacing(controlType === "Textarea" ? "lg" : "md"));
      bind(control, "paddingBottom", spacing(controlType === "Textarea" ? "lg" : "md"));
      bind(control, "itemSpacing", spacing("sm"));
      radius(control, radiusToken("md"));
      fill(control, semantic(state === "Disabled" ? "background/soft" : "surface/primary"));
      stroke(control, semantic(state === "Focus" ? "focus/ring" : "border/default"), state === "Focus" ? 2 : 1);
      if (state === "Focus") effect(control, "Effects/Focus");
      if (state === "Disabled") control.opacity = 0.68;
      node.appendChild(control);
      control.layoutSizingHorizontal = "FILL";

      const defaultValue = controlType === "Select"
        ? "Выберите вариант"
        : controlType === "Textarea"
          ? "Напишите, что важно учесть при подборе"
          : "+7 (___) ___-__-__";
      const valueProperty = property(node, "Value", "TEXT", defaultValue);
      const value = await text(control, defaultValue, {
        name: "Value",
        styleName: "Typography/Body",
        width: controlType === "Select" ? fieldWidth - 90 : fieldWidth - 48,
        color: semantic("text/muted")
      });
      bindTextProperty(value, valueProperty);
      if (controlType === "Select") {
        value.layoutSizingHorizontal = "FILL";
        const chevron = await text(control, "⌄", {
          name: "Chevron",
          font: bold,
          size: 18,
          width: 20,
          color: semantic("text/primary")
        });
        chevron.textAlignHorizontal = "CENTER";
      }

      const helperDefault = state === "Disabled"
        ? "Поле временно недоступно"
        : "Используем данные только для ответа на обращение";
      const helperProperty = property(node, "Helper", "TEXT", helperDefault);
      const helperVisible = property(node, "Show helper", "BOOLEAN", true);
      const helper = await text(node, helperDefault, {
        name: "Helper",
        size: 13,
        width: fieldWidth,
        color: semantic("text/muted")
      });
      bindTextProperty(helper, helperProperty);
      bindVisibilityProperty(helper, helperVisible);
      node.description = "Form Field · " + size + " · " + controlType + " · " + state + ". Минимальная интерактивная высота 48 px, обязательный заметный focus state.";
      variants.push(node);
    }
  }
}
const set = combine(variants, stage, "Form Field");
set.description = "Portal v2 Form Field · Size × Control × State";
const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила формы", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Wide 520 px используется в подробных desktop-формах, Compact 378 px — в коротких desktop-карточках, Mobile 292 px — внутри карточки шириной 336 px. Label не заменяется placeholder. Focus должен быть заметен без изменения размера элемента. Disabled применяется только при понятной причине. Согласие на обработку данных остаётся отдельным обязательным элементом формы.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "07 Component · Form Field",
  componentKey: "form-field",
  title: "Form Field",
  description: "Input, Select и Textarea в трёх адаптивных размерах и состояниях Default, Focus и Disabled.",
  background: "background/soft"
}, body));