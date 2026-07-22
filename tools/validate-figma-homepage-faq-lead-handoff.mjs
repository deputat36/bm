import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatorPath = path.join(ROOT, "tools/figma/generate-portal-v2-homepage-faq-lead-screen.mjs");
const faqGeneratorPath = path.join(ROOT, "tools/figma/generate-portal-v2-faq-accordion-components.mjs");
const leadGeneratorPath = path.join(ROOT, "tools/figma/generate-portal-v2-lead-form-card-components.mjs");
const docsPath = path.join(ROOT, "docs/design/FIGMA_HOMEPAGE_FAQ_LEAD_HANDOFF.md");
const sourcePaths = [
  "index.html",
  "assets/css/styles.css",
  "assets/css/home-polish.css",
  "data/design/portal-v2.tokens.json"
];

const errors = [];
function assert(condition, message) {
  if (!condition) errors.push(message);
}

for (const item of [generatorPath, faqGeneratorPath, leadGeneratorPath, docsPath, ...sourcePaths.map((value) => path.join(ROOT, value))]) {
  assert(fs.existsSync(item), `Missing required file: ${path.relative(ROOT, item)}`);
}

function runGenerator(filePath, label) {
  if (!fs.existsSync(filePath)) return "";
  const run = spawnSync(process.execPath, [filePath], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  assert(run.status === 0, `${label} generator failed: ${run.stderr.trim()}`);
  return run.stdout || "";
}

const code = runGenerator(generatorPath, "Homepage FAQ lead");
const faqCode = runGenerator(faqGeneratorPath, "FAQ Accordion");
const leadCode = runGenerator(leadGeneratorPath, "Lead Form Card");

if (faqCode) {
  for (const marker of [
    "node.resize(isMobile ? 336 : 760, 96)",
    "width: isMobile ? 256 : 664",
    "width: isMobile ? 304 : 712",
    "Desktop 760 px / Mobile 336 px"
  ]) assert(faqCode.includes(marker), `FAQ Accordion misses Mobile 336 contract: ${marker}`);
}

if (leadCode) {
  for (const marker of [
    "submit.name = \"Submit action\"",
    "submit.isExposedInstance = true",
    "exposed Light submit Button",
    "Consent text",
    "Scope=Detailed"
  ]) assert(leadCode.includes(marker), `Lead Form Card misses exposed submit contract: ${marker}`);
}

if (code) {
  assert(code.length <= 50000, "Homepage FAQ lead generator exceeds Figma.use_figma 50,000 character limit");
  assert(code.includes("23 Screen · Homepage FAQ & Lead"), "Homepage FAQ lead screen uses the wrong Figma page name");
  assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, "Homepage FAQ lead screen must switch page exactly once");
  assert(!/#[0-9a-f]{3,8}\b/i.test(code), "Homepage FAQ lead screen contains hardcoded HEX");

  for (const pattern of [
    "figma.notify(",
    "figma.closePlugin(",
    "figma.currentPage =",
    "loadAllPagesAsync",
    ".getPluginData(",
    ".setPluginData("
  ]) assert(!code.includes(pattern), `Homepage FAQ lead screen uses unsupported API: ${pattern}`);

  for (const marker of [
    "getLocalComponentsAsync",
    ".createInstance()",
    "componentProperties",
    "setProperties(",
    "FAQ Accordion",
    "Lead Form Card",
    "Button",
    "State=Open",
    "State=Closed",
    "Size=Desktop",
    "Size=Mobile",
    "Scope=Detailed",
    "Context=Light",
    "Context=Hero",
    "exposedInstances",
    "Submit action",
    "setSharedPluginData"
  ]) assert(code.includes(marker), `Homepage FAQ lead screen misses dependency/API marker: ${marker}`);

  for (const marker of [
    "for (const layout of [\"Desktop\", \"Mobile\"])",
    "screenWidth = desktop ? 1440 : 360",
    "contentWidth = desktop ? 1200 : 336",
    "Homepage FAQ & Lead / ",
    "FAQ accordion stack",
    "Detailed lead layout",
    "desktop ? 560 : 336",
    "desktop ? leadDesktop : leadMobile"
  ]) assert(code.includes(marker), `Homepage FAQ lead screen misses layout marker: ${marker}`);

  assert((code.match(/question:/g) || []).length === 6, "Homepage FAQ lead screen must define exactly 6 FAQ questions");
  assert((code.match(/answer:/g) || []).length === 6, "Homepage FAQ lead screen must define exactly 6 FAQ answers");

  for (const marker of [
    "Где посмотреть новостройки Борисоглебска?",
    "Как узнать актуальные цены и наличие квартир?",
    "Можно ли подобрать 1-, 2- или 3-комнатную квартиру?",
    "Можно ли купить квартиру с семейной ипотекой?",
    "Какие документы нужно проверить перед покупкой?",
    "Портал является сайтом застройщика?",
    "Задать вопрос специалисту",
    "Позвонить: 8 903 857-69-09",
    "Расскажите, что важно при покупке",
    "Получить консультацию",
    "Заявка не является бронью и не фиксирует цену."
  ]) assert(code.includes(marker), `Homepage FAQ lead screen misses production content: ${marker}`);

  for (const marker of [
    "homepage_priority_selection",
    "portal_selection",
    "Портал Новостройки Борисоглебска",
    "form-id",
    "lead-type",
    "project"
  ]) assert(code.includes(marker), `Homepage FAQ lead screen misses lead metadata: ${marker}`);

  for (const prohibited of [
    "Забронировать квартиру",
    "Зафиксировать цену",
    "Гарантированное одобрение",
    "Квартира в наличии",
    "Официальный сайт застройщика"
  ]) assert(!code.includes(prohibited), `Homepage FAQ lead screen contains prohibited promise: ${prohibited}`);

  const tempFile = path.join(os.tmpdir(), `portal-v2-homepage-faq-lead-${process.pid}.mjs`);
  fs.writeFileSync(tempFile, `async function __figmaUseWrapper() {\n${code}\n}\n`, "utf8");
  const syntax = spawnSync(process.execPath, ["--check", tempFile], { encoding: "utf8" });
  fs.rmSync(tempFile, { force: true });
  assert(syntax.status === 0, `Homepage FAQ lead generated invalid JavaScript: ${syntax.stderr.trim()}`);
}

if (fs.existsSync(docsPath)) {
  const docs = fs.readFileSync(docsPath, "utf8");
  for (const marker of [
    "23 Screen · Homepage FAQ & Lead",
    "Homepage FAQ & Lead / Desktop",
    "Homepage FAQ & Lead / Mobile",
    "Mobile-вариант исправлен с 360 до системной ширины 336 px",
    "один Open и пять Closed FAQ",
    "Detailed Lead Form Card",
    "Submit action",
    "exposed instance",
    "homepage_priority_selection",
    "portal_selection",
    "обязательное согласие",
    "Code Connect",
    "Visual QA",
    "issue №116",
    "resource:figma-generate-design"
  ]) assert(docs.includes(marker), `Homepage FAQ lead documentation misses: ${marker}`);
}

if (errors.length) {
  console.error(`Figma homepage FAQ lead validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Figma homepage FAQ lead handoff validation passed.");