import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builderPath = path.join(ROOT, "tools/build-figma-visual-qa-pack.mjs");
const docsPath = path.join(ROOT, "docs/design/FIGMA_VISUAL_QA_PACK.md");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "figma-visual-qa-pack-"));
const outputDir = path.join(tempRoot, "pack");
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

try {
  assert(fs.existsSync(builderPath), "Missing Visual QA pack builder");
  assert(fs.existsSync(docsPath), "Missing Visual QA pack documentation");

  const build = spawnSync(process.execPath, [builderPath, outputDir], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024
  });
  assert(build.status === 0, `Builder failed: ${build.stderr.trim()}`);

  const manifestPath = path.join(outputDir, "manifest.json");
  const ledgerPath = path.join(outputDir, "ledger.template.json");
  const readmePath = path.join(outputDir, "README.md");
  for (const item of [manifestPath, ledgerPath, readmePath]) {
    assert(fs.existsSync(item), `Missing generated file: ${path.basename(item)}`);
  }

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert(manifest.schemaVersion === "1.0", "Wrong manifest schema version");
    assert(manifest.figmaFileKey === "rhFYa5gPDhF009hZsfEGSX", "Wrong Figma file key");
    assert(manifest.auditCount === 23, `Expected 23 audits, found ${manifest.auditCount}`);
    assert(manifest.audits.length === 23, `Manifest must contain 23 audit entries, found ${manifest.audits.length}`);
    assert(manifest.expectedTotals.variableCollections === 4, "Expected 4 variable collections");
    assert(manifest.expectedTotals.variables === 53, "Expected 53 variables");
    assert(manifest.expectedTotals.textStyles === 8, "Expected 8 text styles");
    assert(manifest.expectedTotals.effectStyles === 6, "Expected 6 effect styles");
    assert(manifest.expectedTotals.componentSets === 14, "Expected 14 ComponentSet");
    assert(manifest.expectedTotals.variants === 119, "Expected 119 variants");
    assert(manifest.expectedTotals.componentPageAudits === 14, "Expected 14 component page audits");
    assert(manifest.expectedTotals.screenPageAudits === 8, "Expected 8 screen page audits");
    assert(manifest.constraints.noCanvasMutation === true, "Visual QA pack must be read-only");
    assert(manifest.constraints.maxPageSwitchesPerCall === 1, "Visual QA pack must allow at most one page switch");

    const ids = manifest.audits.map((item) => item.id);
    assert(new Set(ids).size === ids.length, "Audit IDs must be unique");
    const requiredIds = [
      "global-foundations-components",
      "button",
      "verification-status",
      "form-field",
      "faq-accordion",
      "brand",
      "top-navigation",
      "project-card",
      "fact-card",
      "lead-form-card",
      "scenario-card",
      "content-card",
      "step-card",
      "link-card",
      "site-footer",
      "homepage-hero",
      "homepage-start-objects",
      "homepage-apartments-outcomes",
      "homepage-process-purchase",
      "homepage-purchase-resources",
      "homepage-faq-lead",
      "homepage-full",
      "catalog"
    ];
    for (const id of requiredIds) assert(ids.includes(id), `Manifest misses audit: ${id}`);

    const disallowedMutationPatterns = [
      "figma.create",
      ".appendChild(",
      ".insertChild(",
      ".remove(",
      ".setSharedPluginData(",
      ".setPluginData(",
      ".setProperties(",
      ".resize(",
      ".setBoundVariable",
      "createVariableCollection",
      "createVariable(",
      ".characters =",
      ".fills =",
      ".strokes =",
      "figma.notify(",
      "figma.closePlugin(",
      "figma.currentPage =",
      "loadAllPagesAsync"
    ];

    for (const audit of manifest.audits) {
      const codePath = path.join(outputDir, audit.file);
      assert(fs.existsSync(codePath), `Missing payload: ${audit.file}`);
      if (!fs.existsSync(codePath)) continue;
      const code = fs.readFileSync(codePath, "utf8");
      assert(code.length === audit.characters, `${audit.file} character count mismatch`);
      assert(Buffer.byteLength(code, "utf8") === audit.bytes, `${audit.file} byte count mismatch`);
      assert(sha256(code) === audit.sha256, `${audit.file} SHA-256 mismatch`);
      assert(code.length > 0, `${audit.file} is empty`);
      assert(code.length <= 50000, `${audit.file} exceeds Figma.use_figma character limit`);
      assert(audit.skillNames === "resource:figma-use", `${audit.file} has wrong skillNames`);
      assert(audit.readOnly === true, `${audit.file} must be marked read-only`);
      assert(code.includes("return {"), `${audit.file} must return structured audit data`);
      for (const pattern of disallowedMutationPatterns) {
        assert(!code.includes(pattern), `${audit.file} contains mutation or unsupported API marker: ${pattern}`);
      }
      const pageSwitchCount = (code.match(/await figma\.setCurrentPageAsync\(/g) || []).length;
      if (audit.phase === "global") assert(pageSwitchCount === 0, `${audit.file} global audit must not switch pages`);
      else assert(pageSwitchCount === 1, `${audit.file} must switch page exactly once`);
      if (audit.page) assert(code.includes(audit.page), `${audit.file} misses page name ${audit.page}`);
      if (audit.componentSet) {
        assert(code.includes(audit.componentSet), `${audit.file} misses ComponentSet ${audit.componentSet}`);
        assert(code.includes(String(audit.expectedVariants)), `${audit.file} misses expected variant count`);
      }
      for (const key of audit.expectedScreenKeys || []) assert(code.includes(key), `${audit.file} misses screen-key ${key}`);
      for (const key of audit.expectedSectionKeys || []) assert(code.includes(key), `${audit.file} misses section-key ${key}`);
      const syntaxPath = path.join(tempRoot, `${audit.id}.mjs`);
      fs.writeFileSync(syntaxPath, `async function __figmaAuditWrapper() {\n${code}\n}\n`, "utf8");
      const syntax = spawnSync(process.execPath, ["--check", syntaxPath], { encoding: "utf8" });
      assert(syntax.status === 0, `${audit.file} generated invalid JavaScript: ${syntax.stderr.trim()}`);
    }

    const screenshotTargetCount = manifest.audits.reduce((sum, item) => sum + item.screenshotTargets.length, 0);
    assert(screenshotTargetCount === 30, `Expected 30 screenshot targets, found ${screenshotTargetCount}`);
    const fullAudit = manifest.audits.find((item) => item.id === "homepage-full");
    assert(fullAudit?.expectedSectionKeys.length === 12, "Homepage Full audit must require 12 section keys");
    assert(fullAudit?.screenshotTargets.length === 2, "Homepage Full audit must expose Desktop and Mobile screenshot targets");
  }

  if (fs.existsSync(ledgerPath)) {
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
    assert(ledger.audits.length === 23, "Ledger template must contain 23 audits");
    assert(ledger.audits.every((item) => item.status === "not_started"), "Ledger audits must start as not_started");
    assert(ledger.audits.every((item) => Array.isArray(item.screenshotTargets)), "Ledger audits must contain screenshot targets");
  }

  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, "utf8");
    for (const marker of ["23 read-only audit payload", "14 компонентных", "8 экранных", "Figma.get_screenshot", "clipped overflow"]) {
      assert(readme.includes(marker), `Generated README misses: ${marker}`);
    }
  }

  if (fs.existsSync(docsPath)) {
    const docs = fs.readFileSync(docsPath, "utf8");
    for (const marker of [
      "Figma Visual QA Pack",
      "23 audit payload",
      "14 компонентных страниц",
      "8 экранных страниц",
      "119 вариантов",
      "overflowCandidates",
      "missingFonts",
      "detachedInstances",
      "ledger.template.json",
      "Figma.get_screenshot",
      "issue №116",
      "Starter"
    ]) assert(docs.includes(marker), `Documentation misses: ${marker}`);
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

if (errors.length) {
  console.error(`Figma Visual QA Pack validation failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Figma Visual QA Pack validation passed: 23 read-only audits and 30 screenshot targets.");
