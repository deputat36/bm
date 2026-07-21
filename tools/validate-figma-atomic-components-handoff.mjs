import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = path.join(ROOT, "tools/figma/portal-v2-component-runtime.mjs");
const generators = [
  {
    path: "tools/figma/generate-portal-v2-button-components.mjs",
    page: "05 Component · Button",
    componentSet: "Button",
    variantMarkers: [
      "const types = [\"Primary\", \"Secondary\"]",
      "const states = [\"Default\", \"Hover\", \"Focus\", \"Disabled\"]"
    ],
    expectedVariantCount: 8,
    tokens: ["action/primary", "action/primary/hover", "action/secondary", "focus/ring"]
  },
  {
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
    path: "tools/figma/generate-portal-v2-form-field-components.mjs",
    page: "07 Component · Form Field",
    componentSet: "Form Field",
    variantMarkers: [
      "for (const controlType of [\"Input\", \"Select\", \"Textarea\"])",
      "for (const state of [\"Default\", \"Focus\", \"Disabled\"])"
    ],
    expectedVariantCount: 9,
    tokens: ["surface/primary", "border/default", "focus/ring", "background/soft"]
  }
];

const errors = [];
function assert(condition, message) {
  if (!condition) errors.push(message);
}

const runtime = fs.readFileSync(runtimePath, "utf8");
assert(runtime.includes("figma.createComponent()"), "Runtime must create real ComponentNode objects");
assert(runtime.includes("figma.combineAsVariants"), "Runtime must combine variants into ComponentSetNode");
assert(runtime.includes("figma.variables.setBoundVariableForPaint"), "Runtime must bind paints to variables");
assert(runtime.includes("node.setBoundVariable"), "Runtime must bind dimensions to variables");
assert(runtime.includes("addComponentProperty"), "Runtime must expose component properties");
assert(runtime.includes("componentPropertyReferences"), "Runtime must connect properties to child nodes");
assert(runtime.includes("setSharedPluginData"), "Runtime must tag generated nodes for idempotency");

const disallowed = [
  "figma.notify(",
  "figma.closePlugin(",
  "figma.currentPage =",
  "loadAllPagesAsync",
  ".getPluginData(",
  ".setPluginData("
];

let totalExpectedVariants = 0;
for (const definition of generators) {
  totalExpectedVariants += definition.expectedVariantCount;
  const absolute = path.join(ROOT, definition.path);
  assert(fs.existsSync(absolute), `Missing generator: ${definition.path}`);
  if (!fs.existsSync(absolute)) continue;

  const run = spawnSync(process.execPath, [absolute], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  assert(run.status === 0, `${definition.path} failed to generate code: ${run.stderr.trim()}`);
  const code = run.stdout;
  if (!code) continue;

  assert(code.length <= 50000, `${definition.path} exceeds Figma.use_figma 50,000 character limit`);
  assert(code.includes(definition.page), `${definition.path} has wrong page name`);
  assert(code.includes(`combine(variants, stage, "${definition.componentSet}")`), `${definition.path} has wrong component set name`);
  assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length === 1, `${definition.path} must switch page exactly once`);
  assert(!/#[0-9a-f]{3,8}\b/i.test(code), `${definition.path} contains hardcoded HEX`);
  assert(code.includes("figma.createComponent()"), `${definition.path} does not create ComponentNode`);
  assert(code.includes("figma.combineAsVariants"), `${definition.path} does not create variants`);
  assert(code.includes("addComponentProperty"), `${definition.path} does not expose component properties`);
  assert(code.includes("componentPropertyReferences"), `${definition.path} does not bind component properties`);
  assert(code.includes("setSharedPluginData"), `${definition.path} is not idempotently tagged`);
  assert(code.includes("figma.variables.setBoundVariableForPaint"), `${definition.path} has no paint variable bindings`);
  assert(code.includes("setBoundVariable"), `${definition.path} has no dimension variable bindings`);

  for (const marker of definition.variantMarkers) {
    assert(code.includes(marker), `${definition.path} misses variant axis marker ${marker}`);
  }
  for (const token of definition.tokens) {
    assert(code.includes(token), `${definition.path} misses token ${token}`);
  }
  for (const pattern of disallowed) {
    assert(!code.includes(pattern), `${definition.path} uses unsupported API: ${pattern}`);
  }

  const tempFile = path.join(os.tmpdir(), `portal-v2-${path.basename(definition.path)}-${process.pid}.mjs`);
  const wrappedCode = `async function __figmaUseWrapper() {\n${code}\n}\n`;
  fs.writeFileSync(tempFile, wrappedCode, "utf8");
  const syntax = spawnSync(process.execPath, ["--check", tempFile], { encoding: "utf8" });
  fs.rmSync(tempFile, { force: true });
  assert(syntax.status === 0, `${definition.path} generated invalid JavaScript: ${syntax.stderr.trim()}`);
}
assert(totalExpectedVariants === 21, `Expected 21 variants, got ${totalExpectedVariants}`);

const docsPath = path.join(ROOT, "docs/design/FIGMA_ATOMIC_COMPONENTS_HANDOFF.md");
const workflowPath = path.join(ROOT, ".github/workflows/figma-atomic-components-handoff.yml");
assert(fs.existsSync(docsPath), "Missing atomic components handoff documentation");
assert(fs.existsSync(workflowPath), "Missing atomic components handoff workflow");
if (fs.existsSync(docsPath)) {
  const docs = fs.readFileSync(docsPath, "utf8");
  for (const required of [
    "05 Component · Button",
    "06 Component · Verification Status",
    "07 Component · Form Field",
    "Figma.use_figma",
    "Visual QA",
    "issue №116"
  ]) {
    assert(docs.includes(required), `Documentation misses: ${required}`);
  }
}

if (errors.length) {
  console.error("Figma atomic components handoff validation failed:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log("Figma atomic components handoff is valid: 3 families, 21 variants, variable-bound and idempotent.");
