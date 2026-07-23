import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builderPath = path.join(ROOT, "tools/build-figma-execution-pack.mjs");
const docsPath = path.join(ROOT, "docs/design/FIGMA_EXECUTION_PACK.md");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "portal-v2-figma-pack-"));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function checkSyntax(code, id) {
  const wrapperPath = path.join(tempDir, `syntax-${id}.mjs`);
  fs.writeFileSync(wrapperPath, `async function __figmaUseWrapper() {\n${code}\n}\n`, "utf8");
  const result = spawnSync(process.execPath, ["--check", wrapperPath], { encoding: "utf8" });
  assert(result.status === 0, `${id} generated invalid JavaScript: ${result.stderr.trim()}`);
}

try {
  assert(fs.existsSync(builderPath), "Missing tools/build-figma-execution-pack.mjs");
  assert(fs.existsSync(docsPath), "Missing docs/design/FIGMA_EXECUTION_PACK.md");

  if (fs.existsSync(builderPath)) {
    const build = spawnSync(process.execPath, [builderPath, tempDir], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024
    });
    assert(build.status === 0, `Execution pack build failed: ${build.stderr.trim()}`);
  }

  const manifestPath = path.join(tempDir, "manifest.json");
  const readmePath = path.join(tempDir, "README.md");
  assert(fs.existsSync(manifestPath), "Execution pack misses manifest.json");
  assert(fs.existsSync(readmePath), "Execution pack misses README.md");

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert(manifest.schemaVersion === "1.0", "Execution pack schemaVersion must be 1.0");
    assert(manifest.designSystem === "Portal v2 · Городской навигатор", "Execution pack has wrong design system name");
    assert(manifest.figmaFileKey === "rhFYa5gPDhF009hZsfEGSX", "Execution pack has wrong Figma file key");
    assert(manifest.stepCount === 28, `Execution pack must contain 28 steps, got ${manifest.stepCount}`);
    assert(Array.isArray(manifest.steps), "Execution pack steps must be an array");
    assert(manifest.constraints?.maxCharactersPerCall === 50000, "Execution pack must preserve 50,000 character limit");
    assert(manifest.constraints?.maxPageSwitchesPerCall === 1, "Execution pack must preserve one page switch per call");
    assert(manifest.constraints?.stopOnError === true, "Execution pack must stop on error");
    assert(manifest.constraints?.preserveOrder === true, "Execution pack must preserve order");

    const ids = new Set();
    const orders = new Set();
    const phaseCounts = { foundations: 0, documentation: 0, components: 0, screens: 0 };
    const orderById = new Map();
    const forbidden = [
      "figma.notify(",
      "figma.closePlugin(",
      "figma.currentPage =",
      "loadAllPagesAsync",
      ".getPluginData(",
      ".setPluginData("
    ];

    for (const step of manifest.steps || []) {
      assert(Number.isInteger(step.order), `${step.id || "unknown"} has invalid order`);
      assert(!orders.has(step.order), `Duplicate execution order: ${step.order}`);
      orders.add(step.order);
      assert(typeof step.id === "string" && step.id.length > 0, `Step ${step.order} has invalid id`);
      assert(!ids.has(step.id), `Duplicate step id: ${step.id}`);
      ids.add(step.id);
      orderById.set(step.id, step.order);
      assert(step.order === manifest.steps.indexOf(step) + 1, `${step.id} is not stored in execution order`);
      assert(Object.hasOwn(phaseCounts, step.phase), `${step.id} has unknown phase: ${step.phase}`);
      if (Object.hasOwn(phaseCounts, step.phase)) phaseCounts[step.phase] += 1;
      assert(Array.isArray(step.dependsOn), `${step.id} dependsOn must be an array`);
      assert(typeof step.skillNames === "string" && step.skillNames.includes("resource:figma-use"), `${step.id} misses resource:figma-use`);
      assert(typeof step.generator === "string" && step.generator.startsWith("tools/figma/"), `${step.id} has invalid generator path`);
      assert(fs.existsSync(path.join(ROOT, step.generator)), `${step.id} references missing generator: ${step.generator}`);

      const payloadPath = path.join(tempDir, step.file || "");
      assert(fs.existsSync(payloadPath), `${step.id} payload is missing: ${step.file}`);
      if (!fs.existsSync(payloadPath)) continue;

      const code = fs.readFileSync(payloadPath, "utf8");
      const bytes = Buffer.byteLength(code, "utf8");
      const sha256 = crypto.createHash("sha256").update(code, "utf8").digest("hex");
      assert(code.length > 0, `${step.id} payload is empty`);
      assert(code.length <= 50000, `${step.id} exceeds Figma.use_figma limit: ${code.length}`);
      assert(step.characters === code.length, `${step.id} character count does not match manifest`);
      assert(step.bytes === bytes, `${step.id} byte count does not match manifest`);
      assert(step.sha256 === sha256, `${step.id} SHA-256 does not match payload`);
      assert((code.match(/await figma\.setCurrentPageAsync\(/g) || []).length <= 1, `${step.id} switches page more than once`);
      for (const pattern of forbidden) {
        assert(!code.includes(pattern), `${step.id} uses unsupported API: ${pattern}`);
      }
      checkSyntax(code, step.id);
    }

    assert(phaseCounts.foundations === 1, `Expected 1 foundations step, got ${phaseCounts.foundations}`);
    assert(phaseCounts.documentation === 5, `Expected 5 documentation steps, got ${phaseCounts.documentation}`);
    assert(phaseCounts.components === 14, `Expected 14 component steps, got ${phaseCounts.components}`);
    assert(phaseCounts.screens === 8, `Expected 8 screen steps, got ${phaseCounts.screens}`);

    for (const step of manifest.steps || []) {
      for (const dependency of step.dependsOn || []) {
        assert(orderById.has(dependency), `${step.id} references unknown dependency: ${dependency}`);
        if (orderById.has(dependency)) {
          assert(orderById.get(dependency) < step.order, `${step.id} runs before dependency ${dependency}`);
        }
      }
    }

    const expectedPages = [
      "00 Cover",
      "01 Getting Started",
      "02 Foundations",
      "03 Components",
      "04 Utilities",
      "05 Component · Button",
      "06 Component · Verification Status",
      "07 Component · Form Field",
      "08 Component · FAQ Accordion",
      "09 Component · Brand",
      "10 Component · Top Navigation",
      "11 Component · Project Card",
      "12 Component · Fact Card",
      "13 Component · Lead Form Card",
      "14 Screen · Homepage Hero",
      "15 Component · Scenario Card",
      "16 Screen · Homepage Start & Objects",
      "17 Component · Content Card",
      "18 Screen · Homepage Apartments & Outcomes",
      "19 Component · Step Card",
      "20 Screen · Homepage Process & Purchase",
      "21 Component · Link Card",
      "22 Screen · Homepage Purchase & Resources",
      "23 Screen · Homepage FAQ & Lead",
      "24 Component · Site Footer",
      "25 Screen · Homepage Full",
      "26 Screen · Catalog"
    ];
    const pages = (manifest.steps || []).map((step) => step.page).filter(Boolean);
    assert(JSON.stringify(pages) === JSON.stringify(expectedPages), "Execution pack page order does not match Portal v2 handoff");
    assert(manifest.steps?.[0]?.id === "foundations", "Execution pack must start with foundations");
    assert(manifest.steps?.at(-1)?.id === "catalog", "Execution pack must finish with Catalog");
    assert(manifest.steps?.at(-1)?.skillNames.includes("resource:figma-generate-library"), "Catalog must load library skill");
    assert(manifest.steps?.at(-1)?.skillNames.includes("resource:figma-generate-design"), "Catalog must load design skill");
  }

  if (fs.existsSync(docsPath)) {
    const docs = fs.readFileSync(docsPath, "utf8");
    for (const marker of [
      "28 атомарных шагов",
      "manifest.json",
      "SHA-256",
      "50 000 символов",
      "один Figma.use_figma call",
      "24 Component · Site Footer",
      "25 Screen · Homepage Full",
      "26 Screen · Catalog",
      "metadata",
      "screenshots",
      "issue №116",
      "Figma Starter"
    ]) {
      assert(docs.includes(marker), `Execution pack documentation misses: ${marker}`);
    }
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

if (errors.length) {
  console.error(`Figma execution pack validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Figma execution pack validation passed: 28 ordered payloads, hashes, syntax and dependencies are valid.");
