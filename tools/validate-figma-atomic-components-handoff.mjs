import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = path.join(ROOT, "tools/figma/portal-v2-component-runtime.mjs");
const target = process.argv[2] || "all";
const section = process.argv[3] || "all";
const allowedSections = new Set(["all", "generation", "api", "variants", "tokens", "syntax"]);

const generators = [
  {
    id: "button",
    path: "tools/figma/generate-portal-v2-button-components.mjs",
    page: "05 Component · Button",
    componentSet: "Button",
    variantMarkers: [
      "const contexts = [\"Light\", \"Hero\"]",
      "const types = [\"Primary\", \"Secondary\"]",
      "const states = [\"Default\", \"Hover\", \"Focus\", \"Disabled\"]"
    ],
    expectedVariantCount: 16,
    tokens: ["action/primary", "action/primary/hover", "action/secondary", "background/hero", "surface/primary", "text/inverse", "Effects/Focus"]
  },
  {
    id: "status",
    path: "tools/figma/generate-portal-v2-verification-status-components.mjs",
    page: "06 Component · Verification Status",
    componentSet: "Verification Status",
    variantMarkers: [
      "for (const tone of [\"Verified\", \"Pending\"])",
      "for (const layout of [\"Compact\", \"Card\"])"
    ],
    expectedVariantCount: 4,
    tokens: ["status/verified", "status/pending", "sage/100", "amber/100"]
  },
  {
    id: "field",
    path: "tools/figma/generate-portal-v2-form-field-components.mjs",
    page: "07 Component · Form Field",
    componentSet: "Form Field",
    variantMarkers: [
      "for (const size of [\"Wide\", \"Compact\", \"Mobile\"])",
      "for (const controlType of [\"Input\", \"Select\", \"Textarea\"])",
      "for (const state of [\"Default\", \"Focus\", \"Disabled\"])"
    ],
    expectedVariantCount: 27,
    tokens: ["surface/primary", "border/default", "focus/ring", "background/soft", "Effects/Focus"]
  },
  {
    id: "faq",
    path: "tools/figma/generate-portal-v2-faq-accordion-components.mjs",
    page: "08 Component · FAQ Accordion",
    componentSet: "FAQ Accordion",
    variantMarkers: [
      "for (const size of [\"Desktop\", \"Mobile\"])",
      "for (const state of [\"Closed\", \"Open\"])"
    ],
    expectedVariantCount: 4,
    tokens: ["surface/primary", "border/default", "border/strong", "status/verified", "amber/100", "Effects/Card", "Effects/Card Hover"]
  },
  {
    id: "brand",
    path: "tools/figma/generate-portal-v2-brand-components.mjs",
    page: "09 Component · Brand",
    componentSet: "Brand",
    variantMarkers: [
      "for (const context of [\"Light\", \"Dark\"])",
      "for (const size of [\"Desktop\", \"Mobile\"])"
    ],
    expectedVariantCount: 4,
    tokens: ["text/primary", "text/inverse", "Typography/Brand", "Effects/Brand Mark"]
  },
  {
    id: "navigation",
    path: "tools/figma/generate-portal-v2-top-navigation-components.mjs",
    page: "10 Component · Top Navigation",
    componentSet: "Top Navigation",
    variantMarkers: [
      "for (const layout of [\"Desktop\", \"Mobile\"])",
      "const activePages = [\"None\", \"Catalog\", \"Developers\", \"Mortgage\", \"Guide\", \"News\", \"Contacts\"]"
    ],
    expectedVariantCount: 14,
    tokens: ["surface/primary", "background/soft", "border/default", "Typography/Label", "Effects/Header"],
    apiMarkers: ["getLocalComponentsAsync", ".createInstance()", "componentProperties", "setProperties(", "Context=Light"]
  },
  {
    id: "project",
    path: "tools/figma/generate-portal-v2-project-card-components.mjs",
    page: "11 Component · Project Card",
    componentSet: "Project Card",
    variantMarkers: [
      "for (const layout of [\"Desktop\", \"Mobile\"])",
      "for (const verification of [\"Verified\", \"Pending\"])",
      "for (const state of [\"Default\", \"Hover\"])"
    ],
    expectedVariantCount: 8,
    tokens: ["surface/primary", "border/default", "border/strong", "status/verified", "text/primary", "text/muted", "Effects/Card", "Effects/Card Hover"],
    apiMarkers: ["getLocalComponentsAsync", ".createInstance()", "Verification Status", "Button", "Context=Light", "Оставить заявку"]
  },
  {
    id: "fact",
    path: "tools/figma/generate-portal-v2-fact-card-components.mjs",
    page: "12 Component · Fact Card",
    componentSet: "Fact Card",
    variantMarkers: [
      "for (const context of [\"Light\", \"Hero\"])",
      "for (const size of [\"Desktop\", \"Mobile\"])"
    ],
    expectedVariantCount: 4,
    tokens: ["surface/primary", "surface/emphasis", "border/default", "border/strong", "action/primary", "coral/100", "text/body", "text/inverse", "Effects/Card"]
  },
  {
    id: "lead",
    path: "tools/figma/generate-portal-v2-lead-form-card-components.mjs",
    page: "13 Component · Lead Form Card",
    componentSet: "Lead Form Card",
    variantMarkers: [
      "for (const layout of [\"Desktop\", \"Mobile\"])",
      "for (const scope of [\"Quick\", \"Detailed\"])"
    ],
    expectedVariantCount: 4,
    tokens: ["surface/primary", "border/default", "border/strong", "action/primary/hover", "coral/100", "text/primary", "text/muted", "Effects/Floating", "Effects/Card"],
    apiMarkers: ["getLocalComponentsAsync", ".createInstance()", "Form Field", "Button", "Consent text", "Show footer note", "Context=Light"]
  },
  {
    id: "scenario",
    path: "tools/figma/generate-portal-v2-scenario-card-components.mjs",
    page: "15 Component · Scenario Card",
    componentSet: "Scenario Card",
    variantMarkers: [
      "for (const layout of [\"Desktop\", \"Mobile\"])",
      "const intents = [\"Object\", \"Selection\", \"Mortgage\"]",
      "for (const state of [\"Default\", \"Hover\"])"
    ],
    expectedVariantCount: 12,
    tokens: ["surface/primary", "border/default", "border/strong", "text/primary", "text/muted", "Effects/Card", "Effects/Card Hover"],
    apiMarkers: ["getLocalComponentsAsync", ".createInstance()", "Button", "Context=Light", "Show action"]
  },
  {
    id: "content",
    path: "tools/figma/generate-portal-v2-content-card-components.mjs",
    page: "17 Component · Content Card",
    componentSet: "Content Card",
    variantMarkers: [
      "for (const layout of [\"Desktop\", \"Mobile\"])",
      "for (const purpose of [\"Selection\", \"Outcome\"])",
      "for (const state of [\"Default\", \"Hover\"])"
    ],
    expectedVariantCount: 8,
    tokens: ["surface/primary", "border/default", "border/strong", "status/verified", "amber/500", "text/primary", "text/muted", "Effects/Card", "Effects/Card Hover"],
    apiMarkers: ["getLocalComponentsAsync", ".createInstance()", "Button", "Context=Light", "Show action", "isExposedInstance"]
  },
  {
    id: "step",
    path: "tools/figma/generate-portal-v2-step-card-components.mjs",
    page: "19 Component · Step Card",
    componentSet: "Step Card",
    variantMarkers: [
      "for (const layout of [\"Desktop\", \"Mobile\"])",
      "for (const grid of [\"Three\", \"Four\"])",
      "for (const state of [\"Default\", \"Hover\"])"
    ],
    expectedVariantCount: 8,
    tokens: ["surface/primary", "border/default", "border/strong", "coral/100", "action/primary", "action/primary/hover", "text/primary", "text/muted", "Effects/Card", "Effects/Card Hover"],
    apiMarkers: ["Step label", "Show step label", "componentPropertyReferences"]
  }
];

const allowedTargets = new Set(["all", "runtime", "docs", ...generators.map((item) => item.id)]);
if (!allowedTargets.has(target)) {
  console.error(`Unknown validation target: ${target}`);
  process.exit(2);
}
if (!allowedSections.has(section)) {
  console.error(`Unknown validation section: ${section}`);
  process.exit(2);
}

const errors = [];
function assert(condition, message) {
  if (!condition) errors.push(message);
}
function inSection(name) {
  return section === "all" || section === name;
}

function validateRuntime() {
  const runtime = fs.readFileSync(runtimePath, "utf8");
  for (const marker of [
    "figma.createComponent()",
    "figma.combineAsVariants",
    "figma.variables.setBoundVariableForPaint",
    "node.setBoundVariable",
    "addComponentProperty",
    "componentPropertyReferences",
    "setSharedPluginData"
  ]) assert(runtime.includes(marker), `Runtime misses: ${marker}`);
}

const disallowed = [
  "figma.notify(",
  "figma.closePlugin(",
  "figma.currentPage =",
  "loadAllPagesAsync",
  ".getPluginData(",
  ".setPluginData("
];

function generateCode(definition) {
  const absolute = path.join(ROOT, definition.path);
  assert(fs.existsSync(absolute), `Missing generator: ${definition.path}`);
  if (!fs.existsSync(absolute)) return "";
  const run = spawnSync(process.execPath, [absolute], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  assert(run.status === 0, `${definition.path} failed to generate code: ${run.stderr.trim()}`);
  return run.stdout || "";
}

function validateGenerator(definition) {
  const code = generateCode(definition);
  if (!code) return;

  if (inSection("generation")) {
    assert(code.length <= 50000, `${definition.path} exceeds Figma.use_figma 50,000 character limit`);
    assert(code.includes(definition.page), `${definition.path} has wrong page name`);
    assert(code.includes(`combine(variants, stage, "${definition.componentSet}")`), `${definition.path} has wrong component set name`);
    assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, `${definition.path} must switch page exactly once`);
    assert(!/#[0-9a-f]{3,8}\b/i.test(code), `${definition.path} contains hardcoded HEX`);
    for (const pattern of disallowed) assert(!code.includes(pattern), `${definition.path} uses unsupported API: ${pattern}`);
  }

  if (inSection("api")) {
    for (const marker of [
      "figma.createComponent()",
      "figma.combineAsVariants",
      "addComponentProperty",
      "componentPropertyReferences",
      "setSharedPluginData",
      "figma.variables.setBoundVariableForPaint",
      "setBoundVariable"
    ]) assert(code.includes(marker), `${definition.path} misses API marker ${marker}`);
    for (const marker of definition.apiMarkers || []) assert(code.includes(marker), `${definition.path} misses dependency API marker ${marker}`);
  }

  if (inSection("variants")) {
    for (const marker of definition.variantMarkers) assert(code.includes(marker), `${definition.path} misses variant axis marker ${marker}`);
  }

  if (inSection("tokens")) {
    for (const token of definition.tokens) assert(code.includes(token), `${definition.path} misses token ${token}`);
  }

  if (inSection("syntax")) {
    const tempFile = path.join(os.tmpdir(), `portal-v2-${definition.id}-${process.pid}.mjs`);
    fs.writeFileSync(tempFile, `async function __figmaUseWrapper() {\n${code}\n}\n`, "utf8");
    const syntax = spawnSync(process.execPath, ["--check", tempFile], { encoding: "utf8" });
    fs.rmSync(tempFile, { force: true });
    assert(syntax.status === 0, `${definition.path} generated invalid JavaScript: ${syntax.stderr.trim()}`);
  }
}

function validateDocs() {
  const docsPaths = [
    "docs/design/FIGMA_ATOMIC_COMPONENTS_HANDOFF.md",
    "docs/design/FIGMA_FACT_CARD_HANDOFF.md",
    "docs/design/FIGMA_LEAD_FORM_CARD_HANDOFF.md",
    "docs/design/FIGMA_SCENARIO_CARD_HANDOFF.md",
    "docs/design/FIGMA_CONTENT_CARD_HANDOFF.md",
    "docs/design/FIGMA_STEP_CARD_HANDOFF.md"
  ];
  for (const item of docsPaths) assert(fs.existsSync(path.join(ROOT, item)), `Missing documentation: ${item}`);
  if (docsPaths.some((item) => !fs.existsSync(path.join(ROOT, item)))) return;
  const docs = docsPaths.map((item) => fs.readFileSync(path.join(ROOT, item), "utf8")).join("\n");
  for (const required of [
    "05 Component · Button",
    "06 Component · Verification Status",
    "07 Component · Form Field",
    "08 Component · FAQ Accordion",
    "09 Component · Brand",
    "10 Component · Top Navigation",
    "11 Component · Project Card",
    "12 Component · Fact Card",
    "13 Component · Lead Form Card",
    "15 Component · Scenario Card",
    "17 Component · Content Card",
    "19 Component · Step Card",
    "113 вариантов",
    "12 ComponentSet",
    "обязательное согласие",
    "Context: `Light`, `Hero`",
    "exposed instance",
    "Show step label",
    "Оставить заявку",
    "Figma.use_figma",
    "Visual QA",
    "issue №116"
  ]) assert(docs.includes(required), `Documentation misses: ${required}`);
}

if (target === "all" || target === "runtime") validateRuntime();
for (const definition of generators) {
  if (target === "all" || target === definition.id) validateGenerator(definition);
}
if (target === "all" || target === "docs") validateDocs();
if (target === "all") {
  assert(generators.reduce((sum, item) => sum + item.expectedVariantCount, 0) === 113, "Expected 113 variants");
}

if (errors.length) {
  console.error(`Figma atomic components validation failed for ${target}/${section}:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`Figma atomic components validation passed for ${target}/${section}.`);
