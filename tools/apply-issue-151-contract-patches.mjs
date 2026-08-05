import fs from "node:fs";

function replaceRequired(file, before, after) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes(before)) throw new Error(`${file}: missing required fragment: ${before.slice(0, 120)}`);
  fs.writeFileSync(file, source.replace(before, after));
}

const packagePath = "package.json";
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.scripts["validate:analytics-contract"] = "node --check tools/validate-form-analytics-contract.mjs && node tools/validate-form-analytics-contract.mjs";
pkg.scripts["validate:storage-failure"] = "node --check tools/validate-storage-failure.mjs && node tools/validate-storage-failure.mjs";
pkg.scripts["validate:launch-readiness"] = "node --check tools/validate-launch-gates.mjs && node --check tools/build-launch-readiness-report.mjs && node --check tools/validate-launch-operations-gate.mjs && node --check tools/validate-guide-launch-gate.mjs && node --check tools/validate-launch-readiness-invariants.mjs && node tools/validate-launch-gates.mjs && node tools/validate-launch-operations-gate.mjs && node tools/validate-guide-launch-gate.mjs && node tools/validate-launch-readiness-invariants.mjs";
pkg.scripts["validate:analytics"] = "node tools/validate-analytics-events.mjs && npm run validate:analytics-funnel && npm run validate:analytics-contract";
pkg.scripts["validate:analytics-debug"] = "node tools/validate-analytics-debug-mode.mjs && npm run validate:conversion-runtime && npm run validate:storage-failure";
for (const command of [
  "node tools/validate-form-analytics-contract.mjs",
  "node tools/validate-storage-failure.mjs",
  "node tools/validate-launch-readiness-invariants.mjs"
]) {
  if (!pkg.scripts.validate.includes(command)) pkg.scripts.validate += ` && ${command}`;
}
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

const qaWorkflow = ".github/workflows/form-qa-execution-pack-guard.yml";
let qaSource = fs.readFileSync(qaWorkflow, "utf8");
qaSource = qaSource.replaceAll(
  '      - "package.json"',
  '      - "tools/validate-launch-readiness-invariants.mjs"\n      - "package.json"'
);
qaSource = qaSource.replace(
  '          node --check tools/validate-form-qa-execution-pack.mjs',
  '          node --check tools/validate-form-qa-execution-pack.mjs\n          node --check tools/validate-launch-readiness-invariants.mjs'
);
qaSource = qaSource.replace(
  '      - name: Generate execution pack',
  '      - name: Validate readiness invariants\n        run: node tools/validate-launch-readiness-invariants.mjs\n\n      - name: Generate execution pack'
);
qaSource = qaSource.replace(
  'if(data.status!=="execution_pack_only_no_implied_results"||data.summary?.scenarios!==14||data.summary?.devices!==3||data.summary?.total_slots!==42||data.summary?.slot_checks!==10||data.summary?.device_resilience_cases!==6||data.summary?.recorded_results!==0||data.summary?.by_status?.not_run!==42) process.exit(1);',
  'const counts=data.summary?.by_status||{}; const total=["passed","failed","blocked","not_run"].reduce((sum,key)=>sum+Number(counts[key]||0),0); if(data.status!=="execution_pack_only_no_implied_results"||data.summary?.scenarios!==14||data.summary?.devices!==3||data.summary?.total_slots!==42||data.summary?.slot_checks!==10||data.summary?.device_resilience_cases!==6||total!==42||Number(data.summary?.recorded_results||0)+Number(counts.not_run||0)!==42) process.exit(1);'
);
if (qaSource.includes("recorded_results!==0") || qaSource.includes("by_status?.not_run!==42")) throw new Error("form QA workflow state lock remains");
fs.writeFileSync(qaWorkflow, qaSource);

const thankyouPath = "spasibo/index.html";
replaceRequired(
  thankyouPath,
  '          residential_complex_id: context.objectId,\n          attribution_source: context.source',
  '          residential_complex_id: context.objectId,\n          object_id: context.objectId,\n          placement: context.placement,\n          attribution_source: context.source'
);
replaceRequired(
  thankyouPath,
  '      const context = { type, formId, formRole, objectId, source: attributionSource };',
  '      const placement = matchesStoredLead ? String(lastLead.placement || "") : "";\n      const context = { type, formId, formRole, objectId, placement, source: attributionSource };'
);
replaceRequired(
  thankyouPath,
  '        residential_complex_id: objectId,\n        qualification_status: status,',
  '        residential_complex_id: objectId,\n        object_id: objectId,\n        placement,\n        qualification_status: status,'
);
replaceRequired(
  thankyouPath,
  '        form_role: formRole || ""\n      });',
  '        form_role: formRole || "",\n        object_id: objectId || "",\n        placement: placement || ""\n      });'
);

const eventsPath = "data/analytics/events.json";
const registry = JSON.parse(fs.readFileSync(eventsPath, "utf8"));
registry.schema_version = "1.5";
registry.updated_at = "2026-08-05";
const mandatoryEvents = new Set(["lead_form_view", "lead_form_start", "lead_submit", "lead_submit_classified", "lead_thankyou_view"]);
const mandatoryFields = ["form_id", "form_role", "lead_type", "object_id", "placement"];
for (const event of registry.events || []) {
  if (!mandatoryEvents.has(event.id)) continue;
  event.required_fields = [...new Set([...(event.required_fields || []), ...mandatoryFields])];
  event.optional_fields = (event.optional_fields || []).filter((field) => !mandatoryFields.includes(field));
  event.contains_personal_data = false;
  event.contains_restricted_technical_id = false;
  if (event.id === "lead_form_view") event.implementation_fragments = [
    'sendConversionEvent("lead_form_view", getFormDetails(form))', "form_id:", "form_role:", "lead_type:", "object_id:", "placement:"
  ];
  if (event.id === "lead_form_start") event.implementation_fragments = [
    'sendConversionEvent("lead_form_start", getFormDetails(form))', "startedForms.add(form)", "object_id:", "placement:"
  ];
  if (event.id === "lead_submit") event.implementation_fragments = [
    "const publicPayload = {", 'event: "lead_submit"', "form_id:", "form_role:", "lead_type:", "object_id:", "placement:", "window.dataLayer.push(publicPayload)"
  ];
  if (event.id === "lead_submit_classified") event.implementation_fragments = [
    'sendConversionEvent("lead_submit_classified"', "form_id:", "form_role:", "lead_type:", "object_id:", "placement:"
  ];
  if (event.id === "lead_thankyou_view") event.implementation_fragments = [
    'event: "lead_thankyou_view"', "form_id:", "form_role:", "lead_type:", "object_id:", "placement:"
  ];
}
registry.rules.storage_failure_test_mode = {
  storage_fail: ["local", "session"],
  requires: { lead_test: "dry-run", analytics_test: "debug", test_ack: "1" },
  external_delivery_suppressed: true
};
fs.writeFileSync(eventsPath, `${JSON.stringify(registry, null, 2)}\n`);

for (const file of ["tools/validate-guide-launch-gate.mjs", "tools/validate-launch-operations-gate.mjs"]) {
  let source = fs.readFileSync(file, "utf8");
  source = source.replace(/if \(report\.summary\?\.passed !== 1\)[^\n]*\n/g, "");
  source = source.replace(/if \(report\.summary\?\.blocked !== 11\)[^\n]*\n/g, "");
  const marker = 'if (report.summary?.total_profiles !== 4)';
  if (source.includes(marker) && !source.includes("gate status counts must match total_gates")) {
    source = source.replace(marker, 'const gateStatusTotal = ["passed", "blocked", "in_review", "not_applicable"].reduce((sum, key) => sum + Number(report.summary?.[key] || 0), 0);\nif (gateStatusTotal !== report.summary?.total_gates) errors.push("gate status counts must match total_gates");\n' + marker);
  }
  fs.writeFileSync(file, source);
}

let leadSourceValidator = fs.readFileSync("tools/validate-lead-source-output.mjs", "utf8");
leadSourceValidator = leadSourceValidator.replace(
  'if (!event.optional_fields?.includes(field)) errors.push(`${REGISTRY_PATH}:${label}: нет ${field}`);',
  'const declaredFields = new Set([...(event.required_fields || []), ...(event.optional_fields || [])]);\n    if (!declaredFields.has(field)) errors.push(`${REGISTRY_PATH}:${label}: нет ${field}`);'
);
fs.writeFileSync("tools/validate-lead-source-output.mjs", leadSourceValidator);

let debugValidator = fs.readFileSync("tools/validate-analytics-debug-mode.mjs", "utf8");
debugValidator = debugValidator.replace("  'sessionStorage.setItem',", "  'storageSet(\"session\", STORAGE_KEY',");
debugValidator = debugValidator.replace(
  'const sendEventEnd = conversionScript.indexOf("function getFormDetails", sendEventStart);',
  'const sendEventEnd = conversionScript.indexOf("function enrichMortgageLinks", sendEventStart);'
);
fs.writeFileSync("tools/validate-analytics-debug-mode.mjs", debugValidator);

let runtimeValidator = fs.readFileSync("tools/validate-conversion-runtime.mjs", "utf8");
runtimeValidator = runtimeValidator.replaceAll(
  'loadPortalScript(schemaScriptUrl, "conversion-tracking.js")',
  'loadPortalScript(schemaScriptUrl, "conversion-tracking.js", { ordered: true })'
);
fs.writeFileSync("tools/validate-conversion-runtime.mjs", runtimeValidator);

console.log("Patched issue #151 contracts and dynamic validators.");
