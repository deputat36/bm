import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputArg = process.argv[2];
const OUTPUT_DIR = outputArg
  ? path.resolve(process.cwd(), outputArg)
  : path.join(ROOT, "build/figma-execution-pack");

const COMPONENT_SKILLS = "resource:figma-use,resource:figma-generate-library";
const SCREEN_SKILLS = "resource:figma-use,resource:figma-generate-design";
const FOUNDATION_SKILLS = "resource:figma-use,resource:figma-generate-library";

const steps = [
  {
    id: "foundations",
    phase: "foundations",
    title: "Variables, text styles and effect styles",
    page: null,
    generator: "tools/figma/generate-portal-v2-foundations.mjs",
    args: [],
    skillNames: FOUNDATION_SKILLS,
    dependsOn: []
  },
  {
    id: "cover",
    phase: "documentation",
    title: "00 Cover",
    page: "00 Cover",
    generator: "tools/figma/generate-portal-v2-cover.mjs",
    args: [],
    skillNames: SCREEN_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "getting-started",
    phase: "documentation",
    title: "01 Getting Started",
    page: "01 Getting Started",
    generator: "tools/figma/generate-portal-v2-getting-started.mjs",
    args: [],
    skillNames: SCREEN_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "foundations-page",
    phase: "documentation",
    title: "02 Foundations",
    page: "02 Foundations",
    generator: "tools/figma/generate-portal-v2-foundations-page.mjs",
    args: [],
    skillNames: SCREEN_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "components-index",
    phase: "documentation",
    title: "03 Components",
    page: "03 Components",
    generator: "tools/figma/generate-portal-v2-index-page.mjs",
    args: ["components"],
    skillNames: SCREEN_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "utilities-index",
    phase: "documentation",
    title: "04 Utilities",
    page: "04 Utilities",
    generator: "tools/figma/generate-portal-v2-index-page.mjs",
    args: ["utilities"],
    skillNames: SCREEN_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "button",
    phase: "components",
    title: "05 Component · Button",
    page: "05 Component · Button",
    generator: "tools/figma/generate-portal-v2-button-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "verification-status",
    phase: "components",
    title: "06 Component · Verification Status",
    page: "06 Component · Verification Status",
    generator: "tools/figma/generate-portal-v2-verification-status-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "form-field",
    phase: "components",
    title: "07 Component · Form Field",
    page: "07 Component · Form Field",
    generator: "tools/figma/generate-portal-v2-form-field-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "faq-accordion",
    phase: "components",
    title: "08 Component · FAQ Accordion",
    page: "08 Component · FAQ Accordion",
    generator: "tools/figma/generate-portal-v2-faq-accordion-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "brand",
    phase: "components",
    title: "09 Component · Brand",
    page: "09 Component · Brand",
    generator: "tools/figma/generate-portal-v2-brand-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "top-navigation",
    phase: "components",
    title: "10 Component · Top Navigation",
    page: "10 Component · Top Navigation",
    generator: "tools/figma/generate-portal-v2-top-navigation-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["button", "brand"]
  },
  {
    id: "project-card",
    phase: "components",
    title: "11 Component · Project Card",
    page: "11 Component · Project Card",
    generator: "tools/figma/generate-portal-v2-project-card-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["button", "verification-status"]
  },
  {
    id: "fact-card",
    phase: "components",
    title: "12 Component · Fact Card",
    page: "12 Component · Fact Card",
    generator: "tools/figma/generate-portal-v2-fact-card-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "lead-form-card",
    phase: "components",
    title: "13 Component · Lead Form Card",
    page: "13 Component · Lead Form Card",
    generator: "tools/figma/generate-portal-v2-lead-form-card-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["button", "form-field"]
  },
  {
    id: "homepage-hero",
    phase: "screens",
    title: "14 Screen · Homepage Hero",
    page: "14 Screen · Homepage Hero",
    generator: "tools/figma/generate-portal-v2-homepage-hero-screen.mjs",
    args: [],
    skillNames: SCREEN_SKILLS,
    dependsOn: ["top-navigation", "button", "fact-card", "lead-form-card"]
  },
  {
    id: "scenario-card",
    phase: "components",
    title: "15 Component · Scenario Card",
    page: "15 Component · Scenario Card",
    generator: "tools/figma/generate-portal-v2-scenario-card-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["button"]
  },
  {
    id: "homepage-start-objects",
    phase: "screens",
    title: "16 Screen · Homepage Start & Objects",
    page: "16 Screen · Homepage Start & Objects",
    generator: "tools/figma/generate-portal-v2-homepage-start-objects-screen.mjs",
    args: [],
    skillNames: SCREEN_SKILLS,
    dependsOn: ["scenario-card", "project-card", "button"]
  },
  {
    id: "content-card",
    phase: "components",
    title: "17 Component · Content Card",
    page: "17 Component · Content Card",
    generator: "tools/figma/generate-portal-v2-content-card-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["button"]
  },
  {
    id: "homepage-apartments-outcomes",
    phase: "screens",
    title: "18 Screen · Homepage Apartments & Outcomes",
    page: "18 Screen · Homepage Apartments & Outcomes",
    generator: "tools/figma/generate-portal-v2-homepage-apartments-outcomes-screen.mjs",
    args: [],
    skillNames: SCREEN_SKILLS,
    dependsOn: ["content-card", "button"]
  },
  {
    id: "step-card",
    phase: "components",
    title: "19 Component · Step Card",
    page: "19 Component · Step Card",
    generator: "tools/figma/generate-portal-v2-step-card-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "homepage-process-purchase",
    phase: "screens",
    title: "20 Screen · Homepage Process & Purchase",
    page: "20 Screen · Homepage Process & Purchase",
    generator: "tools/figma/generate-portal-v2-homepage-process-purchase-screen.mjs",
    args: [],
    skillNames: SCREEN_SKILLS,
    dependsOn: ["step-card", "button"]
  },
  {
    id: "link-card",
    phase: "components",
    title: "21 Component · Link Card",
    page: "21 Component · Link Card",
    generator: "tools/figma/generate-portal-v2-link-card-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["foundations"]
  },
  {
    id: "homepage-purchase-resources",
    phase: "screens",
    title: "22 Screen · Homepage Purchase & Resources",
    page: "22 Screen · Homepage Purchase & Resources",
    generator: "tools/figma/generate-portal-v2-homepage-purchase-resources-screen.mjs",
    args: [],
    skillNames: SCREEN_SKILLS,
    dependsOn: ["link-card"]
  },
  {
    id: "homepage-faq-lead",
    phase: "screens",
    title: "23 Screen · Homepage FAQ & Lead",
    page: "23 Screen · Homepage FAQ & Lead",
    generator: "tools/figma/generate-portal-v2-homepage-faq-lead-screen.mjs",
    args: [],
    skillNames: SCREEN_SKILLS,
    dependsOn: ["faq-accordion", "button", "lead-form-card"]
  },
  {
    id: "site-footer",
    phase: "components",
    title: "24 Component · Site Footer",
    page: "24 Component · Site Footer",
    generator: "tools/figma/generate-portal-v2-site-footer-components.mjs",
    args: [],
    skillNames: COMPONENT_SKILLS,
    dependsOn: ["brand"]
  },
  {
    id: "homepage-full",
    phase: "screens",
    title: "25 Screen · Homepage Full",
    page: "25 Screen · Homepage Full",
    generator: "tools/figma/generate-portal-v2-homepage-full-screen.mjs",
    args: [],
    skillNames: "resource:figma-use,resource:figma-generate-library,resource:figma-generate-design",
    dependsOn: [
      "top-navigation",
      "button",
      "fact-card",
      "lead-form-card",
      "scenario-card",
      "project-card",
      "content-card",
      "step-card",
      "link-card",
      "faq-accordion",
      "site-footer"
    ]
  },
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
  },
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

];

function runGenerator(step) {
  const generatorPath = path.join(ROOT, step.generator);
  if (!fs.existsSync(generatorPath)) {
    throw new Error(`Missing generator: ${step.generator}`);
  }

  const result = spawnSync(process.execPath, [generatorPath, ...step.args], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024
  });

  if (result.status !== 0) {
    throw new Error(`${step.generator} failed: ${result.stderr.trim()}`);
  }

  const code = result.stdout || "";
  if (!code.trim()) throw new Error(`${step.generator} generated empty output`);
  if (code.length > 50000) {
    throw new Error(`${step.generator} exceeds Figma.use_figma limit: ${code.length}`);
  }
  return code;
}

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const builtAt = new Date().toISOString();
const manifestSteps = [];

for (let index = 0; index < steps.length; index += 1) {
  const step = steps[index];
  const order = index + 1;
  const code = runGenerator(step);
  const fileName = `${String(order).padStart(2, "0")}-${step.id}.js`;
  const sha256 = crypto.createHash("sha256").update(code, "utf8").digest("hex");
  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), code, "utf8");
  manifestSteps.push({
    order,
    id: step.id,
    phase: step.phase,
    title: step.title,
    page: step.page,
    generator: step.generator,
    args: step.args,
    file: fileName,
    bytes: Buffer.byteLength(code, "utf8"),
    characters: code.length,
    sha256,
    skillNames: step.skillNames,
    dependsOn: step.dependsOn
  });
}

const manifest = {
  schemaVersion: "1.0",
  designSystem: "Portal v2 · Городской навигатор",
  figmaFileKey: "rhFYa5gPDhF009hZsfEGSX",
  figmaFileUrl: "https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX",
  builtAt,
  stepCount: manifestSteps.length,
  executionMode: "one Figma.use_figma call per numbered JavaScript file",
  constraints: {
    maxCharactersPerCall: 50000,
    maxPageSwitchesPerCall: 1,
    stopOnError: true,
    preserveOrder: true
  },
  steps: manifestSteps
};

fs.writeFileSync(
  path.join(OUTPUT_DIR, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

const readme = [
  "# Figma Execution Pack",
  "",
  `Generated: ${builtAt}`,
  "",
  "Run the numbered JavaScript files in ascending order. Use one Figma.use_figma call per file.",
  "Stop immediately if a call fails. Do not skip dependencies or combine payloads.",
  "",
  "Target file: https://www.figma.com/design/rhFYa5gPDhF009hZsfEGSX",
  "",
  "| # | Step | Page | Payload | Characters | SHA-256 |",
  "|---:|---|---|---|---:|---|",
  ...manifestSteps.map((step) =>
    `| ${step.order} | ${step.id} | ${step.page || "Variables & styles"} | ${step.file} | ${step.characters} | \`${step.sha256}\` |`
  ),
  "",
  "After the final step, collect metadata and screenshots for Homepage Full and Catalog in Desktop and Mobile, then record node IDs in issue #116."
].join("\n");

fs.writeFileSync(path.join(OUTPUT_DIR, "README.md"), `${readme}\n`, "utf8");

process.stdout.write(`${JSON.stringify({ outputDir: OUTPUT_DIR, stepCount: manifestSteps.length, manifest: path.join(OUTPUT_DIR, "manifest.json") })}\n`);
