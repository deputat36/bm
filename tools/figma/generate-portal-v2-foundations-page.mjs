import { buildRuntime } from "./portal-v2-doc-runtime.mjs";

const body = `text(root, "Foundations", { name: "Title", font: black, size: 56, width: 1100 });
text(root, "Единый контракт между production CSS и Figma: colors, typography, spacing, radius и effects.", {
  name: "Description",
  size: 20,
  width: 1000,
  color: v("02 Semantic · Color", "text/muted")
});
function section(title, description) {
  const block = auto("Section / " + title, "VERTICAL");
  block.resize(1248, 100);
  block.itemSpacing = 12;
  root.appendChild(block);
  text(block, title, { name: "Section title", font: black, size: 38, width: 1248 });
  text(block, description, { name: "Section description", size: 16, width: 1100, color: v("02 Semantic · Color", "text/muted") });
  return block;
}
const primitiveSection = section("Primitive colors", "Сырые значения скрыты из property pickers и используются только как alias targets.");
const primitiveGrid = auto("Primitive grid", "HORIZONTAL");
primitiveGrid.resize(1248, 520);
primitiveGrid.layoutWrap = "WRAP";
primitiveGrid.itemSpacing = 16;
primitiveGrid.counterAxisSpacing = 16;
primitiveSection.appendChild(primitiveGrid);
const primitiveCollection = collections.find((item) => item.name === "01 Primitives · Color");
for (const item of variables.filter((entry) => entry.variableCollectionId === primitiveCollection.id)) {
  const itemCard = card(primitiveGrid, "Primitive / " + item.name, 232);
  const swatch = figma.createRectangle();
  swatch.name = "Swatch";
  swatch.resize(184, 84);
  swatch.fills = [paint(item)];
  radius(swatch, v("04 Dimensions · Radius", "md"));
  itemCard.appendChild(swatch);
  createdNodeIds.push(swatch.id);
  text(itemCard, item.name, { name: "Token", font: bold, size: 13, width: 184 });
}
const semanticSection = section("Semantic colors", "Компоненты используют semantic variables, связанные с primitives через VARIABLE_ALIAS.");
const semanticGrid = auto("Semantic grid", "HORIZONTAL");
semanticGrid.resize(1248, 480);
semanticGrid.layoutWrap = "WRAP";
semanticGrid.itemSpacing = 16;
semanticGrid.counterAxisSpacing = 16;
semanticSection.appendChild(semanticGrid);
const semanticCollection = collections.find((item) => item.name === "02 Semantic · Color");
for (const item of variables.filter((entry) => entry.variableCollectionId === semanticCollection.id)) {
  const itemCard = card(semanticGrid, "Semantic / " + item.name, 296);
  const swatch = figma.createRectangle();
  swatch.name = "Swatch";
  swatch.resize(248, 72);
  swatch.fills = [paint(item)];
  radius(swatch, v("04 Dimensions · Radius", "md"));
  itemCard.appendChild(swatch);
  createdNodeIds.push(swatch.id);
  text(itemCard, item.name, { name: "Token", font: bold, size: 13, width: 248 });
}
const typeSection = section("Typography", "Figma использует ближайший доступный системный шрифт, сохраняя размеры и вертикальный ритм.");
const typeStack = auto("Type specimens", "VERTICAL");
typeStack.resize(1248, 700);
typeStack.itemSpacing = 24;
typeSection.appendChild(typeStack);
const styles = await figma.getLocalTextStylesAsync();
const samples = [
  ["Typography/Display", "Display — городской навигатор"],
  ["Typography/H1", "H1 — Новостройки Борисоглебска"],
  ["Typography/H2", "H2 — Сравните жилые комплексы"],
  ["Typography/H3", "H3 — Проверенные характеристики"],
  ["Typography/Body Large", "Body Large — Помогаем разобраться в проектах и условиях покупки."],
  ["Typography/Body", "Body — Данные сверяются по открытым источникам и официальным материалам."],
  ["Typography/Label", "LABEL · СТАТУС ПРОВЕРКИ"]
];
for (const [styleName, sample] of samples) {
  const style = styles.find((item) => item.name === styleName);
  if (!style) throw new Error("Missing text style: " + styleName);
  await figma.loadFontAsync(style.fontName);
  const node = text(typeStack, sample, { name: styleName, width: 1200 });
  node.textStyleId = style.id;
}
const dimensions = section("Spacing and radius", "Размерные variables используются для gaps, paddings и corner radii.");
const dimensionRow = auto("Dimension row", "HORIZONTAL");
dimensionRow.resize(1248, 600);
dimensionRow.itemSpacing = 24;
dimensions.appendChild(dimensionRow);
const spacingCard = card(dimensionRow, "Spacing scale", 600);
const spacingCollection = collections.find((item) => item.name === "03 Dimensions · Spacing");
for (const item of variables.filter((entry) => entry.variableCollectionId === spacingCollection.id)) {
  const row = auto("Spacing / " + item.name, "HORIZONTAL");
  row.resize(520, 40);
  row.itemSpacing = 16;
  row.counterAxisAlignItems = "CENTER";
  spacingCard.appendChild(row);
  text(row, item.name, { name: "Name", font: bold, size: 13, width: 80 });
  const bar = figma.createRectangle();
  const raw = Number(item.valuesByMode[spacingCollection.defaultModeId]);
  bar.name = "Bar";
  bar.resize(Math.max(16, raw * 4), 16);
  fill(bar, v("02 Semantic · Color", "action/primary"));
  radius(bar, v("04 Dimensions · Radius", "pill"));
  row.appendChild(bar);
  createdNodeIds.push(bar.id);
}
const radiusCard = card(dimensionRow, "Radius scale", 600);
const radiusCollection = collections.find((item) => item.name === "04 Dimensions · Radius");
for (const item of variables.filter((entry) => entry.variableCollectionId === radiusCollection.id)) {
  const row = auto("Radius / " + item.name, "HORIZONTAL");
  row.resize(520, 68);
  row.itemSpacing = 16;
  row.counterAxisAlignItems = "CENTER";
  radiusCard.appendChild(row);
  const shape = figma.createRectangle();
  shape.name = "Shape";
  shape.resize(96, 52);
  fill(shape, v("02 Semantic · Color", "status/verified"));
  radius(shape, item);
  row.appendChild(shape);
  createdNodeIds.push(shape.id);
  text(row, item.name, { name: "Name", font: bold, size: 13, width: 280 });
}
const effects = section("Effects", "Тени обозначают иерархию; focus effect применяется только к интерактивным состояниям.");
const effectRow = auto("Effect styles", "HORIZONTAL");
effectRow.resize(1248, 240);
effectRow.itemSpacing = 24;
effects.appendChild(effectRow);
for (const style of (await figma.getLocalEffectStylesAsync()).filter((item) => item.name.startsWith("Effects/"))) {
  const item = card(effectRow, "Effect / " + style.name, 288);
  item.effectStyleId = style.id;
  text(item, style.name.replace("Effects/", ""), { name: "Name", font: black, size: 18, width: 240 });
  text(item, style.description || "Portal v2 effect", { name: "Description", size: 13, width: 240, color: v("02 Semantic · Color", "text/muted") });
}`;

process.stdout.write(buildRuntime({
  pageName: "02 Foundations",
  docKey: "foundations",
  background: "background/soft"
}, body));
