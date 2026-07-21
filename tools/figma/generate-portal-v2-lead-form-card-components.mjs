import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Lead Form Card variants", "VERTICAL");
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
function formField(size, control) {
  return localVariant("Form Field", ["Size=" + size, "Control=" + control, "State=Default"]);
}
async function addField(parent, size, control, label, value) {
  const field = formField(size, control).createInstance();
  field.name = label + " field";
  setInstanceText(field, "Label", label);
  setInstanceText(field, "Value", value);
  setInstanceBoolean(field, "Show helper", false);
  parent.appendChild(field);
  createdNodeIds.push(field.id);
  return field;
}

const primaryButton = localVariant("Button", ["Type=Primary", "State=Default"]);
const variants = [];

for (const layout of ["Desktop", "Mobile"]) {
  for (const scope of ["Quick", "Detailed"]) {
    const desktop = layout === "Desktop";
    const quick = scope === "Quick";
    const width = desktop ? (quick ? 438 : 576) : 336;
    const padding = desktop ? (quick ? 30 : 28) : 22;
    const innerWidth = width - padding * 2;
    const fieldSize = desktop ? (quick ? "Compact" : "Wide") : "Mobile";

    const node = component("Layout=" + layout + ", Scope=" + scope, "VERTICAL");
    node.counterAxisSizingMode = "FIXED";
    node.primaryAxisSizingMode = "AUTO";
    node.resize(width, quick ? 760 : 1380);
    node.paddingLeft = padding;
    node.paddingRight = padding;
    node.paddingTop = padding;
    node.paddingBottom = padding;
    bind(node, "itemSpacing", spacing("md"));
    node.topLeftRadius = desktop ? (quick ? 28 : 24) : 22;
    node.topRightRadius = desktop ? (quick ? 28 : 24) : 22;
    node.bottomLeftRadius = desktop ? (quick ? 28 : 24) : 22;
    node.bottomRightRadius = desktop ? (quick ? 28 : 24) : 22;
    fill(node, semantic("surface/primary"));
    stroke(node, semantic("border/default"));
    effect(node, quick ? "Effects/Floating" : "Effects/Card");
    stage.appendChild(node);

    const badge = auto("Lead type tag", "HORIZONTAL");
    badge.primaryAxisAlignItems = "CENTER";
    badge.counterAxisAlignItems = "CENTER";
    bind(badge, "paddingLeft", spacing("sm"));
    bind(badge, "paddingRight", spacing("sm"));
    bind(badge, "paddingTop", spacing("xs"));
    bind(badge, "paddingBottom", spacing("xs"));
    radius(badge, radiusToken("pill"));
    fill(badge, primitive("coral/100"));
    node.appendChild(badge);
    const badgeValue = quick ? "Заявка за 30 секунд" : "Подробная заявка";
    const badgeProperty = property(node, "Eyebrow", "TEXT", badgeValue);
    const showBadgeProperty = property(node, "Show eyebrow", "BOOLEAN", true);
    const badgeText = await text(badge, badgeValue, {
      name: "Eyebrow",
      font: bold,
      size: 11,
      width: quick ? 160 : 145,
      color: semantic("action/primary/hover")
    });
    bindTextProperty(badgeText, badgeProperty);
    bindVisibilityProperty(badge, showBadgeProperty);

    const titleValue = quick ? "Узнать, какие варианты вам подойдут" : "Расскажите, что важно при покупке";
    const titleProperty = property(node, "Title", "TEXT", titleValue);
    const title = await text(node, titleValue, {
      name: "Title",
      styleName: "Typography/H2",
      width: innerWidth,
      color: semantic("text/primary")
    });
    bindTextProperty(title, titleProperty);

    const descriptionValue = quick
      ? "Оставьте телефон и выберите объект. Специалист проверит сведения и поможет определить следующий шаг."
      : "Укажите известные параметры, чтобы специалист подготовился к разговору и проверил подходящие сценарии покупки.";
    const descriptionProperty = property(node, "Description", "TEXT", descriptionValue);
    const description = await text(node, descriptionValue, {
      name: "Description",
      styleName: "Typography/Body",
      width: innerWidth,
      color: semantic("text/muted")
    });
    bindTextProperty(description, descriptionProperty);

    const fields = auto("Form fields", "VERTICAL");
    bind(fields, "itemSpacing", spacing("sm"));
    node.appendChild(fields);
    await addField(fields, fieldSize, "Input", "Имя", "Как к вам обращаться");
    await addField(fields, fieldSize, "Input", "Телефон", "+7 ___ ___-__-__");
    await addField(fields, fieldSize, "Select", "Интересующий объект", "Выберите объект");
    if (!quick) {
      await addField(fields, fieldSize, "Select", "Комнатность", "Выберите вариант");
      await addField(fields, fieldSize, "Input", "Бюджет", "Например: до 5 млн ₽");
      await addField(fields, fieldSize, "Select", "Способ покупки", "Пока не определился");
      await addField(fields, fieldSize, "Select", "Срок покупки", "Пока не знаю");
      await addField(fields, fieldSize, "Textarea", "Комментарий", "Что важно учесть");
    }

    const consent = auto("Required consent", "HORIZONTAL");
    consent.counterAxisAlignItems = "MIN";
    bind(consent, "itemSpacing", spacing("sm"));
    node.appendChild(consent);
    const checkbox = auto("Checkbox", "HORIZONTAL");
    checkbox.primaryAxisSizingMode = "FIXED";
    checkbox.counterAxisSizingMode = "FIXED";
    checkbox.resize(20, 20);
    checkbox.cornerRadius = 4;
    fill(checkbox, semantic("surface/primary"));
    stroke(checkbox, semantic("border/strong"));
    consent.appendChild(checkbox);
    const consentValue = "Согласен на обработку персональных данных для ответа на обращение. Заявка не является бронью и не фиксирует цену.";
    const consentProperty = property(node, "Consent text", "TEXT", consentValue);
    const consentText = await text(consent, consentValue, {
      name: "Consent text",
      size: 12,
      width: innerWidth - 32,
      color: semantic("text/muted")
    });
    bindTextProperty(consentText, consentProperty);

    const submit = primaryButton.createInstance();
    submit.name = "Submit action";
    const submitValue = quick ? "Получить консультацию" : "Получить подробную консультацию";
    setInstanceText(submit, "Label", submitValue);
    node.appendChild(submit);
    submit.layoutSizingHorizontal = "FILL";
    createdNodeIds.push(submit.id);
    const submitProperty = property(node, "Submit label", "TEXT", submitValue);
    const submitKey = nestedPropertyKey(submit, "Label");
    submit.componentProperties[submitKey];
    node.setSharedPluginData("portal-v2", "submit-label-property", submitProperty);

    const hintValue = "Заявка не является бронью и не фиксирует цену.";
    const hintProperty = property(node, "Hint", "TEXT", hintValue);
    const showHintProperty = property(node, "Show hint", "BOOLEAN", quick);
    const hint = await text(node, hintValue, {
      name: "Hint",
      size: 13,
      width: innerWidth,
      color: semantic("text/muted")
    });
    hint.textAlignHorizontal = "CENTER";
    hint.visible = quick;
    bindTextProperty(hint, hintProperty);
    bindVisibilityProperty(hint, showHintProperty);

    const footerValue = "Удобнее сразу обсудить? Позвонить специалисту";
    const footerProperty = property(node, "Footer note", "TEXT", footerValue);
    const showFooterProperty = property(node, "Show footer note", "BOOLEAN", quick);
    const footer = await text(node, footerValue, {
      name: "Footer note",
      size: 14,
      width: innerWidth,
      color: semantic("text/muted")
    });
    footer.textAlignHorizontal = "CENTER";
    footer.visible = quick;
    bindTextProperty(footer, footerProperty);
    bindVisibilityProperty(footer, showFooterProperty);

    node.description = quick
      ? "Короткая форма первого шага: имя, телефон и объект. Согласие обязательно; заявка не является бронью."
      : "Подробная форма после осознанного выбора сценария: восемь полей, согласие и один основной CTA.";
    variants.push(node);
  }
}

const set = combine(variants, stage, "Lead Form Card");
set.description = "Portal v2 Lead Form Card · Layout × Scope · built from responsive Form Field and Button instances";

const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила использования", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Quick используется в hero и карточках объекта: только имя, телефон и выбор объекта. Detailed применяется после того, как пользователь готов указать параметры покупки. Согласие на обработку данных обязательно в обоих вариантах и располагается перед CTA. Форма не обещает цену, наличие, бронь, одобрение ипотеки или юридический результат. На мобильной ширине используются настоящие Form Field Size=Mobile, а не масштабированные desktop-поля.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "13 Component · Lead Form Card",
  componentKey: "lead-form-card",
  title: "Lead Form Card",
  description: "Короткая и подробная форма обращения с обязательным согласием, адаптивными полями и одним безопасным следующим шагом.",
  background: "background/soft"
}, body));