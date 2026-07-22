import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fullGeneratorPath = path.join(ROOT, "tools/figma/generate-portal-v2-homepage-full-screen.mjs");
const footerGeneratorPath = path.join(ROOT, "tools/figma/generate-portal-v2-site-footer-components.mjs");
const fullDocsPath = path.join(ROOT, "docs/design/FIGMA_HOMEPAGE_FULL_HANDOFF.md");
const footerDocsPath = path.join(ROOT, "docs/design/FIGMA_SITE_FOOTER_HANDOFF.md");
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
function validateGeneratedSyntax(code, label) {
  const tempFile = path.join(os.tmpdir(), `portal-v2-${label}-${process.pid}.mjs`);
  fs.writeFileSync(tempFile, `async function __figmaUseWrapper() {\n${code}\n}\n`, "utf8");
  const syntax = spawnSync(process.execPath, ["--check", tempFile], { encoding: "utf8" });
  fs.rmSync(tempFile, { force: true });
  assert(syntax.status === 0, `${label} generated invalid JavaScript: ${syntax.stderr.trim()}`);
}

for (const item of [
  fullGeneratorPath,
  footerGeneratorPath,
  fullDocsPath,
  footerDocsPath,
  ...sourcePaths.map((value) => path.join(ROOT, value))
]) {
  assert(fs.existsSync(item), `Missing required file: ${path.relative(ROOT, item)}`);
}

const footerCode = runGenerator(footerGeneratorPath, "Site Footer");
if (footerCode) {
  assert(footerCode.length <= 50000, "Site Footer generator exceeds Figma.use_figma 50,000 character limit");
  assert(footerCode.includes("24 Component · Site Footer"), "Site Footer uses the wrong Figma page name");
  assert(footerCode.includes('combine(variants, stage, "Site Footer")'), "Site Footer uses the wrong ComponentSet name");
  assert((footerCode.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, "Site Footer must switch page exactly once");
  assert(!/#[0-9a-f]{3,8}\b/i.test(footerCode), "Site Footer contains hardcoded HEX");
  for (const marker of [
    'for (const layout of ["Desktop", "Mobile"])',
    'localVariant("Brand", ["Context=Dark", "Size=" + layout])',
    'property(node, "Tagline", "TEXT"',
    'property(node, "Phone", "TEXT"',
    'property(node, "Disclaimer", "TEXT"',
    'property(node, "Links", "TEXT"',
    'surface/emphasis',
    'text/inverse',
    'coral/100',
    'phone-route',
    'sources-route',
    'privacy-route',
    'contacts-route',
    'tel:+79038576909',
    'Mobile footer шириной 336 px'
  ]) assert(footerCode.includes(marker), `Site Footer misses contract marker: ${marker}`);
  validateGeneratedSyntax(footerCode, "site-footer");
}

const code = runGenerator(fullGeneratorPath, "Homepage Full");
if (code) {
  assert(code.length <= 50000, `Homepage Full generator exceeds Figma.use_figma 50,000 character limit: ${code.length}`);
  assert(code.includes("25 Screen · Homepage Full"), "Homepage Full uses the wrong Figma page name");
  assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, "Homepage Full must switch page exactly once");
  assert(!/#[0-9a-f]{3,8}\b/i.test(code), "Homepage Full contains hardcoded HEX");

  for (const pattern of [
    "figma.notify(",
    "figma.closePlugin(",
    "figma.currentPage =",
    "loadAllPagesAsync",
    ".getPluginData(",
    ".setPluginData("
  ]) assert(!code.includes(pattern), `Homepage Full uses unsupported API: ${pattern}`);

  for (const marker of [
    "getLocalComponentsAsync",
    ".createInstance()",
    "componentProperties",
    "setProperties(",
    "Top Navigation",
    "Button",
    "Fact Card",
    "Lead Form Card",
    "Scenario Card",
    "Project Card",
    "Content Card",
    "Step Card",
    "Link Card",
    "FAQ Accordion",
    "Site Footer",
    "exposedInstances",
    "setSharedPluginData"
  ]) assert(code.includes(marker), `Homepage Full misses dependency/API marker: ${marker}`);

  for (const marker of [
    'for (const layout of ["Desktop", "Mobile"])',
    "screenWidth = desktop ? 1440 : 360",
    "contentWidth = desktop ? 1200 : 336",
    "Homepage Full / ",
    '"homepage-full-" + layout.toLowerCase()',
    'screen.setSharedPluginData("portal-v2", "source", "index.html")'
  ]) assert(code.includes(marker), `Homepage Full misses layout marker: ${marker}`);

  const sectionKeys = [
    "hero",
    "routes",
    "objects",
    "apartments",
    "consultation-outcomes",
    "consultation-process",
    "purchase-steps",
    "purchase-methods",
    "useful-resources",
    "faq",
    "lead",
    "footer"
  ];
  for (const key of sectionKeys) {
    assert(code.includes(`"${key}"`), `Homepage Full misses section key: ${key}`);
  }

  for (const marker of [
    "Новостройки Борисоглебска",
    "Выберите свою задачу",
    "Выберите интересующий объект",
    "Квартиры в новостройках Борисоглебска",
    "Что решим за один разговор",
    "От вопроса к понятному следующему шагу",
    "Как купить квартиру в новостройке Борисоглебска",
    "Способы покупки",
    "Полезные разделы",
    "О покупке квартиры в новостройке",
    "Расскажите, что важно при покупке",
    "не является официальным сайтом застройщика",
    "Просторная 4А",
    "Аэродромная 18Г",
    "Сенная 76",
    "Получить консультацию"
  ]) assert(code.includes(marker), `Homepage Full misses production content: ${marker}`);

  for (const marker of [
    "homepage_quick_consultation",
    "homepage_priority_selection",
    "portal_selection",
    "Портал Новостройки Борисоглебска",
    "primary-route",
    "secondary-route"
  ]) assert(code.includes(marker), `Homepage Full misses route/form metadata: ${marker}`);

  for (const prohibited of [
    "Забронировать квартиру",
    "Зафиксировать цену",
    "Гарантированное одобрение",
    "Квартира в наличии",
    "Официальный сайт застройщика"
  ]) assert(!code.includes(prohibited), `Homepage Full contains prohibited promise: ${prohibited}`);

  validateGeneratedSyntax(code, "homepage-full");
}

if (fs.existsSync(footerDocsPath)) {
  const docs = fs.readFileSync(footerDocsPath, "utf8");
  for (const marker of [
    "24 Component · Site Footer",
    "Layout=Desktop",
    "Layout=Mobile",
    "Brand / Context=Dark",
    "Tagline",
    "Phone",
    "Disclaimer",
    "Links",
    "phone-route",
    "sources-route",
    "privacy-route",
    "contacts-route",
    "Figma.use_figma",
    "Visual QA",
    "issue №116"
  ]) assert(docs.includes(marker), `Site Footer documentation misses: ${marker}`);
}

if (fs.existsSync(fullDocsPath)) {
  const docs = fs.readFileSync(fullDocsPath, "utf8");
  for (const marker of [
    "25 Screen · Homepage Full",
    "Homepage Full / Desktop",
    "Homepage Full / Mobile",
    "12 смысловых секций",
    "Top Navigation",
    "Project Card",
    "Content Card",
    "Step Card",
    "Link Card",
    "FAQ Accordion",
    "Site Footer",
    "homepage_priority_selection",
    "resource:figma-generate-design",
    "Visual QA",
    "issue №116"
  ]) assert(docs.includes(marker), `Homepage Full documentation misses: ${marker}`);
}

if (errors.length) {
  console.error(`Figma homepage full validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Figma homepage full handoff validation passed.");
