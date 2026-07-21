import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("Homepage Hero screens", "HORIZONTAL");
stage.itemSpacing = 64;
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
function appendInstance(parent, componentNode, name) {
  const instance = componentNode.createInstance();
  instance.name = name;
  parent.appendChild(instance);
  createdNodeIds.push(instance.id);
  return instance;
}
function configureButton(parent, componentNode, label, fillWidth = false) {
  const instance = appendInstance(parent, componentNode, label + " action");
  setInstanceText(instance, "Label", label);
  if (fillWidth) instance.layoutSizingHorizontal = "FILL";
  return instance;
}
function configureFact(parent, componentNode, value, label) {
  const instance = appendInstance(parent, componentNode, "Fact / " + value);
  setInstanceText(instance, "Value", value);
  setInstanceText(instance, "Label", label);
  return instance;
}

const navDesktop = localVariant("Top Navigation", ["Layout=Desktop", "Active=None"]);
const navMobile = localVariant("Top Navigation", ["Layout=Mobile", "Active=None"]);
const factDesktop = localVariant("Fact Card", ["Context=Hero", "Size=Desktop"]);
const factMobile = localVariant("Fact Card", ["Context=Hero", "Size=Mobile"]);
const leadDesktop = localVariant("Lead Form Card", ["Layout=Desktop", "Scope=Quick"]);
const leadMobile = localVariant("Lead Form Card", ["Layout=Mobile", "Scope=Quick"]);
const heroPrimary = localVariant("Button", ["Context=Hero", "Type=Primary", "State=Default"]);
const heroSecondary = localVariant("Button", ["Context=Hero", "Type=Secondary", "State=Default"]);
const lightPrimary = localVariant("Button", ["Context=Light", "Type=Primary", "State=Default"]);
const lightSecondary = localVariant("Button", ["Context=Light", "Type=Secondary", "State=Default"]);

for (const layout of ["Desktop", "Mobile"]) {
  const desktop = layout === "Desktop";
  const screenWidth = desktop ? 1440 : 360;
  const contentWidth = desktop ? 1200 : 336;
  const screen = auto("Homepage Hero / " + layout, "VERTICAL");
  screen.counterAxisSizingMode = "FIXED";
  screen.primaryAxisSizingMode = "AUTO";
  screen.resize(screenWidth, desktop ? 1320 : 2400);
  screen.clipsContent = true;
  fill(screen, semantic("surface/primary"));
  stroke(screen, semantic("border/default"));
  radius(screen, radiusToken("xl"));
  screen.setSharedPluginData("portal-v2", "screen-key", "homepage-hero-" + layout.toLowerCase());
  stage.appendChild(screen);

  const header = auto("Header", "HORIZONTAL");
  header.primaryAxisSizingMode = "FIXED";
  header.counterAxisSizingMode = "FIXED";
  header.primaryAxisAlignItems = "CENTER";
  header.counterAxisAlignItems = "CENTER";
  header.resize(screenWidth, desktop ? 84 : 132);
  fill(header, semantic("surface/primary"));
  screen.appendChild(header);
  const navigation = appendInstance(header, desktop ? navDesktop : navMobile, "Top Navigation / " + layout);
  setInstanceBoolean(navigation, "Show CTA", true);

  const hero = auto("Hero", "VERTICAL");
  hero.counterAxisSizingMode = "FIXED";
  hero.primaryAxisSizingMode = "AUTO";
  hero.counterAxisAlignItems = "CENTER";
  hero.resize(screenWidth, desktop ? 1120 : 2100);
  hero.paddingTop = desktop ? 72 : 42;
  hero.paddingBottom = desktop ? 82 : 54;
  bind(hero, "itemSpacing", spacing(desktop ? "xl" : "lg"));
  fill(hero, semantic("background/hero"));
  screen.appendChild(hero);

  const content = auto("Hero content", "VERTICAL");
  content.counterAxisSizingMode = "FIXED";
  content.primaryAxisSizingMode = "AUTO";
  content.resize(contentWidth, desktop ? 1000 : 1950);
  bind(content, "itemSpacing", spacing(desktop ? "xl" : "lg"));
  hero.appendChild(content);

  const main = auto("Hero main", desktop ? "HORIZONTAL" : "VERTICAL");
  main.counterAxisAlignItems = "MIN";
  main.counterAxisSizingMode = "FIXED";
  main.primaryAxisSizingMode = "AUTO";
  main.resize(contentWidth, desktop ? 800 : 1500);
  main.itemSpacing = desktop ? 44 : 32;
  content.appendChild(main);

  const pitch = auto("Hero pitch", "VERTICAL");
  pitch.counterAxisSizingMode = "FIXED";
  pitch.primaryAxisSizingMode = "AUTO";
  pitch.resize(desktop ? 718 : 336, desktop ? 620 : 600);
  bind(pitch, "itemSpacing", spacing("lg"));
  main.appendChild(pitch);

  const eyebrow = auto("Hero eyebrow", "HORIZONTAL");
  eyebrow.primaryAxisAlignItems = "CENTER";
  eyebrow.counterAxisAlignItems = "CENTER";
  bind(eyebrow, "paddingLeft", spacing("sm"));
  bind(eyebrow, "paddingRight", spacing("sm"));
  bind(eyebrow, "paddingTop", spacing("xs"));
  bind(eyebrow, "paddingBottom", spacing("xs"));
  radius(eyebrow, radiusToken("pill"));
  fill(eyebrow, semantic("surface/emphasis"));
  stroke(eyebrow, semantic("action/primary"));
  pitch.appendChild(eyebrow);
  await text(eyebrow, "Городской каталог новых домов", {
    name: "Eyebrow label",
    styleName: "Typography/Label",
    width: 250,
    color: primitive("coral/100")
  });

  await text(pitch, "Новостройки Борисоглебска", {
    name: "Hero title",
    styleName: desktop ? "Typography/Display" : "Typography/H1",
    width: desktop ? 718 : 336,
    color: semantic("text/inverse")
  });
  const lead = await text(pitch, "Ищете квартиру в новом доме Борисоглебска? Выберите конкретный дом, получите общий подбор или предварительный расчёт покупки. Доступен подбор 1-, 2- и 3-комнатных квартир. Специалист проверит доступные документы и актуальные условия на дату обращения — без обещаний неподтверждённых цен и наличия.", {
    name: "Hero lead",
    styleName: "Typography/Body Large",
    width: desktop ? 718 : 336,
    color: semantic("text/inverse")
  });
  lead.opacity = 0.78;

  const actions = auto("Hero actions", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(actions, "itemSpacing", spacing("sm"));
  pitch.appendChild(actions);
  configureButton(actions, heroPrimary, "Выбрать сценарий", !desktop);
  configureButton(actions, heroSecondary, "Смотреть каталог", !desktop);
  if (desktop) configureButton(actions, heroSecondary, "8 903 857-69-09");

  const leadCard = appendInstance(main, desktop ? leadDesktop : leadMobile, "Lead Form Card / Quick / " + layout);
  setInstanceText(leadCard, "Eyebrow", "Заявка за 30 секунд");
  setInstanceBoolean(leadCard, "Show eyebrow", true);
  setInstanceText(leadCard, "Title", "Узнать, какие варианты вам подойдут");
  setInstanceText(leadCard, "Description", "Оставьте телефон и выберите объект. Специалист уточнит задачу, расскажет о проверенных данных и поможет определить следующий шаг.");
  setInstanceText(leadCard, "Consent text", "Согласен на обработку персональных данных для ответа на обращение. Заявка не является бронью и не фиксирует цену.");
  setInstanceText(leadCard, "Hint", "Заявка не является бронью и не фиксирует цену.");
  setInstanceBoolean(leadCard, "Show hint", true);
  setInstanceText(leadCard, "Footer note", "Удобнее сразу обсудить? Позвонить специалисту");
  setInstanceBoolean(leadCard, "Show footer note", true);

  const facts = auto("Hero facts", desktop ? "HORIZONTAL" : "VERTICAL");
  bind(facts, "itemSpacing", spacing("sm"));
  content.appendChild(facts);
  const factVariant = desktop ? factDesktop : factMobile;
  configureFact(facts, factVariant, "3", "приоритетных объекта");
  configureFact(facts, factVariant, "1 каталог", "новостроек города");
  configureFact(facts, factVariant, "ипотека", "и другие способы покупки");
  configureFact(facts, factVariant, "без брони", "консультация без фиксации цены");

  const notice = auto("Independent portal notice", "HORIZONTAL");
  notice.counterAxisAlignItems = "CENTER";
  notice.counterAxisSizingMode = "FIXED";
  notice.primaryAxisSizingMode = "AUTO";
  notice.resize(desktop ? 880 : 336, desktop ? 76 : 118);
  bind(notice, "paddingLeft", spacing("md"));
  bind(notice, "paddingRight", spacing("md"));
  bind(notice, "paddingTop", spacing("md"));
  bind(notice, "paddingBottom", spacing("md"));
  bind(notice, "itemSpacing", spacing("sm"));
  radius(notice, radiusToken("md"));
  fill(notice, semantic("surface/emphasis"));
  stroke(notice, semantic("border/strong"));
  content.appendChild(notice);

  const accent = auto("Notice accent", "HORIZONTAL");
  accent.primaryAxisSizingMode = "FIXED";
  accent.counterAxisSizingMode = "FIXED";
  accent.resize(5, desktop ? 44 : 82);
  radius(accent, radiusToken("pill"));
  fill(accent, semantic("focus/ring"));
  notice.appendChild(accent);
  const noticeText = await text(notice, "Портал не является официальным сайтом застройщика. Цена, наличие квартир и условия покупки уточняются перед консультацией.", {
    name: "Notice text",
    styleName: "Typography/Body",
    width: desktop ? 815 : 279,
    color: semantic("text/inverse")
  });
  noticeText.opacity = 0.75;

  if (!desktop) {
    const mobileBar = auto("Mobile sticky action bar", "HORIZONTAL");
    mobileBar.primaryAxisSizingMode = "FIXED";
    mobileBar.counterAxisSizingMode = "FIXED";
    mobileBar.resize(360, 76);
    mobileBar.paddingLeft = 12;
    mobileBar.paddingRight = 12;
    mobileBar.paddingTop = 12;
    mobileBar.paddingBottom = 12;
    mobileBar.itemSpacing = 12;
    fill(mobileBar, semantic("surface/primary"));
    stroke(mobileBar, semantic("border/default"));
    effect(mobileBar, "Effects/Header");
    screen.appendChild(mobileBar);
    configureButton(mobileBar, lightSecondary, "Позвонить", true);
    configureButton(mobileBar, lightPrimary, "Оставить заявку", true);
  }
}

const notes = auto("Screen notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Состав экрана", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Экран собирается из локальных Top Navigation, Button, Fact Card и Lead Form Card instances. Desktop повторяет контейнер 1200 px и двухколоночный hero. Mobile использует ширину 360 px, вертикальный поток, настоящие Mobile-варианты и нижний action bar. Внешних изображений нет; CSS-декор не подменяется случайным рендером. Юридическое notice и согласие сохраняют независимое позиционирование портала и прямо сообщают, что заявка не является бронью и не фиксирует цену.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "14 Screen · Homepage Hero",
  componentKey: "homepage-hero-screen",
  title: "Homepage Hero",
  description: "Первый экран главной страницы портала в Desktop и Mobile, собранный из локальных компонентов Design System v2.",
  background: "background/soft"
}, body));