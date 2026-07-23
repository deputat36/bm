import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const changed = [];

function file(rel) { return path.join(ROOT, rel); }
function read(rel) { return fs.readFileSync(file(rel), "utf8"); }
function write(rel, content) {
  const current = read(rel);
  if (current === content) return;
  fs.writeFileSync(file(rel), content, "utf8");
  changed.push(rel);
}
function replaceRequired(content, from, to, label) {
  if (content.includes(to)) return content;
  if (!content.includes(from)) throw new Error(`Cannot apply ${label}: source fragment is missing`);
  return content.replace(from, to);
}
function insertBeforeLast(content, marker, value, label) {
  if (content.includes(value.trim())) return content;
  const index = content.lastIndexOf(marker);
  if (index < 0) throw new Error(`Cannot apply ${label}: insertion marker is missing`);
  return content.slice(0, index) + value + content.slice(index);
}

const projectStep = `,
  {
    id: "project-detail",
    phase: "screens",
    title: "27 Screen · Project Detail",
    page: "27 Screen · Project Detail",
    generator: "tools/figma/generate-portal-v2-project-detail-screen.mjs",
    args: [],
    skillNames: "resource:figma-use,resource:figma-generate-library,resource:figma-generate-design",
    dependsOn: [
      "top-navigation",
      "button",
      "fact-card",
      "lead-form-card",
      "content-card",
      "faq-accordion",
      "site-footer"
    ]
  }
`;
let executionBuilder = read("tools/build-figma-execution-pack.mjs");
executionBuilder = insertBeforeLast(executionBuilder, "\n];", projectStep, "Execution Pack project-detail step");
write("tools/build-figma-execution-pack.mjs", executionBuilder);

let executionValidator = read("tools/validate-figma-execution-pack.mjs");
for (const [from, to, label] of [
  ["manifest.stepCount === 28", "manifest.stepCount === 29", "execution step assertion"],
  ["contain 28 steps", "contain 29 steps", "execution step message"],
  ["phaseCounts.screens === 8", "phaseCounts.screens === 9", "screen phase assertion"],
  ["Expected 8 screen steps", "Expected 9 screen steps", "screen phase message"],
  ["      \"26 Screen · Catalog\"\n", "      \"26 Screen · Catalog\",\n      \"27 Screen · Project Detail\"\n", "expected page list"],
  ["manifest.steps?.at(-1)?.id === \"catalog\"", "manifest.steps?.at(-1)?.id === \"project-detail\"", "last step id"],
  ["Execution Pack must finish with Catalog", "Execution Pack must finish with Project Detail", "last step message"],
  ["Catalog must load library skill", "Project Detail must load library skill", "library skill message"],
  ["Catalog must load design skill", "Project Detail must load design skill", "design skill message"],
  ["      \"28 атомарных шагов\",", "      \"29 атомарных шагов\",", "docs marker count"],
  ["      \"26 Screen · Catalog\",", "      \"26 Screen · Catalog\",\n      \"27 Screen · Project Detail\",", "docs marker page"],
  ["passed: 28 ordered payloads", "passed: 29 ordered payloads", "success message"]
]) executionValidator = replaceRequired(executionValidator, from, to, label);
write("tools/validate-figma-execution-pack.mjs", executionValidator);

const projectAudit = `  {
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
`;
let qaBuilder = read("tools/build-figma-visual-qa-pack.mjs");
if (!qaBuilder.includes('id: "project-detail"')) {
  const marker = '  {\n    id: "homepage-full"';
  if (!qaBuilder.includes(marker)) throw new Error("Cannot insert Project Detail Visual QA audit");
  qaBuilder = qaBuilder.replace(marker, projectAudit + marker);
}
write("tools/build-figma-visual-qa-pack.mjs", qaBuilder);

let qaValidator = read("tools/validate-figma-visual-qa-pack.mjs");
for (const [from, to, label] of [
  ["manifest.auditCount === 23", "manifest.auditCount === 24", "audit count assertion"],
  ["Expected 23 audits", "Expected 24 audits", "audit count message"],
  ["manifest.audits.length === 23", "manifest.audits.length === 24", "audit array assertion"],
  ["23 audit entries", "24 audit entries", "audit array message"],
  ["screenPageAudits === 8", "screenPageAudits === 9", "screen audit assertion"],
  ["Expected 8 screen page audits", "Expected 9 screen page audits", "screen audit message"],
  ["      \"catalog\"\n", "      \"catalog\",\n      \"project-detail\"\n", "required audit id"],
  ["screenshotTargetCount === 30", "screenshotTargetCount === 36", "screenshot assertion"],
  ["Expected 30 screenshot targets", "Expected 36 screenshot targets", "screenshot message"],
  ["ledger.audits.length === 23", "ledger.audits.length === 24", "ledger assertion"],
  ["23 audits", "24 audits", "ledger/readme count"],
  ["23 read-only audit payload", "24 read-only audit payload", "readme payload marker"],
  ["8 экранных", "9 экранных", "readme screen marker"],
  ["\"23 audit payload\"", "\"24 audit payload\"", "docs payload marker"],
  ["\"8 экранных страниц\"", "\"9 экранных страниц\"", "docs screen marker"],
  ["passed: 23 read-only audits and 30 screenshot targets", "passed: 24 read-only audits and 36 screenshot targets", "success message"]
]) qaValidator = replaceRequired(qaValidator, from, to, label);
write("tools/validate-figma-visual-qa-pack.mjs", qaValidator);

const sourceMapPath = "data/design/portal-v2.source-map.json";
const sourceMap = JSON.parse(read(sourceMapPath));
sourceMap.figma.screensExpected = 9;
if (!sourceMap.screens.some((item) => item.id === "project-detail")) {
  sourceMap.screens.push({
    id: "project-detail",
    figmaPage: "27 Screen · Project Detail",
    generator: "tools/figma/generate-portal-v2-project-detail-screen.mjs",
    mapping: "composed",
    sources: [
      {
        path: "catalog/prostornaya-4a/index.html",
        markers: [
          "data-schema-project=\"prostornaya-4a\"",
          "catalog_prostornaya_4a_quick_consultation",
          "catalog_prostornaya_4a_priority_lead",
          "data-verification-profile=\"../../data/verification/prostornaya-4a.json\""
        ]
      },
      {
        path: "catalog/aerodromnaya-18g/index.html",
        markers: [
          "data-schema-project=\"aerodromnaya-18g\"",
          "catalog_aerodromnaya_18g_quick_consultation",
          "catalog_aerodromnaya_18g_priority_lead",
          "data-verification-profile=\"../../data/verification/aerodromnaya-18g.json\""
        ]
      },
      {
        path: "catalog/sennaya-76/index.html",
        markers: [
          "data-schema-project=\"sennaya-76\"",
          "catalog_sennaya_76_quick_consultation",
          "catalog_sennaya_76_priority_lead",
          "data-verification-profile=\"../../data/verification/sennaya-76.json\""
        ]
      },
      {
        path: "assets/css/project-conversion.css",
        markers: [".project-hero__grid {", ".project-status-grid {", ".project-faq {"]
      },
      {
        path: "assets/js/project-intent-prefill.js",
        markers: ["data-prefill-interest", "scrollIntoView"]
      },
      {
        path: "assets/js/project-verification-summary.js",
        markers: ["data-verification-summary", "data-verification-profile"]
      }
    ],
    notes: "Six composed frames preserve three evidence profiles instead of flattening verified project facts, owner-corrected marketplace data and public interview claims into one confidence level."
  });
}
write(sourceMapPath, JSON.stringify(sourceMap, null, 2) + "\n");

let sourceValidator = read("tools/validate-figma-source-map-readiness.mjs");
for (const [from, to, label] of [
  ["  \"catalog\"\n];", "  \"catalog\",\n  \"project-detail\"\n];", "expected screen ids"],
  ["screensExpected === 8", "screensExpected === 9", "screen expected assertion"],
  ["must expect 8 screens", "must expect 9 screens", "screen expected message"],
  ["screens.length === 8", "screens.length === 9", "screen length assertion"],
  ["Expected 8 screens", "Expected 9 screens", "screen length message"],
  ["screenCount === 8", "screenCount === 9", "readiness screen count assertion"],
  ["contain 8 screens", "contain 9 screens", "readiness screen count message"]
]) sourceValidator = replaceRequired(sourceValidator, from, to, label);
write("tools/validate-figma-source-map-readiness.mjs", sourceValidator);

let executionDocs = read("docs/design/FIGMA_EXECUTION_PACK.md");
executionDocs = executionDocs.replaceAll("28 атомарных шагов", "29 атомарных шагов");
executionDocs = executionDocs.replaceAll("27 пронумерованных JavaScript payload-файлов", "29 пронумерованных JavaScript payload-файлов");
executionDocs = executionDocs.replace("### Screens\n\n7 шагов:", "### Screens\n\n9 шагов:");
if (!executionDocs.includes("- `26 Screen · Catalog`;")) executionDocs = executionDocs.replace("- `25 Screen · Homepage Full`.", "- `25 Screen · Homepage Full`;\n- `26 Screen · Catalog`;");
if (!executionDocs.includes("- `27 Screen · Project Detail`.")) executionDocs = executionDocs.replace("- `26 Screen · Catalog`;", "- `26 Screen · Catalog`;\n- `27 Screen · Project Detail`.");
executionDocs = executionDocs.replace("После шага `25 Screen · Homepage Full`", "После завершения `27 Screen · Project Detail`");
if (!executionDocs.includes("## Расширение Project Detail")) executionDocs += `\n\n## Расширение Project Detail\n\nExecution Pack содержит 29 атомарных шагов. Финальный шаг создаёт \`27 Screen · Project Detail\` с шестью frames для Просторной 4А, Аэродромной 18Г и Сенной 76 в Desktop/Mobile. Экран зависит от Top Navigation, Button, Fact Card, Lead Form Card, Content Card, FAQ Accordion и Site Footer.\n`;
write("docs/design/FIGMA_EXECUTION_PACK.md", executionDocs);

let qaDocs = read("docs/design/FIGMA_VISUAL_QA_PACK.md");
qaDocs = qaDocs.replaceAll("23 audit payload", "24 audit payload");
qaDocs = qaDocs.replaceAll("8 экранных страниц", "9 экранных страниц");
qaDocs = qaDocs.replaceAll("22 пронумерованных JavaScript-файла", "24 пронумерованных JavaScript-файла");
qaDocs = qaDocs.replaceAll("27 шагов Figma Execution Pack", "29 шагов Figma Execution Pack");
qaDocs = qaDocs.replaceAll("30 screenshot targets", "36 screenshot targets");
qaDocs = qaDocs.replace("7. Homepage Full.", "7. Homepage Full;\n8. Catalog;\n9. Project Detail.");
if (!qaDocs.includes("## Project Detail QA")) qaDocs += `\n\n## Project Detail QA\n\nСтраница \`27 Screen · Project Detail\` добавляет один page-level audit и шесть screenshot targets: три доказательных профиля × Desktop/Mobile. Проверяются шесть screen-key, восемь section-key, route/form metadata, verification profile, missingFonts, detachedInstances и overflowCandidates.\n`;
write("docs/design/FIGMA_VISUAL_QA_PACK.md", qaDocs);

let sourceDocs = read("docs/design/FIGMA_SOURCE_MAP_AND_CODE_CONNECT_READINESS.md");
sourceDocs = sourceDocs.replaceAll("8 экранов", "9 экранов");
if (!sourceDocs.includes("## Экран Project Detail")) sourceDocs += `\n\n## Экран Project Detail\n\nSource-map содержит 9 экранов. \`27 Screen · Project Detail\` имеет mapping \`composed\` и связан с тремя production-страницами объектов, \`assets/css/project-conversion.css\`, \`assets/js/project-intent-prefill.js\` и \`assets/js/project-verification-summary.js\`. Шесть frames сохраняют три уровня доказательности и отслеживаются для design-to-code drift.\n`;
write("docs/design/FIGMA_SOURCE_MAP_AND_CODE_CONNECT_READINESS.md", sourceDocs);

console.log(JSON.stringify({ changed, changedCount: changed.length }, null, 2));
