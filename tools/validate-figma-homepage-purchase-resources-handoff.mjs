import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatorPath = path.join(ROOT, "tools/figma/generate-portal-v2-homepage-purchase-resources-screen.mjs");
const linkGeneratorPath = path.join(ROOT, "tools/figma/generate-portal-v2-link-card-components.mjs");
const docsPath = path.join(ROOT, "docs/design/FIGMA_HOMEPAGE_PURCHASE_RESOURCES_HANDOFF.md");
const linkDocsPath = path.join(ROOT, "docs/design/FIGMA_LINK_CARD_HANDOFF.md");
const sourcePaths = ["index.html", "assets/css/home-polish.css", "data/design/portal-v2.tokens.json"];

const errors = [];
function assert(condition, message) {
  if (!condition) errors.push(message);
}

for (const item of [generatorPath, linkGeneratorPath, docsPath, linkDocsPath, ...sourcePaths.map((value) => path.join(ROOT, value))]) {
  assert(fs.existsSync(item), `Missing required file: ${path.relative(ROOT, item)}`);
}

let code = "";
if (fs.existsSync(generatorPath)) {
  const run = spawnSync(process.execPath, [generatorPath], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  assert(run.status === 0, `Homepage purchase resources generator failed: ${run.stderr.trim()}`);
  code = run.stdout || "";
}

if (code) {
  assert(code.length <= 50000, "Homepage purchase resources generator exceeds Figma.use_figma 50,000 character limit");
  assert(code.includes("22 Screen · Homepage Purchase & Resources"), "Homepage purchase resources screen uses the wrong Figma page name");
  assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, "Homepage purchase resources screen must switch page exactly once");
  assert(!/#[0-9a-f]{3,8}\b/i.test(code), "Homepage purchase resources screen contains hardcoded HEX");

  for (const pattern of [
    "figma.notify(",
    "figma.closePlugin(",
    "figma.currentPage =",
    "loadAllPagesAsync",
    ".getPluginData(",
    ".setPluginData("
  ]) assert(!code.includes(pattern), `Homepage purchase resources screen uses unsupported API: ${pattern}`);

  for (const marker of [
    "getLocalComponentsAsync",
    ".createInstance()",
    "componentProperties",
    "setProperties(",
    "Link Card",
    "setSharedPluginData(\"portal-v2\", \"route\""
  ]) assert(code.includes(marker), `Homepage purchase resources screen misses dependency/API marker: ${marker}`);

  for (const marker of [
    "for (const layout of [\"Desktop\", \"Mobile\"])",
    "screenWidth = desktop ? 1440 : 360",
    "contentWidth = desktop ? 1200 : 336",
    "Homepage Purchase & Resources / ",
    "Purchase method cards",
    "Useful resource cards"
  ]) assert(code.includes(marker), `Homepage purchase resources screen misses layout marker: ${marker}`);

  for (const marker of [
    "Способы покупки",
    "Можно заранее обсудить бюджет и подготовиться к сделке.",
    "Ипотека",
    "Семейная ипотека",
    "Проверка актуальных условий программы на момент обращения.",
    "Господдержка и обмен",
    "Полезные разделы",
    "Застройщики",
    "Справочник покупателя",
    "Новости и обновления",
    "developers/",
    "guides/",
    "news/",
    "ipoteka/"
  ]) assert(code.includes(marker), `Homepage purchase resources screen misses production content: ${marker}`);

  for (const prohibited of [
    "Гарантированное одобрение",
    "Гарантированная ставка",
    "Семейная ипотека доступна всем",
    "Квартира в наличии",
    "Зафиксировать цену"
  ]) assert(!code.includes(prohibited), `Homepage purchase resources screen contains prohibited promise: ${prohibited}`);

  const tempFile = path.join(os.tmpdir(), `portal-v2-homepage-purchase-resources-${process.pid}.mjs`);
  fs.writeFileSync(tempFile, `async function __figmaUseWrapper() {\n${code}\n}\n`, "utf8");
  const syntax = spawnSync(process.execPath, ["--check", tempFile], { encoding: "utf8" });
  fs.rmSync(tempFile, { force: true });
  assert(syntax.status === 0, `Homepage purchase resources generated invalid JavaScript: ${syntax.stderr.trim()}`);
}

if (fs.existsSync(docsPath)) {
  const docs = fs.readFileSync(docsPath, "utf8");
  for (const marker of [
    "22 Screen · Homepage Purchase & Resources",
    "Desktop — 1440 px",
    "Mobile — 360 px",
    "Link Card",
    "portal-v2",
    "route",
    "Проверка актуальных условий программы на момент обращения.",
    "Visual QA",
    "issue №116",
    "resource:figma-generate-design"
  ]) assert(docs.includes(marker), `Homepage purchase resources documentation misses: ${marker}`);
}

if (errors.length) {
  console.error(`Figma homepage purchase resources validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Figma homepage purchase resources handoff validation passed.");