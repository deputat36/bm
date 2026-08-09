import fs from "node:fs";

const file = "package.json";
const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
if (!pkg.scripts?.["validate:lead-operations-approval"]) {
  throw new Error("validate:lead-operations-approval script missing");
}

pkg.scripts["validate:lead-operations-approval"] = "node --check tools/validate-lead-operations-approval.mjs && node --check tools/build-lead-operations-approval-report.mjs && node tools/validate-lead-operations-approval.mjs && node tools/build-lead-operations-approval-report.mjs --format=json > /tmp/lead-operations-approval.json && node -e 'const fs=require(\"fs\"); const data=JSON.parse(fs.readFileSync(\"/tmp/lead-operations-approval.json\",\"utf8\")); const s=data.summary||{}; if(s.total_decisions!==8||s.required_operational_fields!==13||s.activation_gates!==7) process.exit(1); const total=Number(s.approved_decisions||0)+Number(s.pending_decisions||0)+Number(s.rejected_decisions||0)+Number(s.superseded_decisions||0); if(total!==8) process.exit(1); const ready=s.activation_enabled===true&&s.all_decisions_approved===true&&s.approved_decisions===8&&s.pending_decisions===0&&s.rejected_decisions===0&&s.superseded_decisions===0; const expected=ready?\"operational_activation_ready_for_controlled_test\":\"owner_decisions_required_not_operational\"; if(data.status!==expected) process.exit(1); console.log(`Owner decisions: ${s.approved_decisions}/${s.total_decisions}; pending=${s.pending_decisions}; rejected=${s.rejected_decisions}; superseded=${s.superseded_decisions}; activation=${s.activation_enabled}; status=${data.status}`);'";

fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
console.log("Operations approval package script converted to structural invariants.");
