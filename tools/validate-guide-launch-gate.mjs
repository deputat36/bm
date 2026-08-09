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

function exactSet(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    errors.push(`${label}: expected ${right.join(", ")}; got ${left.join(", ")}`);
  }
}

const registry = readJson(REGISTRY_PATH);
const report = buildReport();
if (!registry || !report) process.exit(1);

const guides = Array.isArray(registry.guides) ? registry.guides : [];
const readyGuides = guides.filter((item) => item.indexing_status === "ready");
const blockedGuides = guides.filter((item) => item.indexing_status === "blocked");
const ready = readyGuides.length;
const blocked = blockedGuides.length;
const sourceVerified = guides.filter((item) => item.source_status === "verified_on_date").length;
const sourcePending = guides.filter((item) => item.source_status === "requires_source_review").length;
const sourceNotApplicable = guides.filter((item) => item.source_status === "not_applicable").length;
const editorialPassed = guides.filter((item) => item.editorial_review === "passed").length;
const legalPassed = guides.filter((item) => item.legal_review === "passed").length;
const legalNotApplicable = guides.filter((item) => item.legal_review === "not_applicable").length;

if (guides.length !== 8) errors.push(`${REGISTRY_PATH}: expected 8 guides, found ${guides.length}`);
if (ready + blocked !== guides.length) errors.push(`${REGISTRY_PATH}: ready + blocked must equal total guides`);
if (sourceVerified + sourcePending + sourceNotApplicable !== guides.length) {
  errors.push(`${REGISTRY_PATH}: source status counts must equal total guides`);
}

for (const guide of readyGuides) {
  const label = `${REGISTRY_PATH}:${guide.id}`;
  if (!["verified_on_date", "not_applicable"].includes(guide.source_status)) {
    errors.push(`${label}: ready guide requires accepted source status`);
  }
  if (guide.editorial_review !== "passed") {
    errors.push(`${label}: ready guide requires editorial_review=passed`);
  }
  if (!["passed", "not_applicable"].includes(guide.legal_review)) {
    errors.push(`${label}: ready guide requires legal review passed or not_applicable`);
  }
}

const allContentReady = guides.length === 8
  && ready === guides.length
  && blocked === 0
  && sourcePending === 0
  && editorialPassed === guides.length
  && legalPassed + legalNotApplicable === guides.length;

const gates = Array.isArray(report.gates) ? report.gates : [];
const profiles = Array.isArray(report.profiles) ? report.profiles : [];
const gate = gates.find((item) => item.id === "guide_content_publication");
const profile = profiles.find((item) => item.id === "seo_guide_indexing");
const metrics = report.metrics?.guides;

if (!gate) errors.push(`${REPORT_SCRIPT}: guide_content_publication gate is missing`);
if (!profile) errors.push(`${REPORT_SCRIPT}: seo_guide_indexing profile is missing`);

if (gate) {
  if (gate.category !== "derived") errors.push("guide_content_publication: category must be derived");
  if (gate.scope !== "seo_guide_indexing") errors.push("guide_content_publication: invalid scope");
  const expectedStatus = allContentReady ? "passed" : "blocked";
  if (gate.status !== expectedStatus) {
    errors.push(`guide_content_publication: expected status=${expectedStatus}, found ${gate.status}`);
  }
  if (gate.evidence_count !== ready) {
    errors.push(`guide_content_publication: evidence_count must equal ready guides (${ready})`);
  }
  for (const fragment of [
    `ready=${ready}`,
    `blocked=${blocked}`,
    `source_verified=${sourceVerified}`,
    `source_pending=${sourcePending}`,
    `editorial_passed=${editorialPassed}`,
    `legal_passed_or_na=${legalPassed + legalNotApplicable}`,
    `total=${guides.length}`
  ]) {
    if (!String(gate.details || "").includes(fragment)) {
      errors.push(`guide_content_publication: details missing ${fragment}`);
    }
  }
}

if (profile) {
  const required = Array.isArray(profile.required_gates) ? profile.required_gates : [];
  if (JSON.stringify(required) !== JSON.stringify(["guide_content_publication", "legal_owner_review"])) {
    errors.push("seo_guide_indexing: unexpected required_gates");
  }

  const gateMap = new Map(gates.map((item) => [item.id, item]));
  const missing = required.filter((id) => !gateMap.has(id));
  const expectedBlocked = required.filter((id) => {
    const status = gateMap.get(id)?.status;
    return status && !["passed", "not_applicable"].includes(status);
  });
  const expectedPassed = required.filter((id) => {
    const status = gateMap.get(id)?.status;
    return ["passed", "not_applicable"].includes(status);
  });
  const expectedReady = missing.length === 0 && expectedBlocked.length === 0;

  if (profile.ready !== expectedReady) {
    errors.push(`seo_guide_indexing: expected ready=${expectedReady}, found ${profile.ready}`);
  }
  exactSet(new Set(profile.blocked_gates || []), new Set(expectedBlocked), "seo_guide_indexing: blocked_gates");
  exactSet(new Set(profile.passed_gates || []), new Set(expectedPassed), "seo_guide_indexing: passed_gates");
  exactSet(new Set(profile.missing_gates || []), new Set(missing), "seo_guide_indexing: missing_gates");
}

if (!metrics) {
  errors.push(`${REPORT_SCRIPT}: guide metrics are missing`);
} else {
  const expected = {
    total: guides.length,
    index_ready: ready,
    index_blocked: blocked,
    source_verified: sourceVerified,
    source_review_required: sourcePending,
    source_not_applicable: sourceNotApplicable,
    editorial_passed: editorialPassed,
    legal_passed: legalPassed,
    legal_not_applicable: legalNotApplicable,
    ready: allContentReady
  };
  for (const [key, value] of Object.entries(expected)) {
    if (metrics[key] !== value) errors.push(`metrics.guides.${key}: expected ${value}, found ${metrics[key]}`);
  }
}

const summary = report.summary || {};
const gateStatusTotal = ["passed", "blocked", "in_review", "not_applicable"]
  .reduce((sum, key) => sum + Number(summary[key] || 0), 0);
if (gateStatusTotal !== Number(summary.total_gates || 0)) errors.push("gate status counts must match total_gates");
if (Number(summary.total_gates || 0) !== gates.length) errors.push("summary.total_gates must equal gates.length");
if (Number(summary.total_profiles || 0) !== profiles.length) errors.push("summary.total_profiles must equal profiles.length");
if (Number(summary.ready_profiles || 0) !== profiles.filter((item) => item.ready).length) {
  errors.push("summary.ready_profiles must match ready profiles");
}

console.log(`Guide launch gate: ready=${ready}; blocked=${blocked}; total=${guides.length}`);
console.log(`Guide source status: verified=${sourceVerified}; pending=${sourcePending}; not_applicable=${sourceNotApplicable}`);
console.log(`Guide review status: editorial_passed=${editorialPassed}; legal_passed=${legalPassed}; legal_not_applicable=${legalNotApplicable}`);
console.log(`Guide content publication status: ${allContentReady ? "passed" : "blocked"}`);

if (errors.length) {
  console.error("\nGuide launch gate validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Guide launch gate validation passed.");
