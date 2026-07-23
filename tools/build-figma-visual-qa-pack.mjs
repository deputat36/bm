import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputArg = process.argv[2];
const OUTPUT_DIR = outputArg
  ? path.resolve(process.cwd(), outputArg)
  : path.join(ROOT, "build/figma-visual-qa-pack");

const FILE_KEY = "rhFYa5gPDhF009hZsfEGSX";
const SKILLS = "resource:figma-use";

const componentAudits = [
  ["button", "05 Component · Button", "Button", 16],
  ["verification-status", "06 Component · Verification Status", "Verification Status", 4],
  ["form-field", "07 Component · Form Field", "Form Field", 27],
  ["faq-accordion", "08 Component · FAQ Accordion", "FAQ Accordion", 4],
  ["brand", "09 Component · Brand", "Brand", 4],
  ["top-navigation", "10 Component · Top Navigation", "Top Navigation", 14],
  ["project-card", "11 Component · Project Card", "Project Card", 8],
  ["fact-card", "12 Component · Fact Card", "Fact Card", 4],
  ["lead-form-card", "13 Component · Lead Form Card", "Lead Form Card", 4],
  ["scenario-card", "15 Component · Scenario Card", "Scenario Card", 12],
  ["content-card", "17 Component · Content Card", "Content Card", 8],
  ["step-card", "19 Component · Step Card", "Step Card", 8],
  ["link-card", "21 Component · Link Card", "Link Card", 4],
  ["site-footer", "24 Component · Site Footer", "Site Footer", 2]
].map(([id, page, componentSet, expectedVariants]) => ({
  id,
  phase: "components",
  page,
  componentSet,
  expectedVariants,
  expectedScreenKeys: [],
  expectedSectionKeys: [],
  screenshotMaxDimension: 2600
}));

const screenAudits = [
  {
    id: "homepage-hero",
    page: "14 Screen · Homepage Hero",
    expectedScreenKeys: ["homepage-hero-desktop", "homepage-hero-mobile"],
    screenshotMaxDimension: 4096
  },
  {
    id: "homepage-start-objects",
    page: "16 Screen · Homepage Start & Objects",
    expectedScreenKeys: ["homepage-start-objects-desktop", "homepage-start-objects-mobile"],
    screenshotMaxDimension: 4096
  },
  {
    id: "homepage-apartments-outcomes",
    page: "18 Screen · Homepage Apartments & Outcomes",
    expectedScreenKeys: ["homepage-apartments-outcomes-desktop", "homepage-apartments-outcomes-mobile"],
    screenshotMaxDimension: 4096
  },
  {
    id: "homepage-process-purchase",
    page: "20 Screen · Homepage Process & Purchase",
    expectedScreenKeys: ["homepage-process-purchase-desktop", "homepage-process-purchase-mobile"],
    screenshotMaxDimension: 4096
  },
  {
    id: "homepage-purchase-resources",
    page: "22 Screen · Homepage Purchase & Resources",
    expectedScreenKeys: ["homepage-purchase-resources-desktop", "homepage-purchase-resources-mobile"],
    screenshotMaxDimension: 4096
  },
  {
    id: "homepage-faq-lead",
    page: "23 Screen · Homepage FAQ & Lead",
    expectedScreenKeys: ["homepage-faq-lead-desktop", "homepage-faq-lead-mobile"],
    screenshotMaxDimension: 6144
  },
  {
    id: "catalog",
    page: "26 Screen · Catalog",
    expectedScreenKeys: ["catalog-desktop", "catalog-mobile"],
    expectedSectionKeys: [
      "header",
      "hero",
      "catalog-navigator",
      "questions",
      "quiz",
      "priority",
      "reference",
      "lead",
      "footer"
    ],
    screenshotMaxDimension: 12000
  },
  {
    id: "project-detail",
    page: "27 Screen · Project Detail",
    expectedScreenKeys: [
      "project-detail-prostornaya-4a-desktop",
      "project-detail-prostornaya-4a-mobile",
      "project-detail-aerodromnaya-18g-desktop",
      "project-detail-aerodromnaya-18g-mobile",
      "project-detail-sennaya-76-desktop",
      "project-detail-sennaya-76-mobile"
    ],
    expectedSectionKeys: [
      "header",
      "hero",
      "highlights",
      "evidence",
      "verification",
      "faq",
      "lead",
      "footer"
    ],
    screenshotMaxDimension: 16000
  },
  {
    id: "homepage-full",
    page: "25 Screen · Homepage Full",
    expectedScreenKeys: ["homepage-full-desktop", "homepage-full-mobile"],
    expectedSectionKeys: [
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
    ],
    screenshotMaxDimension: 12000
  }
].map((item) => ({
  ...item,
  phase: "screens",
  componentSet: null,
  expectedVariants: null,
  expectedSectionKeys: item.expectedSectionKeys || []
}));

const expectedComponentSets = componentAudits.map((item) => ({
  name: item.componentSet,
  variants: item.expectedVariants
}));

function globalAuditCode() {
  const expected = {
    collections: [
      "01 Primitives · Color",
      "02 Semantic · Color",
      "03 Dimensions · Spacing",
      "04 Dimensions · Radius"
    ],
    variableCount: 53,
    textStyles: [
      "Typography/Display",
      "Typography/H1",
      "Typography/H2",
      "Typography/H3",
      "Typography/Body Large",
      "Typography/Body",
      "Typography/Label",
      "Typography/Brand"
    ],
    effectStyles: [
      "Effects/Card",
      "Effects/Card Hover",
      "Effects/Floating",
      "Effects/Focus",
      "Effects/Brand Mark",
      "Effects/Header"
    ],
    componentSets: expectedComponentSets,
    variantTotal: 119
  };

  return `const EXPECTED = ${JSON.stringify(expected)};
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const variables = await figma.variables.getLocalVariablesAsync();
const textStyles = await figma.getLocalTextStylesAsync();
const effectStyles = await figma.getLocalEffectStylesAsync();
const components = await figma.getLocalComponentsAsync();
const errors = [];
const warnings = [];
const expectedCollections = collections.filter((item) => EXPECTED.collections.includes(item.name));
for (const name of EXPECTED.collections) {
  if (!collections.some((item) => item.name === name)) errors.push("Missing variable collection: " + name);
}
const expectedCollectionIds = new Set(expectedCollections.map((item) => item.id));
const expectedVariables = variables.filter((item) => expectedCollectionIds.has(item.variableCollectionId));
if (expectedVariables.length !== EXPECTED.variableCount) {
  errors.push("Expected " + EXPECTED.variableCount + " variables in Portal v2 collections, found " + expectedVariables.length);
}
for (const name of EXPECTED.textStyles) {
  if (!textStyles.some((item) => item.name === name)) errors.push("Missing text style: " + name);
}
for (const name of EXPECTED.effectStyles) {
  if (!effectStyles.some((item) => item.name === name)) errors.push("Missing effect style: " + name);
}
const setsById = new Map();
for (const component of components) {
  const parent = component.parent;
  if (parent && parent.type === "COMPONENT_SET" && EXPECTED.componentSets.some((item) => item.name === parent.name)) {
    if (!setsById.has(parent.id)) setsById.set(parent.id, { id: parent.id, name: parent.name, variants: 0 });
    setsById.get(parent.id).variants += 1;
  }
}
const componentSets = Array.from(setsById.values()).sort((a, b) => a.name.localeCompare(b.name));
for (const expectedSet of EXPECTED.componentSets) {
  const actual = componentSets.find((item) => item.name === expectedSet.name);
  if (!actual) errors.push("Missing component set: " + expectedSet.name);
  else if (actual.variants !== expectedSet.variants) errors.push("Component set " + expectedSet.name + " expected " + expectedSet.variants + " variants, found " + actual.variants);
}
const variantTotal = componentSets.reduce((sum, item) => sum + item.variants, 0);
if (variantTotal !== EXPECTED.variantTotal) errors.push("Expected " + EXPECTED.variantTotal + " variants, found " + variantTotal);
if (collections.length > EXPECTED.collections.length) warnings.push("File contains additional variable collections outside Portal v2");
return {
  auditId: "portal-v2-global-audit-v1",
  fileKey: figma.fileKey || null,
  ok: errors.length === 0,
  errors,
  warnings,
  collections: expectedCollections.map((item) => ({ id: item.id, name: item.name, modes: item.modes.map((mode) => mode.name) })),
  variables: { expectedPortalVariables: EXPECTED.variableCount, actualPortalVariables: expectedVariables.length },
  textStyles: EXPECTED.textStyles.map((name) => ({ name, id: (textStyles.find((item) => item.name === name) || {}).id || null })),
  effectStyles: EXPECTED.effectStyles.map((name) => ({ name, id: (effectStyles.find((item) => item.name === name) || {}).id || null })),
  componentSets,
  totals: { collections: expectedCollections.length, variables: expectedVariables.length, textStyles: EXPECTED.textStyles.length, effectStyles: EXPECTED.effectStyles.length, componentSets: componentSets.length, variants: variantTotal }
};`;
}

function pageAuditCode(config) {
  const payload = {
    pageName: config.page,
    phase: config.phase,
    componentSet: config.componentSet,
    expectedVariants: config.expectedVariants,
    expectedScreenKeys: config.expectedScreenKeys,
    expectedSectionKeys: config.expectedSectionKeys
  };

  return `const CONFIG = ${JSON.stringify(payload)};
const page = figma.root.children.find((item) => item.name === CONFIG.pageName);
if (!page) return { auditId: "portal-v2-page-audit-v1", ok: false, pageName: CONFIG.pageName, errors: ["Missing page: " + CONFIG.pageName], warnings: [] };
await figma.setCurrentPageAsync(page);
const nodes = page.findAll();
const errors = [];
const warnings = [];
function shared(node, key) {
  try { return node.getSharedPluginData("portal-v2", key) || ""; }
  catch { return ""; }
}
function dimensions(node) {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    width: typeof node.width === "number" ? node.width : null,
    height: typeof node.height === "number" ? node.height : null,
    x: typeof node.x === "number" ? node.x : null,
    y: typeof node.y === "number" ? node.y : null
  };
}
const roots = page.children.filter((node) => shared(node, "component-key"));
if (roots.length !== 1) errors.push("Expected exactly one generated root, found " + roots.length);
const componentSets = nodes.filter((node) => node.type === "COMPONENT_SET").map((node) => ({
  ...dimensions(node),
  variants: node.children.filter((child) => child.type === "COMPONENT").length,
  description: node.description || ""
}));
let expectedComponentSet = null;
if (CONFIG.componentSet) {
  expectedComponentSet = componentSets.find((item) => item.name === CONFIG.componentSet) || null;
  if (!expectedComponentSet) errors.push("Missing component set: " + CONFIG.componentSet);
  else if (expectedComponentSet.variants !== CONFIG.expectedVariants) errors.push("Expected " + CONFIG.expectedVariants + " variants in " + CONFIG.componentSet + ", found " + expectedComponentSet.variants);
}
const screenNodes = nodes.filter((node) => shared(node, "screen-key")).map((node) => ({
  ...dimensions(node),
  screenKey: shared(node, "screen-key"),
  source: shared(node, "source")
}));
for (const key of CONFIG.expectedScreenKeys) {
  if (!screenNodes.some((item) => item.screenKey === key)) errors.push("Missing screen-key: " + key);
}
const sectionNodes = nodes.filter((node) => shared(node, "section-key")).map((node) => ({
  ...dimensions(node),
  sectionKey: shared(node, "section-key")
}));
for (const key of CONFIG.expectedSectionKeys) {
  if (!sectionNodes.some((item) => item.sectionKey === key)) errors.push("Missing section-key: " + key);
}
const missingFonts = nodes.filter((node) => node.type === "TEXT" && node.hasMissingFont).map(dimensions);
if (missingFonts.length) warnings.push("Text nodes with missing fonts: " + missingFonts.length);
const detachedInstances = nodes.filter((node) => node.type === "INSTANCE" && !node.mainComponent).map(dimensions);
if (detachedInstances.length) warnings.push("Detached instances: " + detachedInstances.length);
const overflowCandidates = [];
for (const node of nodes) {
  const parent = node.parent;
  if (!parent || parent.type === "PAGE" || parent.clipsContent !== true) continue;
  if (typeof node.x !== "number" || typeof node.y !== "number" || typeof node.width !== "number" || typeof node.height !== "number") continue;
  if (typeof parent.width !== "number" || typeof parent.height !== "number") continue;
  const outside = node.x < -0.5 || node.y < -0.5 || node.x + node.width > parent.width + 0.5 || node.y + node.height > parent.height + 0.5;
  if (outside) overflowCandidates.push({ ...dimensions(node), parentId: parent.id, parentName: parent.name, parentWidth: parent.width, parentHeight: parent.height });
}
if (overflowCandidates.length) warnings.push("Potential clipped overflow nodes: " + overflowCandidates.length);
const routeNodes = nodes.filter((node) => shared(node, "route") || shared(node, "primary-route") || shared(node, "secondary-route")).map((node) => ({
  id: node.id,
  name: node.name,
  route: shared(node, "route"),
  primaryRoute: shared(node, "primary-route"),
  secondaryRoute: shared(node, "secondary-route")
}));
const formNodes = nodes.filter((node) => shared(node, "form-id") || shared(node, "lead-type") || shared(node, "project")).map((node) => ({
  id: node.id,
  name: node.name,
  formId: shared(node, "form-id"),
  leadType: shared(node, "lead-type"),
  project: shared(node, "project")
}));
const screenshotTargets = CONFIG.componentSet
  ? componentSets.filter((item) => item.name === CONFIG.componentSet)
  : screenNodes.filter((item) => CONFIG.expectedScreenKeys.includes(item.screenKey));
return {
  auditId: "portal-v2-page-audit-v1",
  fileKey: figma.fileKey || null,
  ok: errors.length === 0,
  errors,
  warnings,
  page: { id: page.id, name: page.name },
  roots: roots.map((node) => ({ ...dimensions(node), componentKey: shared(node, "component-key"), runId: shared(node, "run-id") })),
  counts: {
    nodes: nodes.length,
    components: nodes.filter((node) => node.type === "COMPONENT").length,
    componentSets: componentSets.length,
    instances: nodes.filter((node) => node.type === "INSTANCE").length,
    textNodes: nodes.filter((node) => node.type === "TEXT").length,
    screenNodes: screenNodes.length,
    sectionNodes: sectionNodes.length,
    routeNodes: routeNodes.length,
    formNodes: formNodes.length
  },
  componentSets,
  expectedComponentSet,
  screenNodes,
  sectionNodes,
  routeNodes,
  formNodes,
  missingFonts: missingFonts.slice(0, 50),
  detachedInstances: detachedInstances.slice(0, 50),
  overflowCandidates: overflowCandidates.slice(0, 100),
  screenshotTargets
};`;
}

const audits = [
  {
    id: "global-foundations-components",
    phase: "global",
    title: "Global foundations and component inventory",
    page: null,
    code: globalAuditCode(),
    screenshotTargets: []
  },
  ...componentAudits.map((config) => ({
    id: config.id,
    phase: config.phase,
    title: config.page,
    page: config.page,
    code: pageAuditCode(config),
    componentSet: config.componentSet,
    expectedVariants: config.expectedVariants,
    expectedScreenKeys: [],
    expectedSectionKeys: [],
    screenshotMaxDimension: config.screenshotMaxDimension,
    screenshotTargets: [{ type: "component-set", name: config.componentSet, maxDimension: config.screenshotMaxDimension }]
  })),
  ...screenAudits.map((config) => ({
    id: config.id,
    phase: config.phase,
    title: config.page,
    page: config.page,
    code: pageAuditCode(config),
    componentSet: null,
    expectedVariants: null,
    expectedScreenKeys: config.expectedScreenKeys,
    expectedSectionKeys: config.expectedSectionKeys,
    screenshotMaxDimension: config.screenshotMaxDimension,
    screenshotTargets: config.expectedScreenKeys.map((screenKey) => ({ type: "screen", screenKey, maxDimension: config.screenshotMaxDimension }))
  }))
];

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const builtAt = new Date().toISOString();
const manifestAudits = [];
for (let index = 0; index < audits.length; index += 1) {
  const audit = audits[index];
  const order = index + 1;
  const fileName = `${String(order).padStart(2, "0")}-${audit.id}.js`;
  const sha256 = crypto.createHash("sha256").update(audit.code, "utf8").digest("hex");
  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), audit.code, "utf8");
  manifestAudits.push({
    order,
    id: audit.id,
    phase: audit.phase,
    title: audit.title,
    page: audit.page,
    file: fileName,
    bytes: Buffer.byteLength(audit.code, "utf8"),
    characters: audit.code.length,
    sha256,
    skillNames: SKILLS,
    readOnly: true,
    componentSet: audit.componentSet || null,
    expectedVariants: audit.expectedVariants ?? null,
    expectedScreenKeys: audit.expectedScreenKeys || [],
    expectedSectionKeys: audit.expectedSectionKeys || [],
    screenshotTargets: audit.screenshotTargets || []
  });
}

const manifest = {
  schemaVersion: "1.0",
  designSystem: "Portal v2 · Городской навигатор",
  figmaFileKey: FILE_KEY,
  figmaFileUrl: `https://www.figma.com/design/${FILE_KEY}`,
  builtAt,
  auditCount: manifestAudits.length,
  executionMode: "one read-only Figma.use_figma call per numbered JavaScript file",
  constraints: {
    maxCharactersPerCall: 50000,
    maxPageSwitchesPerCall: 1,
    stopOnError: false,
    preserveOrder: true,
    noCanvasMutation: true
  },
  expectedTotals: {
    variableCollections: 4,
    variables: 53,
    textStyles: 8,
    effectStyles: 6,
    componentSets: 14,
    variants: 119,
    componentPageAudits: componentAudits.length,
    screenPageAudits: screenAudits.length
  },
  audits: manifestAudits
};

const ledger = {
  schemaVersion: "1.0",
  figmaFileKey: FILE_KEY,
  executionPackCommit: null,
  startedAt: null,
  completedAt: null,
  operator: null,
  globalStatus: "not_started",
  audits: manifestAudits.map((item) => ({
    order: item.order,
    id: item.id,
    page: item.page,
    status: "not_started",
    executedAt: null,
    resultFile: null,
    ok: null,
    errors: [],
    warnings: [],
    pageId: null,
    rootIds: [],
    screenshotTargets: item.screenshotTargets.map((target) => ({ ...target, nodeId: null, screenshotFile: null, status: "not_started" }))
  }))
};

const readme = `# Figma Visual QA Pack\n\n` +
  `Файл: https://www.figma.com/design/${FILE_KEY}\n\n` +
  `Пакет содержит ${manifestAudits.length} read-only audit payload-файла: один глобальный, ${componentAudits.length} компонентных и ${screenAudits.length} экранных.\n\n` +
  `## Порядок\n\n` +
  `1. Сначала полностью выполнить Figma Execution Pack.\n` +
  `2. Затем запускать файлы этого пакета по номеру через Figma.use_figma.\n` +
  `3. Сохранять каждый JSON-ответ рядом с ledger.\n` +
  `4. Для screenshotTargets использовать возвращённые node IDs и Figma.get_screenshot.\n` +
  `5. Не продолжать к публикации дизайна при errors, missing fonts, detached instances или реальном clipped overflow.\n\n` +
  `Все audit payload-файлы read-only и не создают, не удаляют и не изменяют canvas nodes.\n`;

fs.writeFileSync(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(OUTPUT_DIR, "ledger.template.json"), JSON.stringify(ledger, null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(OUTPUT_DIR, "README.md"), readme, "utf8");

console.log(`Built ${manifestAudits.length} Figma Visual QA payloads in ${path.relative(ROOT, OUTPUT_DIR)}`);
console.log(`Component audits: ${componentAudits.length}; screen audits: ${screenAudits.length}`);
