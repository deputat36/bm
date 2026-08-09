import fs from "node:fs";

const registryPath = "data/content/guides.json";
const packagePath = "package.json";
const reviewValidatorPath = "tools/validate-guide-review-pack.mjs";

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const guide = registry.guides?.find((item) => item.id === "guide-layout-choice");
if (!guide) throw new Error("guide-layout-choice not found");
if (guide.source_status !== "not_applicable" || guide.legal_review !== "not_applicable") {
  throw new Error("guide-layout-choice source/legal prerequisite mismatch");
}
if (guide.editorial_review !== "requires_review" || guide.indexing_status !== "blocked") {
  throw new Error("guide-layout-choice unexpected pre-patch review/index status");
}

guide.content_checked_at = "2026-08-09";
guide.editorial_review = "passed";
guide.indexing_status = "ready";
registry.updated_at = "2026-08-09";
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
if (!pkg.scripts?.["validate:guide-content"]) throw new Error("validate:guide-content script missing");
pkg.scripts["validate:guide-content"] = "node --check tools/validate-guide-content-registry.mjs && node --check tools/build-guide-content-report.mjs && node tools/validate-guide-content-registry.mjs && node tools/build-guide-content-report.mjs --format=json > /tmp/guide-content-report.json && node -e 'const fs=require(\"fs\"); const data=JSON.parse(fs.readFileSync(\"/tmp/guide-content-report.json\",\"utf8\")); const s=data.summary||{}; if(data.status!==\"editorial_registry_not_publication_approval\"||s.total_guides!==8) process.exit(1); const ready=Number(s.index_ready||0), blocked=Number(s.index_blocked||0), verified=Number(s.source_verified||0), sourcePending=Number(s.source_review_required||0), sourceNA=Number(s.source_not_applicable||0), editorial=Number(s.editorial_passed||0), legal=Number(s.legal_passed||0); if(ready+blocked!==8||verified+sourcePending+sourceNA!==8||editorial<ready||legal<0||legal>8) process.exit(1); console.log(`Guide registry: ${s.total_guides}; ready: ${ready}; blocked: ${blocked}; editorial passed: ${editorial}; legal passed: ${legal}`);'";
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

let validator = fs.readFileSync(reviewValidatorPath, "utf8");
const before = '  if (guide.indexing_status !== "blocked") errors.push(`${PATHS.registry}:${guide.id}: current review pack requires indexing_status=blocked`);';
const after = '  if (!["blocked", "ready"].includes(guide.indexing_status)) errors.push(`${PATHS.registry}:${guide.id}: invalid indexing_status=${guide.indexing_status}`);';
if (validator.split(before).length - 1 !== 1) throw new Error("guide review indexing state-lock target mismatch");
validator = validator.replace(before, after);
fs.writeFileSync(reviewValidatorPath, validator, "utf8");

console.log("guide-layout-choice marked content-ready; guide content/review checks made state-independent.");
