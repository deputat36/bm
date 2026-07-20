export function buildRuntime(config, body) {
  return `const CONFIG = ${JSON.stringify(config)};
const createdNodeIds = [];
const removedNodeIds = [];
if (figma.editorType !== "figma") throw new Error("Figma Design file required");
let page = figma.root.children.find((item) => item.name === CONFIG.pageName);
if (!page) {
  page = figma.createPage();
  page.name = CONFIG.pageName;
  createdNodeIds.push(page.id);
}
await figma.setCurrentPageAsync(page);
for (const node of [...page.children]) {
  if (node.getSharedPluginData("portal-v2", "doc-key") === CONFIG.docKey) {
    removedNodeIds.push(node.id);
    node.remove();
  }
}
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
function v(collectionName, name) {
  const collection = collections.find((item) => item.name === collectionName);
  if (!collection) throw new Error("Missing collection: " + collectionName);
  const result = variables.find((item) => item.variableCollectionId === collection.id && item.name === name);
  if (!result) throw new Error("Missing variable: " + name);
  return result;
}
function paint(value) {
  return figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 1, g: 1, b: 1 } }, "color", value);
}
function fill(node, value) { node.fills = [paint(value)]; }
function radius(node, value) {
  node.setBoundVariable("topLeftRadius", value);
  node.setBoundVariable("topRightRadius", value);
  node.setBoundVariable("bottomLeftRadius", value);
  node.setBoundVariable("bottomRightRadius", value);
}
function auto(name, direction = "VERTICAL") {
  const node = figma.createAutoLayout(direction);
  node.name = name;
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "FIXED";
  node.clipsContent = false;
  createdNodeIds.push(node.id);
  return node;
}
const fonts = (await figma.listAvailableFontsAsync()).map((item) => item.fontName);
function choose(styles) {
  for (const family of ["Segoe UI", "Arial", "Inter", "Roboto", "Noto Sans"]) {
    for (const style of styles) {
      const match = fonts.find((font) => font.family === family && font.style === style);
      if (match) return match;
    }
  }
  return fonts.find((font) => font.style === "Regular") || fonts[0];
}
const regular = choose(["Regular", "Normal"]);
const medium = choose(["Medium", "Regular"]);
const bold = choose(["Extra Bold", "Bold", "Semi Bold"]);
const black = choose(["Black", "Heavy", "Extra Bold", "Bold"]);
for (const font of [regular, medium, bold, black]) await figma.loadFontAsync(font);
function text(parent, value, options = {}) {
  const node = figma.createText();
  node.name = options.name || "Text";
  node.fontName = options.font || regular;
  node.characters = value;
  node.fontSize = options.size || 16;
  node.lineHeight = options.lineHeight || { unit: "PERCENT", value: 150 };
  node.textAutoResize = "HEIGHT";
  node.resize(options.width || 1000, 24);
  node.fills = [paint(options.color || v("02 Semantic · Color", "text/primary"))];
  parent.appendChild(node);
  createdNodeIds.push(node.id);
  return node;
}
function card(parent, name, width = 400) {
  const node = auto(name, "VERTICAL");
  node.resize(width, 120);
  node.itemSpacing = 12;
  node.paddingTop = 24;
  node.paddingRight = 24;
  node.paddingBottom = 24;
  node.paddingLeft = 24;
  fill(node, v("02 Semantic · Color", "surface/primary"));
  radius(node, v("04 Dimensions · Radius", "lg"));
  node.strokes = [paint(v("02 Semantic · Color", "border/default"))];
  node.strokeWeight = 1;
  parent.appendChild(node);
  return node;
}
const root = auto("Portal v2 / " + CONFIG.pageName, "VERTICAL");
root.setSharedPluginData("portal-v2", "doc-key", CONFIG.docKey);
root.setSharedPluginData("portal-v2", "run-id", "portal-v2-doc-pages-v1");
root.resize(1440, 900);
root.paddingTop = 96;
root.paddingRight = 96;
root.paddingBottom = 96;
root.paddingLeft = 96;
root.itemSpacing = 40;
fill(root, v("02 Semantic · Color", CONFIG.background));
page.appendChild(root);
root.x = 0;
root.y = 0;
${body}
return { runId: "portal-v2-doc-pages-v1", pageId: page.id, rootNodeId: root.id, createdNodeIds, removedNodeIds };
`;
}
