import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_PATH = "data/operations/lead-operations-approval.json";

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function parseArgs(argv) {
  const formatArg = argv.find((item) => item.startsWith("--format="));
  return { format: formatArg ? formatArg.split("=")[1] : "text" };
}

function buildReport(spec) {
  const decisions = Array.isArray(spec.decisions) ? spec.decisions : [];
  const byStatus = decisions.reduce((result, item) => {
    const status = String(item.status || "unknown");
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {});
  const approved = byStatus.approved || 0;
  const pending = byStatus.requires_owner_decision || 0;
  const activationEnabled = spec.rules?.operational_activation_enabled === true;
  const allApproved = decisions.length > 0 && approved === decisions.length;

  return {
    schema_version: spec.schema_version,
    generated_at: new Date().toISOString(),
    portal_id: spec.portal_id,
    status: activationEnabled && allApproved
      ? "operational_activation_ready_for_controlled_test"
      : "owner_decisions_required_not_operational",
    summary: {
      total_decisions: decisions.length,
      approved_decisions: approved,
      pending_decisions: pending,
      rejected_decisions: byStatus.rejected || 0,
      superseded_decisions: byStatus.superseded || 0,
      activation_enabled: activationEnabled,
      all_decisions_approved: allApproved,
      required_operational_fields: Array.isArray(spec.required_operational_fields)
        ? spec.required_operational_fields.length
        : 0,
      activation_gates: Array.isArray(spec.activation_gates) ? spec.activation_gates.length : 0
    },
    decisions: decisions.map((item) => ({
      id: item.id,
      decision_type: item.decision_type,
      status: item.status,
      approval_question: item.approval_question,
      hypothesis: item.hypothesis,
      approved_value_present: item.approved_value !== null && item.approved_value !== "",
      secure_reference_present: Boolean(String(item.secure_reference || "").trim()),
      activation_effects: Array.isArray(item.activation_effects) ? item.activation_effects : []
    })),
    activation_gates: spec.activation_gates || [],
    restrictions: {
      real_owner_identity_in_repository_forbidden: spec.rules?.real_owner_identity_in_repository_forbidden === true,
      personal_data_in_decision_register_forbidden: spec.rules?.personal_data_in_decision_register_forbidden === true,
      crm_mutation_enabled: spec.rules?.crm_mutation_enabled === true,
      test_leads_only_until_activation: spec.rules?.test_leads_only_until_activation === true
    }
  };
}

function printText(report) {
  console.log(`Статус: ${report.status}`);
  console.log(`Решения: ${report.summary.approved_decisions}/${report.summary.total_decisions} утверждено`);
  console.log(`Ожидают владельца: ${report.summary.pending_decisions}`);
  console.log(`Операционная активация: ${report.summary.activation_enabled ? "включена" : "выключена"}`);
  console.log("");
  report.decisions.forEach((item) => {
    console.log(`- ${item.id}: ${item.status}`);
    console.log(`  ${item.approval_question}`);
  });
}

const args = parseArgs(process.argv.slice(2));
const report = buildReport(readJson(SPEC_PATH));

if (args.format === "json") {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  printText(report);
}
