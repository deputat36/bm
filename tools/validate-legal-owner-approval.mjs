import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILE = "data/legal/legal-owner-approval.json";
const REQUIRED_IDS = [
  "operator_identity",
  "operator_requisites",
  "privacy_contact_channel",
  "retention_policy",
  "withdrawal_deletion_policy",
  "processor_and_notification_channels",
  "advertising_and_independence_review",
  "final_legal_review"
];
const ALLOWED_STATUSES = new Set(["requires_owner_decision", "approved", "rejected", "superseded"]);
const errors = [];

function fail(message) {
  errors.push(message);
}

const fullPath = path.join(ROOT, FILE);
if (!fs.existsSync(fullPath)) {
  console.error(`${FILE}: file missing`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
} catch (error) {
  console.error(`${FILE}: invalid JSON: ${error.message}`);
  process.exit(1);
}

if (data.schema_version !== "1.0") fail("schema_version must be 1.0");
if (data.portal_id !== "newbuilds-borisoglebsk") fail("portal_id mismatch");
if (data.rules?.personal_data_forbidden !== true) fail("personal_data_forbidden must be true");
if (data.rules?.operator_facts_must_not_be_invented !== true) fail("operator_facts_must_not_be_invented must be true");
if (data.rules?.all_required_decisions_must_be_approved !== true) fail("all_required_decisions_must_be_approved must be true");
if (data.rules?.legal_review_required !== true) fail("legal_review_required must be true");

const decisions = Array.isArray(data.decisions) ? data.decisions : [];
if (decisions.length !== REQUIRED_IDS.length) fail(`expected ${REQUIRED_IDS.length} decisions, got ${decisions.length}`);
const ids = decisions.map((item) => item.id);
if (new Set(ids).size !== ids.length) fail("decision ids must be unique");
for (const id of REQUIRED_IDS) {
  if (!ids.includes(id)) fail(`missing required decision: ${id}`);
}

for (const decision of decisions) {
  if (!ALLOWED_STATUSES.has(decision.status)) fail(`${decision.id}: invalid status ${decision.status}`);
  if (!decision.title) fail(`${decision.id}: title missing`);
  if (!decision.question) fail(`${decision.id}: question missing`);
  if (!Array.isArray(decision.required_for) || decision.required_for.length === 0) fail(`${decision.id}: required_for missing`);

  if (decision.status === "approved") {
    if (decision.approved_value === null || decision.approved_value === undefined || String(decision.approved_value).trim() === "") {
      fail(`${decision.id}: approved decision requires approved_value`);
    }
    if (!decision.checked_at) fail(`${decision.id}: approved decision requires checked_at`);
    if (!decision.basis) fail(`${decision.id}: approved decision requires basis`);
  } else if (decision.approved_value !== null) {
    fail(`${decision.id}: non-approved decision must keep approved_value=null`);
  }
}

const approved = decisions.filter((item) => item.status === "approved").length;
const pending = decisions.filter((item) => item.status === "requires_owner_decision").length;
const rejected = decisions.filter((item) => item.status === "rejected").length;
const allApproved = decisions.length === REQUIRED_IDS.length && approved === decisions.length && rejected === 0;
const activationEnabled = data.rules?.final_legal_publication_enabled === true;

if (activationEnabled && !allApproved) {
  fail("final_legal_publication_enabled cannot be true until all required decisions are approved");
}
if (data.status === "approved_for_final_publication" && (!allApproved || !activationEnabled)) {
  fail("approved_for_final_publication requires all decisions approved and explicit activation");
}
if (!allApproved && data.status === "approved_for_final_publication") {
  fail("current status overstates legal readiness");
}

const serialized = JSON.stringify(data).toLowerCase();
for (const placeholder of ["todo", "tbd", "example.com", "ооо ромашка", "иван иванов"]) {
  if (serialized.includes(placeholder)) fail(`placeholder-like value forbidden: ${placeholder}`);
}

console.log(`Legal owner decisions: ${approved}/${decisions.length} approved; pending=${pending}; rejected=${rejected}; activation=${activationEnabled}`);

if (errors.length) {
  console.error("\nLegal owner approval validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Legal owner approval contract passed structural validation.");
