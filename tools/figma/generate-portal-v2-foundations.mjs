import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TOKENS_PATH = path.join(ROOT, "data/design/portal-v2.tokens.json");
const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, "utf8"));

const payload = JSON.stringify(tokens, null, 2);

const code = String.raw`const TOKENS = ${payload};
const RUN_ID = "portal-v2-foundations-v1";
const createdCollectionIds = [];
const updatedCollectionIds = [];
const createdVariableIds = [];
const updatedVariableIds = [];
const createdTextStyleIds = [];
const updatedTextStyleIds = [];
const createdEffectStyleIds = [];
const updatedEffectStyleIds = [];

function hexToColor(hex) {
  const normalized = String(hex).replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) throw new Error("Invalid HEX color: " + hex);
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
    a: 1
  };
}

function tokenName(key) {
  return String(key).replace(/_/g, "/");
}

function cssTokenName(prefix, key) {
  return "var(--" + prefix + "-" + String(key).replace(/_/g, "-") + ")";
}

function semanticScopes(key) {
  if (key.startsWith("background_") || key.startsWith("surface_")) {
    return ["FRAME_FILL", "SHAPE_FILL"];
  }
  if (key.startsWith("text_")) return ["TEXT_FILL"];
  if (key.startsWith("border_")) return ["STROKE_COLOR"];
  if (key === "focus_ring") return ["EFFECT_COLOR", "STROKE_COLOR"];
  return ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"];
}

const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
const localVariables = await figma.variables.getLocalVariablesAsync();

function ensureCollection(name) {
  let collection = localCollections.find((item) => item.name === name);
  if (!collection) {
    collection = figma.variables.createVariableCollection(name);
    localCollections.push(collection);
    createdCollectionIds.push(collection.id);
  } else {
    updatedCollectionIds.push(collection.id);
  }

  const firstMode = collection.modes[0];
  if (!firstMode) throw new Error("Collection has no mode: " + name);
  if (firstMode.name !== "Light") collection.renameMode(firstMode.modeId, "Light");
  return { collection, modeId: collection.modes[0].modeId };
}

function ensureVariable(name, collection, resolvedType) {
  let variable = localVariables.find(
    (item) => item.name === name && item.variableCollectionId === collection.id
  );
  if (!variable) {
    variable = figma.variables.createVariable(name, collection, resolvedType);
    localVariables.push(variable);
    createdVariableIds.push(variable.id);
  } else {
    if (variable.resolvedType !== resolvedType) {
      throw new Error("Variable type mismatch for " + name + ": " + variable.resolvedType);
    }
    updatedVariableIds.push(variable.id);
  }
  return variable;
}

const primitiveSetup = ensureCollection("01 Primitives · Color");
const semanticSetup = ensureCollection("02 Semantic · Color");
const spacingSetup = ensureCollection("03 Dimensions · Spacing");
const radiusSetup = ensureCollection("04 Dimensions · Radius");

const primitiveVariables = new Map();
for (const [key, value] of Object.entries(TOKENS.color.primitive)) {
  const variable = ensureVariable(tokenName(key), primitiveSetup.collection, "COLOR");
  variable.scopes = [];
  variable.setValueForMode(primitiveSetup.modeId, hexToColor(value));
  variable.setVariableCodeSyntax("WEB", cssTokenName("color", key));
  primitiveVariables.set(key, variable);
}

for (const [key, aliasKey] of Object.entries(TOKENS.color.semantic_aliases)) {
  const primitive = primitiveVariables.get(aliasKey);
  if (!primitive) throw new Error("Missing primitive alias target " + aliasKey + " for " + key);
  const variable = ensureVariable(tokenName(key), semanticSetup.collection, "COLOR");
  variable.scopes = semanticScopes(key);
  variable.setValueForMode(semanticSetup.modeId, { type: "VARIABLE_ALIAS", id: primitive.id });
  variable.setVariableCodeSyntax("WEB", cssTokenName("color", key));
}

for (const [key, value] of Object.entries(TOKENS.spacing)) {
  const variable = ensureVariable(key, spacingSetup.collection, "FLOAT");
  variable.scopes = ["GAP"];
  variable.setValueForMode(spacingSetup.modeId, Number(value));
  variable.setVariableCodeSyntax("WEB", cssTokenName("space", key));
}

for (const [key, value] of Object.entries(TOKENS.radius)) {
  const variable = ensureVariable(key, radiusSetup.collection, "FLOAT");
  variable.scopes = ["CORNER_RADIUS"];
  variable.setValueForMode(radiusSetup.modeId, Number(value));
  variable.setVariableCodeSyntax("WEB", cssTokenName("radius", key));
}

const availableFonts = await figma.listAvailableFontsAsync();
const availableFontNames = availableFonts.map((item) => item.fontName);

function selectFont(weight) {
  const stylePriority = weight >= 900
    ? ["Black", "Heavy", "Extra Bold", "Bold"]
    : weight >= 800
      ? ["Extra Bold", "Bold", "Semi Bold"]
      : weight >= 500
        ? ["Medium", "Regular"]
        : ["Regular", "Normal"];

  for (const family of TOKENS.typography.figma_font_fallbacks) {
    for (const style of stylePriority) {
      const match = availableFontNames.find(
        (fontName) => fontName.family === family && fontName.style === style
      );
      if (match) return match;
    }
  }

  const fallback = availableFontNames.find((fontName) => fontName.style === "Regular") || availableFontNames[0];
  if (!fallback) throw new Error("No fonts available in Figma");
  return fallback;
}

const textStyleDefinitions = [
  ["Typography/Display", TOKENS.typography.display.size_max, TOKENS.typography.display],
  ["Typography/H1", TOKENS.typography.h1.size_max, TOKENS.typography.h1],
  ["Typography/H2", TOKENS.typography.h2.size_max, TOKENS.typography.h2],
  ["Typography/H3", TOKENS.typography.h3.size, TOKENS.typography.h3],
  ["Typography/Body Large", TOKENS.typography.body_large.size, TOKENS.typography.body_large],
  ["Typography/Body", TOKENS.typography.body.size, TOKENS.typography.body],
  ["Typography/Label", TOKENS.typography.label.size, TOKENS.typography.label]
];

const localTextStyles = await figma.getLocalTextStylesAsync();
for (const [name, size, definition] of textStyleDefinitions) {
  let style = localTextStyles.find((item) => item.name === name);
  if (!style) {
    style = figma.createTextStyle();
    style.name = name;
    localTextStyles.push(style);
    createdTextStyleIds.push(style.id);
  } else {
    updatedTextStyleIds.push(style.id);
  }

  const fontName = selectFont(definition.weight);
  await figma.loadFontAsync(fontName);
  style.fontName = fontName;
  style.fontSize = Number(size);
  style.lineHeight = { unit: "PERCENT", value: Number(definition.line_height) * 100 };
  style.letterSpacing = {
    unit: "PERCENT",
    value: Number(definition.letter_spacing_em || 0) * 100
  };
  style.description = "Portal v2 · " + definition.weight + " weight · source: portal-v2.tokens.json";
}

function parseShadow(value) {
  const match = String(value).match(
    /^(-?\d+)px\s+(-?\d+)px\s+(\d+)px(?:\s+(\d+)px)?\s+rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/
  );
  if (!match) throw new Error("Unsupported shadow token: " + value);
  return {
    type: "DROP_SHADOW",
    color: {
      r: Number(match[5]) / 255,
      g: Number(match[6]) / 255,
      b: Number(match[7]) / 255,
      a: Number(match[8])
    },
    offset: { x: Number(match[1]), y: Number(match[2]) },
    radius: Number(match[3]),
    spread: Number(match[4] || 0),
    visible: true,
    blendMode: "NORMAL"
  };
}

const localEffectStyles = await figma.getLocalEffectStylesAsync();
for (const [key, value] of Object.entries(TOKENS.shadow)) {
  const name = "Effects/" + key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  let style = localEffectStyles.find((item) => item.name === name);
  if (!style) {
    style = figma.createEffectStyle();
    style.name = name;
    localEffectStyles.push(style);
    createdEffectStyleIds.push(style.id);
  } else {
    updatedEffectStyleIds.push(style.id);
  }
  style.effects = [parseShadow(value)];
  style.description = "Portal v2 · var(--shadow-" + key.replace(/_/g, "-") + ")";
}

return {
  runId: RUN_ID,
  fileKey: TOKENS.figma_file_key,
  collections: {
    created: createdCollectionIds,
    updated: updatedCollectionIds,
    total: 4
  },
  variables: {
    created: createdVariableIds,
    updated: updatedVariableIds,
    primitiveColors: Object.keys(TOKENS.color.primitive).length,
    semanticColors: Object.keys(TOKENS.color.semantic_aliases).length,
    spacing: Object.keys(TOKENS.spacing).length,
    radius: Object.keys(TOKENS.radius).length
  },
  textStyles: {
    created: createdTextStyleIds,
    updated: updatedTextStyleIds,
    total: textStyleDefinitions.length
  },
  effectStyles: {
    created: createdEffectStyleIds,
    updated: updatedEffectStyleIds,
    total: Object.keys(TOKENS.shadow).length
  },
  warnings: []
};
`;

process.stdout.write(code);
