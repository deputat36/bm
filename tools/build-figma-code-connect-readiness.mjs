import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_MAP_PATH = path.join(ROOT, "data/design/portal-v2.source-map.json");
const OUTPUT_DIR = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(ROOT, "build/figma-code-connect-readiness");

const sourceMap = JSON.parse(fs.readFileSync(SOURCE_MAP_PATH, "utf8"));
const serializedSourceMap = JSON.stringify(sourceMap, null, 2) + "\n";
const sourceMapSha256 = crypto.createHash("sha256").update(serializedSourceMap, "utf8").digest("hex");

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const componentMappings = sourceMap.components.map((component) => ({
  id: component.id,
  figmaPage: component.figmaPage,
  componentSet: component.componentSet,
  generator: component.generator,
  productionMapping: component.mapping,
  selectors: component.selectors,
  sourceCandidates: component.sources.map((source) => source.path),
  nodeId: null,
  published: false,
  codeConnectStatus: "blocked",
  blockers: [
    "Figma MCP component node ID is unavailable",
    "Component publication is not confirmed",
    "Current Figma plan is Starter; Code Connect requires Organization or Enterprise"
  ],
  nextAction: "After physical generation and publication, read the real component set node ID from Figma metadata and replace nodeId without guessing."
}));

const screenMappings = sourceMap.screens.map((screen) => ({
  id: screen.id,
  figmaPage: screen.figmaPage,
  generator: screen.generator,
  productionMapping: screen.mapping,
  sourceCandidates: screen.sources.map((source) => source.path),
  codeConnectStatus: "not-applicable",
  notes: "Screens are tracked for design-to-code drift, not published as Code Connect component mappings."
}));

const gaps = [
  ...sourceMap.components
    .filter((component) => component.mapping === "gap")
    .map((component) => ({ type: "component", id: component.id, details: component.implementationGap || component.notes || "Unspecified gap" })),
  ...sourceMap.screens
    .filter((screen) => screen.mapping === "gap")
    .map((screen) => ({ type: "screen", id: screen.id, details: screen.notes || "Unspecified gap" }))
];

const manifest = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  designSystem: sourceMap.designSystem,
  figmaFileKey: sourceMap.figma.fileKey,
  sourceMapSha256,
  componentCount: componentMappings.length,
  screenCount: screenMappings.length,
  directMappings: sourceMap.components.filter((item) => item.mapping === "direct").length,
  composedMappings: sourceMap.components.filter((item) => item.mapping === "composed").length,
  gapMappings: sourceMap.components.filter((item) => item.mapping === "gap").length,
  codeConnectStatus: sourceMap.codeConnect.status,
  files: [
    "source-map.json",
    "pending-code-connect.json",
    "screen-source-map.json",
    "gaps.json",
    "README.md"
  ]
};

const readme = `# Figma Code Connect Readiness\n\n` +
  `Design system: ${sourceMap.designSystem}\n\n` +
  `Figma file: ${sourceMap.figma.fileUrl}\n\n` +
  `Components: ${componentMappings.length}\n` +
  `Screens: ${screenMappings.length}\n` +
  `Source map SHA-256: ${sourceMapSha256}\n\n` +
  `## Current status\n\n` +
  `Code Connect is blocked. The current plan is ${sourceMap.codeConnect.currentPlan}; the required plan is ${sourceMap.codeConnect.requiredPlan}. ` +
  `Component node IDs are unavailable and publication is not confirmed.\n\n` +
  `No node ID in this package is guessed. Every pending component has nodeId=null.\n\n` +
  `## Required order\n\n` +
  `1. Run the Figma Execution Pack.\n` +
  `2. Publish the component library.\n` +
  `3. Run the Figma Visual QA Pack.\n` +
  `4. Read real ComponentSet node IDs from Figma metadata.\n` +
  `5. Upgrade to an eligible Figma plan when Code Connect is required.\n` +
  `6. Review each source candidate before creating mappings.\n\n` +
  `## Known gap\n\n` +
  `FAQ Accordion is interactive in Figma but remains six static cards in production. Resolve this before declaring direct parity.\n`;

fs.writeFileSync(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(OUTPUT_DIR, "source-map.json"), serializedSourceMap, "utf8");
fs.writeFileSync(path.join(OUTPUT_DIR, "pending-code-connect.json"), JSON.stringify(componentMappings, null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(OUTPUT_DIR, "screen-source-map.json"), JSON.stringify(screenMappings, null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(OUTPUT_DIR, "gaps.json"), JSON.stringify(gaps, null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(OUTPUT_DIR, "README.md"), readme, "utf8");

process.stdout.write(JSON.stringify({
  outputDir: path.relative(ROOT, OUTPUT_DIR),
  componentCount: componentMappings.length,
  screenCount: screenMappings.length,
  gapCount: gaps.length,
  sourceMapSha256
}, null, 2) + "\n");
