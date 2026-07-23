import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}
function write(relativePath, content) {
  fs.writeFileSync(path.join(ROOT, relativePath), content, "utf8");
}
function replaceRequired(content, from, to, label) {
  if (content.includes(to)) return content;
  if (!content.includes(from)) throw new Error(`Cannot update ${label}: expected source fragment is missing`);
  return content.replace(from, to);
}
function appendOnce(content, marker, addition) {
  return content.includes(marker) ? content : `${content.trimEnd()}\n\n${addition.trim()}\n`;
}

function updateExecutionBuilder() {
  const file = "tools/build-figma-execution-pack.mjs";
  let content = read(file);
  if (!content.includes('id: "catalog"')) {
    const index = content.lastIndexOf("\n];");
    if (index < 0) throw new Error("Cannot locate execution steps array end");
    const step = `,
  {
    id: "catalog",
    phase: "screens",
    title: "26 Screen · Catalog",
    page: "26 Screen · Catalog",
    generator: "tools/figma/generate-portal-v2-catalog-screen.mjs",
    args: [],
    skillNames: "resource:figma-use,resource:figma-generate-library,resource:figma-generate-design",
    dependsOn: [
      "top-navigation",
      "button",
      "lead-form-card",
      "link-card",
      "project-card",
      "site-footer"
    ]
  }`;
    content = `${content.slice(0, index)}${step}${content.slice(index)}`;
  }
  content = replaceRequired(
    content,
    "After the final step, collect metadata and screenshots for Homepage Full / Desktop and Homepage Full / Mobile, then record node IDs in issue #116.",
    "After the final step, collect metadata and screenshots for Homepage Full and Catalog in Desktop and Mobile, then record node IDs in issue #116.",
    file
  );
  write(file, content);
}

function updateExecutionValidator() {
  const file = "tools/validate-figma-execution-pack.mjs";
  let content = read(file);
  content = replaceRequired(content, "manifest.stepCount === 27", "manifest.stepCount === 28", file);
  content = replaceRequired(content, "must contain 27 steps", "must contain 28 steps", file);
  content = replaceRequired(content, "phaseCounts.screens === 7", "phaseCounts.screens === 8", file);
  content = replaceRequired(content, "Expected 7 screen steps", "Expected 8 screen steps", file);
  content = replaceRequired(
    content,
    '      "25 Screen · Homepage Full"\n    ];',
    '      "25 Screen · Homepage Full",\n      "26 Screen · Catalog"\n    ];',
    file
  );
  content = replaceRequired(content, 'manifest.steps?.at(-1)?.id === "homepage-full"', 'manifest.steps?.at(-1)?.id === "catalog"', file);
  content = replaceRequired(content, "must finish with Homepage Full", "must finish with Catalog", file);
  content = replaceRequired(content, "Homepage Full must load library skill", "Catalog must load library skill", file);
  content = replaceRequired(content, "Homepage Full must load design skill", "Catalog must load design skill", file);
  content = replaceRequired(content, '      "27 атомарных шагов",', '      "28 атомарных шагов",', file);
  content = replaceRequired(content, '      "25 Screen · Homepage Full",', '      "25 Screen · Homepage Full",\n      "26 Screen · Catalog",', file);
  content = replaceRequired(
    content,
    'console.log("Figma execution pack validation passed: 27 ordered payloads, hashes, syntax and dependencies are valid.");',
    'console.log("Figma execution pack validation passed: 28 ordered payloads, hashes, syntax and dependencies are valid.");',
    file
  );
  write(file, content);
}

function updateVisualBuilder() {
  const file = "tools/build-figma-visual-qa-pack.mjs";
  let content = read(file);
  if (!content.includes('id: "catalog"')) {
    const marker = '  {\n    id: "homepage-full",';
    if (!content.includes(marker)) throw new Error("Cannot locate Homepage Full visual audit block");
    const block = `  {
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
`;
    content = content.replace(marker, `${block}${marker}`);
  }
  write(file, content);
}

function updateVisualValidator() {
  const file = "tools/validate-figma-visual-qa-pack.mjs";
  let content = read(file);
  content = replaceRequired(content, "manifest.auditCount === 22", "manifest.auditCount === 23", file);
  content = replaceRequired(content, "Expected 22 audits", "Expected 23 audits", file);
  content = replaceRequired(content, "manifest.audits.length === 22", "manifest.audits.length === 23", file);
  content = replaceRequired(content, "Manifest must contain 22 audit entries", "Manifest must contain 23 audit entries", file);
  content = replaceRequired(content, "screenPageAudits === 7", "screenPageAudits === 8", file);
  content = replaceRequired(content, "Expected 7 screen page audits", "Expected 8 screen page audits", file);
  content = replaceRequired(
    content,
    '      "homepage-full"\n    ];',
    '      "homepage-full",\n      "catalog"\n    ];',
    file
  );
  content = replaceRequired(content, "screenshotTargetCount === 28", "screenshotTargetCount === 30", file);
  content = replaceRequired(content, "Expected 28 screenshot targets", "Expected 30 screenshot targets", file);
  content = replaceRequired(content, "ledger.audits.length === 22", "ledger.audits.length === 23", file);
  content = replaceRequired(content, "Ledger template must contain 22 audits", "Ledger template must contain 23 audits", file);
  content = replaceRequired(
    content,
    '["22 read-only audit payload", "14 компонентных", "7 экранных", "Figma.get_screenshot", "clipped overflow"]',
    '["23 read-only audit payload", "14 компонентных", "8 экранных", "Figma.get_screenshot", "clipped overflow"]',
    file
  );
  content = replaceRequired(content, '      "22 audit payload",', '      "23 audit payload",', file);
  content = replaceRequired(content, '      "7 экранных страниц",', '      "8 экранных страниц",', file);
  content = replaceRequired(
    content,
    'console.log("Figma Visual QA Pack validation passed: 22 read-only audits and 28 screenshot targets.");',
    'console.log("Figma Visual QA Pack validation passed: 23 read-only audits and 30 screenshot targets.");',
    file
  );
  write(file, content);
}

function updateSourceMap() {
  const file = "data/design/portal-v2.source-map.json";
  const sourceMap = JSON.parse(read(file));
  sourceMap.figma.screensExpected = 8;
  if (!sourceMap.screens.some((item) => item.id === "catalog")) {
    sourceMap.screens.push({
      id: "catalog",
      figmaPage: "26 Screen · Catalog",
      generator: "tools/figma/generate-portal-v2-catalog-screen.mjs",
      mapping: "composed",
      sources: [
        {
          path: "catalog/index.html",
          markers: [
            "data-catalog-question-routes",
            "data-catalog-rule-quiz",
            "data-catalog-verification-comparison",
            "data-reference-catalog",
            "data-form-id=\"catalog_quick_selection\"",
            "data-form-id=\"catalog_priority_selection\""
          ]
        },
        {
          path: "assets/js/catalog-rule-quiz.js",
          markers: ["steps.length !== 5", "catalog-rule-v1", "quiz_completed"]
        },
        {
          path: "assets/css/project-conversion.css",
          markers: [".project-hero__grid {", ".project-quick-card {"]
        }
      ],
      notes: "Composed Figma screen mirrors the production catalog initial state. Quiz steps and result behavior remain implemented by catalog-rule-quiz.js and are documented through metadata rather than simulated as a false static interaction."
    });
  }
  write(file, `${JSON.stringify(sourceMap, null, 2)}\n`);
}

function updateSourceMapValidator() {
  const file = "tools/validate-figma-source-map-readiness.mjs";
  let content = read(file);
  content = replaceRequired(content, '  "homepage-full"\n];', '  "homepage-full",\n  "catalog"\n];', file);
  content = replaceRequired(content, "screensExpected === 7", "screensExpected === 8", file);
  content = replaceRequired(content, "must expect 7 screens", "must expect 8 screens", file);
  content = replaceRequired(content, "screens.length === 7", "screens.length === 8", file);
  content = replaceRequired(content, "Expected 7 screens", "Expected 8 screens", file);
  content = replaceRequired(content, "manifest?.screenCount === 7", "manifest?.screenCount === 8", file);
  content = replaceRequired(content, "must contain 7 screens", "must contain 8 screens", file);
  content = replaceRequired(content, '    "7 экранов",', '    "8 экранов",', file);
  write(file, content);
}

function updateDocs() {
  const executionFile = "docs/design/FIGMA_EXECUTION_PACK.md";
  let execution = read(executionFile)
    .replaceAll("27 атомарных шагов", "28 атомарных шагов")
    .replaceAll("27 payload", "28 payload");
  execution = appendOnce(execution, "## Расширение Catalog", `## Расширение Catalog

Execution Pack содержит 28 атомарных шагов. Финальный шаг создаёт \`26 Screen · Catalog\` после полной главной. Экран зависит от Top Navigation, Button, Lead Form Card, Link Card, Project Card и Site Footer. После выполнения необходимо проверить Homepage Full и Catalog в Desktop/Mobile.`);
  write(executionFile, execution);

  const visualFile = "docs/design/FIGMA_VISUAL_QA_PACK.md";
  let visual = read(visualFile)
    .replaceAll("22 audit payload", "23 audit payload")
    .replaceAll("7 экранных страниц", "8 экранных страниц")
    .replaceAll("28 screenshot", "30 screenshot");
  visual = appendOnce(visual, "## Catalog audit", `## Catalog audit

Visual QA Pack содержит 23 audit payload: один глобальный, 14 компонентных и 8 экранных. Добавлены \`catalog-desktop\` и \`catalog-mobile\`, девять section-key и два screenshot targets. Общее количество screenshot targets — 30.`);
  write(visualFile, visual);

  const sourceMapFile = "docs/design/FIGMA_SOURCE_MAP_AND_CODE_CONNECT_READINESS.md";
  let sourceDocs = read(sourceMapFile).replaceAll("7 экранов", "8 экранов");
  sourceDocs = appendOnce(sourceDocs, "## Экран Catalog", `## Экран Catalog

Source-map содержит 8 экранов. \`26 Screen · Catalog\` имеет mapping \`composed\` и связан с \`catalog/index.html\`, \`assets/js/catalog-rule-quiz.js\` и \`assets/css/project-conversion.css\`. Экран отслеживается для design-to-code drift; Code Connect применяется только к опубликованным ComponentSet.`);
  write(sourceMapFile, sourceDocs);
}

updateExecutionBuilder();
updateExecutionValidator();
updateVisualBuilder();
updateVisualValidator();
updateSourceMap();
updateSourceMapValidator();
updateDocs();

console.log("Figma Catalog screen handoff integration applied.");
