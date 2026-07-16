import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const REGISTRY_PATH = "data/content/guides.json";
const REPORT_SCRIPT = "tools/build-launch-readiness-report.mjs";
const errors = [];

function readJson(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${relativePath}: file does not exist`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function buildReport() {
  try {
    const output = execFileSync(process.execPath, [REPORT_SCRIPT, "--format=json"], {
      cwd: ROOT,
      encoding: "utf8"
    });
    return JSON.parse(output);
  } catch (error) {
    errors.push(`${REPORT_SCRIPT}: cannot build JSON report: ${error.message}`);
    return null;
  }
}

const registry = readJson(REGISTRY_PATH);
const report = buildReport();
if (!registry || !report) process.exit(1);

const guides = Array.isArray(registry.guides) ? registry.guides : [];
const ready = guides.filter((item) => item.indexing_status === "ready").length;
const blocked = guides.filter((item) => item.indexing_status === "blocked").length;
const sourceVerified = guides.filter((item) => item.source_status === "verified_on_date").length;
const sourcePending = guides.filter((item) => item.source_status === "requires_source_review").length;
const sourceNotApplicable = guides.filter((item) => item.source_status === "not_applicable").length;
const editorialPassed = guides.filter((item) => item.editorial_review === "passed").length;
const legalPassed = guides.filter((item) => item.legal_review === "passed").length;
const legalNotApplicable = guides.filter((item) => item.legal_review === "not_applicable").length;

if (guides.length !== 8) errors.push(`${REGISTRY_PATH}: expected 8 guides, found ${guides.length}`);
if (ready !== 0) errors.push(`${REGISTRY_PATH}: current baseline expects index_ready=0, found ${ready}`);
if (blocked !== guides.length) errors.push(`${REGISTRY_PATH}: every current guide must remain blocked`);
if (sourceVerified !== 7 || sourcePending !== 0 || sourceNotApplicable !== 1) {
  errors.push(`${REGISTRY_PATH}: unexpected source status counts`);
}
if (editorialPassed !== 1) errors.push(`${REGISTRY_PATH}: expected one editorially passed guide`);
if (legalPassed !== 0) errors.push(`${REGISTRY_PATH}: legal review must not be implied`);

const gate = Array.isArray(report.gates)
  ? report.gates.find((item) => item.id === "guide_content_publication")
  : null;
const profile = Array.isArray(report.profiles)
  ? report.profiles.find((item) => item.id === "seo_guide_indexing")
  : null;
const metrics = report.metrics?.guides;

if (!gate) errors.push(`${REPORT_SCRIPT}: guide_content_publication gate is missing`);
if (!profile) errors.push(`${REPORT_SCRIPT}: seo_guide_indexing profile is missing`);
if (gate) {
  if (gate.category !== "derived") errors.push(`guide_content_publication: category must be derived`);
  if (gate.scope !== "seo_guide_indexing") errors.push(`guide_content_publication: invalid scope`);
  if (gate.status !== "blocked") errors.push(`guide_content_publication: current status must be blocked`);
  if (gate.evidence_count !== 0) errors.push(`guide_content_publication: evidence_count must equal ready guides`);
  for (const fragment of [
    "ready=0",
    "blocked=8",
    "source_verified=7",
    "source_pending=0",
    "editorial_passed=1",
    "legal_passed_or_na=1",
    "total=8"
  ]) {
    if (!String(gate.details || "").includes(fragment)) {
      errors.push(`guide_content_publication: details missing ${fragment}`);
    }
  }
}
if (profile) {
  const required = Array.isArray(profile.required_gates) ? profile.required_gates : [];
  if (JSON.stringify(required) !== JSON.stringify(["guide_content_publication", "legal_owner_review"])) {
    errors.push(`seo_guide_indexing: unexpected required_gates`);
  }
  if (profile.ready !== false) errors.push(`seo_guide_indexing: current profile must be blocked`);
  if (!Array.isArray(profile.blocked_gates) || !profile.blocked_gates.includes("guide_content_publication")) {
    errors.push(`seo_guide_indexing: guide content blocker is missing`);
  }
  if (!profile.blocked_gates.includes("legal_owner_review")) {
    errors.push(`seo_guide_indexing: legal owner review blocker is missing`);
  }
}
if (!metrics) {
  errors.push(`${REPORT_SCRIPT}: guide metrics are missing`);
} else {
  const expected = {
    total: 8,
    index_ready: 0,
    index_blocked: 8,
    source_verified: 7,
    source_review_required: 0,
    source_not_applicable: 1,
    editorial_passed: 1,
    legal_passed: 0,
    legal_not_applicable: 1,
    ready: false
  };
  for (const [key, value] of Object.entries(expected)) {
    if (metrics[key] !== value) errors.push(`metrics.guides.${key}: expected ${value}, found ${metrics[key]}`);
  }
}

if (report.summary?.total_gates !== 12) errors.push(`summary.total_gates must be 12`);
if (report.summary?.passed !== 1) errors.push(`summary.passed must be 1`);
if (report.summary?.blocked !== 11) errors.push(`summary.blocked must be 11`);
if (report.summary?.total_profiles !== 4) errors.push(`summary.total_profiles must be 4`);
if (report.summary?.ready_profiles !== 0) errors.push(`summary.ready_profiles must be 0`);

console.log(`Guide launch gate: ready=${ready}; blocked=${blocked}; total=${guides.length}`);
console.log(`Guide source status: verified=${sourceVerified}; pending=${sourcePending}; not_applicable=${sourceNotApplicable}`);
console.log(`Guide review status: editorial_passed=${editorialPassed}; legal_passed=${legalPassed}; legal_not_applicable=${legalNotApplicable}`);

if (errors.length) {
  console.error("\nGuide launch gate validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Guide launch gate validation passed.");
