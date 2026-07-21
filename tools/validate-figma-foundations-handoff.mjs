import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const TOKEN_PATH = "data/design/portal-v2.tokens.json";
const CSS_PATH = "assets/css/portal-v2.tokens.css";
const GENERATOR_PATH = "tools/figma/generate-portal-v2-foundations.mjs";
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function normalizeHex(value) {
  return String(value || "").trim().toLowerCase();
}

function cssKey(prefix, key) {
  return `--${prefix}-${String(key).replace(/_/g, "-")}`;
}

let tokens = {};
try {
  tokens = JSON.parse(read(TOKEN_PATH));
} catch (error) {
  errors.push(`${TOKEN_PATH}: invalid JSON (${error.message})`);
}

const css = read(CSS_PATH);
const generator = read(GENERATOR_PATH);
const primitive = tokens.color?.primitive || {};
const semantic = tokens.color?.semantic || {};
const aliases = tokens.color?.semantic_aliases || {};

if (tokens.figma_file_key !== "rhFYa5gPDhF009hZsfEGSX") {
  errors.push(`${TOKEN_PATH}: Figma file key mismatch`);
}

const semanticKeys = Object.keys(semantic).sort();
const aliasKeys = Object.keys(aliases).sort();
if (semanticKeys.join("|") !== aliasKeys.join("|")) {
  errors.push(`${TOKEN_PATH}: every semantic color must have exactly one primitive alias`);
}

for (const [semanticKey, primitiveKey] of Object.entries(aliases)) {
  if (!(primitiveKey in primitive)) {
    errors.push(`${TOKEN_PATH}: ${semanticKey} points to missing primitive ${primitiveKey}`);
    continue;
  }
  if (normalizeHex(semantic[semanticKey]) !== normalizeHex(primitive[primitiveKey])) {
    errors.push(`${TOKEN_PATH}: ${semanticKey} value differs from primitive ${primitiveKey}`);
  }
}

for (const [key, value] of Object.entries(primitive)) {
  const name = cssKey("color", key);
  if (!css.includes(`${name}: ${normalizeHex(value)}`)) {
    errors.push(`${CSS_PATH}: missing ${name}: ${normalizeHex(value)}`);
  }
}

for (const [key, primitiveKey] of Object.entries(aliases)) {
  const semanticName = cssKey("color", key);
  const primitiveName = cssKey("color", primitiveKey);
  if (!css.includes(`${semanticName}: var(${primitiveName})`)) {
    errors.push(`${CSS_PATH}: missing alias ${semanticName}: var(${primitiveName})`);
  }
}

for (const [key, value] of Object.entries(tokens.spacing || {})) {
  const name = cssKey("space", key);
  if (!css.includes(`${name}: ${value}px`)) errors.push(`${CSS_PATH}: missing ${name}: ${value}px`);
}

for (const [key, value] of Object.entries(tokens.radius || {})) {
  const name = cssKey("radius", key);
  if (!css.includes(`${name}: ${value}px`)) errors.push(`${CSS_PATH}: missing ${name}: ${value}px`);
}

const shadowPattern = /^-?\d+(?:\.\d+)?(?:px)?\s+-?\d+(?:\.\d+)?(?:px)?\s+\d+(?:\.\d+)?(?:px)?(?:\s+\d+(?:\.\d+)?(?:px)?)?\s+rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/;
for (const [key, value] of Object.entries(tokens.shadow || {})) {
  if (!shadowPattern.test(value)) errors.push(`${TOKEN_PATH}: unsupported shadow ${key}: ${value}`);
  const cssName = cssKey("shadow", key);
  if (!css.includes(`${cssName}: ${value.replace("0.20", "0.2")}`) && !css.includes(`${cssName}: ${value}`)) {
    errors.push(`${CSS_PATH}: missing ${cssName}`);
  }
}

let generated = "";
try {
  generated = execFileSync(process.execPath, [path.join(ROOT, GENERATOR_PATH)], {
    cwd: ROOT,
    encoding: "utf8"
  });
} catch (error) {
  errors.push(`${GENERATOR_PATH}: generator failed (${error.message})`);
}

if (generated.length > 50000) {
  errors.push(`${GENERATOR_PATH}: generated use_figma code exceeds 50000 characters (${generated.length})`);
}

try {
  new Function("figma", `return (async () => {\n${generated}\n})()`);
} catch (error) {
  errors.push(`${GENERATOR_PATH}: generated code does not compile (${error.message})`);
}

for (const fragment of [
  "getLocalVariableCollectionsAsync",
  "getLocalVariablesAsync",
  "createVariableCollection",
  "createVariable(",
  "setVariableCodeSyntax",
  "VARIABLE_ALIAS",
  "listAvailableFontsAsync",
  "loadFontAsync",
  "getLocalTextStylesAsync",
  "getLocalEffectStylesAsync",
  "Typography/Brand",
  "brand_mark",
  "header",
  "variable.scopes = []",
  "variable.scopes = [\"GAP\"]",
  "variable.scopes = [\"CORNER_RADIUS\"]",
  "return {"
]) {
  if (!generated.includes(fragment)) errors.push(`${GENERATOR_PATH}: generated code missing ${fragment}`);
}

for (const forbidden of [
  "ALL_SCOPES",
  "figma.notify(",
  "figma.closePlugin(",
  ".getPluginData(",
  ".setPluginData(",
  "figma.currentPage =",
  "loadAllPagesAsync"
]) {
  if (generated.includes(forbidden)) errors.push(`${GENERATOR_PATH}: forbidden fragment ${forbidden}`);
}

console.log(`Figma file: ${tokens.figma_file_key || "missing"}`);
console.log(`Primitive colors: ${Object.keys(primitive).length}`);
console.log(`Semantic aliases: ${Object.keys(aliases).length}`);
console.log(`Spacing variables: ${Object.keys(tokens.spacing || {}).length}`);
console.log(`Radius variables: ${Object.keys(tokens.radius || {}).length}`);
console.log(`Text styles planned: 8`);
console.log(`Effect styles planned: ${Object.keys(tokens.shadow || {}).length}`);
console.log(`Generated use_figma characters: ${generated.length}`);

if (errors.length) {
  console.error("\nFigma Foundations handoff validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Figma Foundations handoff validation passed.");
