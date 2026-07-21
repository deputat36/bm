import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = path.join(ROOT, "tools/figma/portal-v2-component-runtime.mjs");
const target = process.argv[2] || "all";
const section = process.argv[3] || "all";
const allowedTargets = new Set(["all", "runtime", "button", "status", "field", "faq", "brand", "navigation", "project", "fact", "lead", "docs"]);
const allowedSections = new Set(["all", "generation", "api", "variants", "tokens", "syntax"]);
if (!allowedTargets.has(target)) {
  console.error(`Unknown validation target: ${target}`);
  process.exit(2);
}
if (!allowedSections.has(section)) {
  console.error(`Unknown validation section: ${section}`);
  process.exit(2);
}

const generators = [
  {
    id: "button",
    path: "tools/figma/generate-portal-v2-button-components.mjs",
    page: "05 Component · Button",
    componentSet: "Button",
    variantMarkers: [
      "const types = [\"Primary\", \"Secondary\"]",
      "const states = [\"Default\", \"Hover\", \"Focus\", \"Disabled\"]"
    ],
    expectedVariantCount: 8,
    tokens: ["action/primary", "action/primary/hover", "action/secondary", "Effects/Focus"]
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
    apiMarkers: ["getLocalComponentsAsync", ".createInstance()", "componentProperties", "setProperties("]
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
    apiMarkers: ["getLocalComponentsAsync", ".createInstance()", "componentProperties", "setProperties(", "Verification Status", "Button"]
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
    apiMarkers: ["getLocalComponentsAsync", ".createInstance()", "componentProperties", "setProperties(", "Form Field", "Button", "Consent text", "Show footer note"]
  }
];

const errors = [];
function assert(condition, message) {
  if (!condition) errors.push(message);
}
function inSection(name) {
  return section === "all" || section === name;
}

function validateRuntime() {
  const runtime = fs.readFileSync(runtimePath, "utf8");
  assert(runtime.includes("figma.createComponent()"), "Runtime must create real ComponentNode objects");
  assert(runtime.includes("figma.combineAsVariants"), "Runtime must combine variants into ComponentSetNode");
  assert(runtime.includes("figma.variables.setBoundVariableForPaint"), "Runtime must bind paints to variables");
  assert(runtime.includes("node.setBoundVariable"), "Runtime must bind dimensions to variables");
  assert(runtime.includes("addComponentProperty"), "Runtime must expose component properties");
  assert(runtime.includes("componentPropertyReferences"), "Runtime must connect properties to child nodes");
  assert(runtime.includes("setSharedPluginData"), "Runtime must tag generated nodes for idempotency");
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
    assert(code.includes("figma.createComponent()"), `${definition.path} does not create ComponentNode`);
    assert(code.includes("figma.combineAsVariants"), `${definition.path} does not create variants`);
    assert(code.includes("addComponentProperty"), `${definition.path} does not expose component properties`);
    assert(code.includes("componentPropertyReferences"), `${definition.path} does not bind component properties`);
    assert(code.includes("setSharedPluginData"), `${definition.path} is not idempotently tagged`);
    assert(code.includes("figma.variables.setBoundVariableForPaint"), `${definition.path} has no paint variable bindings`);
    assert(code.includes("setBoundVariable"), `${definition.path} has no dimension variable bindings`);
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
    "docs/design/FIGMA_LEAD_FORM_CARD_HANDOFF.md"
  ];
  const workflowPath = path.join(ROOT, ".github/workflows/figma-atomic-components-handoff.yml");
  for (const item of docsPaths) assert(fs.existsSync(path.join(ROOT, item)), `Missing documentation: ${item}`);
  assert(fs.existsSync(workflowPath), "Missing atomic components handoff workflow");
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
    "27 вариантов",
    "77 вариантов",
    "обязательное согласие",
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
  assert(generators.reduce((sum, item) => sum + item.expectedVariantCount, 0) === 77, "Expected 77 variants");
}

if (errors.length) {
  console.error(`Figma atomic components validation failed for ${target}/${section}:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`Figma atomic components validation passed for ${target}/${section}.`);