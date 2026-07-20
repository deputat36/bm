import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const errors = [];
const jobs = [
  ["skeleton", "tools/figma/generate-portal-v2-page-skeleton.mjs", []],
  ["cover", "tools/figma/generate-portal-v2-cover.mjs", []],
  ["getting-started", "tools/figma/generate-portal-v2-getting-started.mjs", []],
  ["foundations", "tools/figma/generate-portal-v2-foundations-page.mjs", []],
  ["components-index", "tools/figma/generate-portal-v2-index-page.mjs", ["components"]],
  ["utilities-index", "tools/figma/generate-portal-v2-index-page.mjs", ["utilities"]]
];

function read(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    errors.push(`${file}: missing file`);
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

const runtime = read("tools/figma/portal-v2-doc-runtime.mjs");
if (/#[0-9a-f]{6}/i.test(runtime)) errors.push("portal-v2-doc-runtime.mjs: hardcoded HEX is forbidden");
for (const fragment of [
  "setCurrentPageAsync(page)",
  "getLocalVariableCollectionsAsync",
  "getLocalVariablesAsync",
  "setBoundVariableForPaint",
  "createAutoLayout",
  "setSharedPluginData",
  "getSharedPluginData",
  "loadFontAsync",
  "createdNodeIds",
  "removedNodeIds"
]) {
  if (!runtime.includes(fragment)) errors.push(`runtime: missing ${fragment}`);
}

const output = new Map();
for (const [name, file, args] of jobs) {
  try {
    const generated = execFileSync(process.execPath, [path.join(root, file), ...args], {
      cwd: root,
      encoding: "utf8"
    });
    output.set(name, generated);
    if (generated.length > 50000) errors.push(`${name}: exceeds 50000 characters (${generated.length})`);
    try {
      new Function("figma", `return (async () => {\n${generated}\n})()`);
    } catch (error) {
      errors.push(`${name}: generated code does not compile (${error.message})`);
    }
    for (const forbidden of [
      "ALL_SCOPES",
      "figma.notify(",
      "figma.closePlugin(",
      "figma.currentPage =",
      "loadAllPagesAsync",
      ".getPluginData(",
      ".setPluginData("
    ]) {
      if (generated.includes(forbidden)) errors.push(`${name}: forbidden fragment ${forbidden}`);
    }
  } catch (error) {
    errors.push(`${name}: generator failed (${error.message})`);
  }
}

const skeleton = output.get("skeleton") || "";
for (const pageName of [
  "00 Cover",
  "01 Getting Started",
  "02 Foundations",
  "— Components",
  "03 Components",
  "— Utilities",
  "04 Utilities"
]) {
  if (!skeleton.includes(pageName)) errors.push(`skeleton: missing page ${pageName}`);
}
if (!skeleton.includes("figma.root.insertChild")) errors.push("skeleton: page ordering is missing");
if (skeleton.includes("setCurrentPageAsync")) errors.push("skeleton: must not switch pages");

for (const name of ["cover", "getting-started", "foundations", "components-index", "utilities-index"]) {
  const generated = output.get(name) || "";
  const switches = generated.match(/setCurrentPageAsync\(/g) || [];
  if (switches.length !== 1) errors.push(`${name}: expected exactly one page switch, found ${switches.length}`);
  for (const fragment of [
    "createAutoLayout",
    "setBoundVariableForPaint",
    "setSharedPluginData",
    "getSharedPluginData",
    "return {"
  ]) {
    if (!generated.includes(fragment)) errors.push(`${name}: missing ${fragment}`);
  }
  if (/#[0-9a-f]{6}/i.test(generated)) errors.push(`${name}: hardcoded HEX is forbidden`);
}

const cover = output.get("cover") || "";
for (const fragment of ["background/hero", "text/inverse", "DESIGN SYSTEM · 2026", "Проверка источников"]) {
  if (!cover.includes(fragment)) errors.push(`cover: missing ${fragment}`);
}

const gettingStarted = output.get("getting-started") || "";
for (const fragment of ["Источник правды", "Проверка данных", "Безопасные CTA", "portal-v2.tokens.json"]) {
  if (!gettingStarted.includes(fragment)) errors.push(`getting-started: missing ${fragment}`);
}

const foundations = output.get("foundations") || "";
for (const fragment of [
  "Primitive colors",
  "Semantic colors",
  "Typography",
  "Spacing and radius",
  "Effects",
  "VARIABLE_ALIAS",
  "getLocalTextStylesAsync",
  "getLocalEffectStylesAsync",
  "layoutWrap",
  "effectStyleId"
]) {
  if (!foundations.includes(fragment)) errors.push(`foundations: missing ${fragment}`);
}

const components = output.get("components-index") || "";
const tokens = JSON.parse(read("data/design/portal-v2.tokens.json"));
for (const component of tokens.components_v1 || []) {
  if (!components.includes(component)) errors.push(`components-index: missing ${component}`);
}

console.log(`Documentation scripts: ${jobs.length}`);
for (const [name] of jobs) console.log(`${name}: ${(output.get(name) || "").length} characters`);
console.log("Page switches: skeleton=0, documentation pages=1 each");
console.log("Hardcoded HEX in generated scripts: 0");

if (errors.length) {
  console.error("\nFigma documentation handoff errors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Figma documentation handoff validation passed.");
