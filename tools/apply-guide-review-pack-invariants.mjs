import fs from "node:fs";

const file = "package.json";
const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
if (!pkg.scripts || !pkg.scripts["validate:guide-review-pack"]) {
  throw new Error("validate:guide-review-pack script missing");
}

pkg.scripts["validate:guide-review-pack"] = "node --check tools/build-guide-review-pack.mjs && node --check tools/validate-guide-review-pack.mjs && node tools/validate-guide-review-pack.mjs && node tools/build-guide-review-pack.mjs --format=json > /tmp/guide-review-pack.json && node -e 'const fs=require(\"fs\"); const data=JSON.parse(fs.readFileSync(\"/tmp/guide-review-pack.json\",\"utf8\")); const s=data.summary||{}; if(data.status!==\"review_pack_only_no_implied_approval\"||s.total_guides!==8||s.editorial_tasks!==8||s.legal_tasks!==7||s.total_tasks!==15) process.exit(1); const recorded=Number(s.recorded_results||0); const passed=Number(s.passed||0); const failed=Number(s.failed||0); const blocked=Number(s.blocked||0); const notRun=Number(s.not_run||0); if(recorded!==passed+failed+blocked||passed+failed+blocked+notRun!==15||recorded<0||recorded>15) process.exit(1); console.log(`Guide review tasks: ${s.total_tasks}; recorded: ${recorded}; passed: ${passed}; failed: ${failed}; blocked: ${blocked}; not run: ${notRun}`);'";

fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
console.log("Guide review pack package check converted to structural invariants.");
