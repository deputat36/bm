export function buildComponentRuntime(config, body) {
  return `const CONFIG = ${JSON.stringify(config)};
const createdNodeIds = [];
const removedNodeIds = [];
const createdComponentIds = [];
const createdComponentSetIds = [];
if (figma.editorType !== "figma") throw new Error("Figma Design file required");
let page = figma.root.children.find((item) => item.name === CONFIG.pageName);
if (!page) {
  page = figma.createPage();
  page.name = CONFIG.pageName;
  createdNodeIds.push(page.id);
}
await figma.setCurrentPageAsync(page);
for (const node of [...page.children]) {
  if (node.getSharedPluginData("portal-v2", "component-key") === CONFIG.componentKey) {
    removedNodeIds.push(node.id);
    node.remove();
  }
}
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const textStyles = await figma.getLocalTextStylesAsync();
const effectStyles = await figma.getLocalEffectStylesAsync();
function variable(collectionName, name) {
  const collection = collections.find((item) => item.name === collectionName);
  if (!collection) throw new Error("Missing collection: " + collectionName);
  const result = variables.find((item) => item.variableCollectionId === collection.id && item.name === name);
  if (!result) throw new Error("Missing variable: " + collectionName + " / " + name);
  return result;
}
function semantic(name) { return variable("02 Semantic · Color", name); }
function primitive(name) { return variable("01 Primitives · Color", name); }
function spacing(name) { return variable("03 Dimensions · Spacing", name); }
function radiusToken(name) { return variable("04 Dimensions · Radius", name); }
function paint(value) {
  return figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 1, g: 1, b: 1 } },
    "color",
    value
  );
}
function fill(node, value) { node.fills = [paint(value)]; }
function stroke(node, value, weight = 1) {
  node.strokes = [paint(value)];
  node.strokeWeight = weight;
}
function bind(node, field, value) { node.setBoundVariable(field, value); }
function radius(node, value) {
  bind(node, "topLeftRadius", value);
  bind(node, "topRightRadius", value);
  bind(node, "bottomLeftRadius", value);
  bind(node, "bottomRightRadius", value);
}
function effect(node, styleName) {
  const style = effectStyles.find((item) => item.name === styleName);
  if (!style) throw new Error("Missing effect style: " + styleName);
  node.effectStyleId = style.id;
}
function auto(name, direction = "VERTICAL") {
  const node = figma.createAutoLayout(direction);
  node.name = name;
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "AUTO";
  node.clipsContent = false;
  createdNodeIds.push(node.id);
  return node;
}
function component(name, direction = "HORIZONTAL") {
  const node = figma.createComponent();
  node.name = name;
  node.layoutMode = direction;
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "AUTO";
  node.clipsContent = false;
  node.setSharedPluginData("portal-v2", "run-id", "portal-v2-components-v1");
  createdNodeIds.push(node.id);
  createdComponentIds.push(node.id);
  return node;
}
function combine(components, parent, name) {
  const set = figma.combineAsVariants(components, parent);
  set.name = name;
  set.layoutMode = "HORIZONTAL";
  set.layoutWrap = "WRAP";
  set.primaryAxisSizingMode = "AUTO";
  set.counterAxisSizingMode = "AUTO";
  set.itemSpacing = 24;
  set.counterAxisSpacing = 24;
  set.paddingTop = 24;
  set.paddingRight = 24;
  set.paddingBottom = 24;
  set.paddingLeft = 24;
  fill(set, semantic("background/page"));
  stroke(set, semantic("border/default"));
  radius(set, radiusToken("xl"));
  set.setSharedPluginData("portal-v2", "run-id", "portal-v2-components-v1");
  createdNodeIds.push(set.id);
  createdComponentSetIds.push(set.id);
  return set;
}
const availableFonts = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
function choose(styles) {
  for (const family of ["Segoe UI", "Arial", "Inter", "Roboto", "Noto Sans"]) {
    for (const style of styles) {
      const match = availableFonts.find((font) => font.family === family && font.style === style);
      if (match) return match;
    }
  }
  return availableFonts.find((font) => font.style === "Regular") || availableFonts[0];
}
const regular = choose(["Regular", "Normal"]);
const medium = choose(["Medium", "Regular"]);
const bold = choose(["Extra Bold", "Bold", "Semi Bold"]);
const black = choose(["Black", "Heavy", "Extra Bold", "Bold"]);
for (const font of [regular, medium, bold, black]) {
  if (!font) throw new Error("No compatible font available");
  await figma.loadFontAsync(font);
}
async function text(parent, value, options = {}) {
  const node = figma.createText();
  node.name = options.name || "Text";
  node.fontName = options.font || regular;
  node.characters = value;
  node.fontSize = options.size || 16;
  node.lineHeight = options.lineHeight || { unit: "PERCENT", value: 150 };
  node.textAutoResize = "HEIGHT";
  node.resize(options.width || 1000, 24);
  node.fills = [paint(options.color || semantic("text/primary"))];
  parent.appendChild(node);
  createdNodeIds.push(node.id);
  if (options.styleName) {
    const style = textStyles.find((item) => item.name === options.styleName);
    if (!style) throw new Error("Missing text style: " + options.styleName);
    if (style.fontName && style.fontName !== figma.mixed) await figma.loadFontAsync(style.fontName);
    node.textStyleId = style.id;
  }
  return node;
}
function property(componentNode, name, type, defaultValue) {
  return componentNode.addComponentProperty(name, type, defaultValue);
}
function bindTextProperty(textNode, propertyName) {
  textNode.componentPropertyReferences = { characters: propertyName };
}
function bindVisibilityProperty(node, propertyName) {
  node.componentPropertyReferences = { visible: propertyName };
}
const root = auto("Portal v2 / " + CONFIG.pageName, "VERTICAL");
root.setSharedPluginData("portal-v2", "component-key", CONFIG.componentKey);
root.setSharedPluginData("portal-v2", "run-id", "portal-v2-components-v1");
root.resize(1440, 900);
root.paddingTop = 96;
root.paddingRight = 96;
root.paddingBottom = 96;
root.paddingLeft = 96;
root.itemSpacing = 40;
fill(root, semantic(CONFIG.background || "background/soft"));
page.appendChild(root);
root.x = 0;
root.y = 0;
await text(root, CONFIG.title, { name: "Title", styleName: "Typography/H1", width: 1200 });
await text(root, CONFIG.description, {
  name: "Description",
  styleName: "Typography/Body Large",
  width: 1080,
  color: semantic("text/muted")
});
${body}
return {
  runId: "portal-v2-components-v1",
  pageId: page.id,
  rootNodeId: root.id,
  createdNodeIds,
  removedNodeIds,
  createdComponentIds,
  createdComponentSetIds
};
`;
}
