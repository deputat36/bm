import fs from "node:fs";

const docPath = "docs/portal/PROJECT_VERIFICATION_READINESS.md";
let doc = fs.readFileSync(docPath, "utf8");
const marker = "Дата проверки: 2026-07-18\n";
const insertion = "Дата проверки: 2026-07-18\n\nСтатус документа: исторический снимок состояния verification-профилей на указанную дату. Актуальное состояние не должно выводиться из чисел ниже вручную; текущий отчёт формируется командой `npm run projects:readiness`.\n";
if (doc.split(marker).length - 1 !== 1) throw new Error("Project readiness doc date marker mismatch");
doc = doc.replace(marker, insertion);
fs.writeFileSync(docPath, doc, "utf8");

const packagePath = "package.json";
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
if (!pkg.scripts?.["validate:project-readiness"]) throw new Error("validate:project-readiness script missing");
pkg.scripts["validate:project-readiness"] = "node --check tools/validate-project-readiness-report.mjs && node --check tools/build-project-readiness-report.mjs && node tools/validate-project-readiness-report.mjs && node tools/build-project-readiness-report.mjs --format=json > /tmp/project-readiness-report.json && node -e 'const fs=require(\"fs\"); const data=JSON.parse(fs.readFileSync(\"/tmp/project-readiness-report.json\",\"utf8\")); const rows=Array.isArray(data.projects)?data.projects:[]; const s=data.summary||{}; if(rows.length!==3||s.total_projects!==3) process.exit(1); const statusTotal=Number(s.public_ready||0)+Number(s.requires_recheck||0)+Number(s.requires_sources||0); if(statusTotal!==3) process.exit(1); const publicRows=rows.filter(r=>r.is_public_ready===true).length; if(Number(s.public_ready||0)!==publicRows) process.exit(1); const notPublic=rows.filter(r=>r.is_public_ready!==true).length; if(Number(s.projects_with_noindex||0)<notPublic) process.exit(1); if(rows.some(r=>r.is_public_ready!==true&&r.page_noindex!==true)) process.exit(1); console.log(`Project readiness rows: ${rows.length}; public_ready=${s.public_ready}; recheck=${s.requires_recheck}; sources=${s.requires_sources}; noindex=${s.projects_with_noindex}`);'";
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

console.log("Project readiness documentation and package checks converted to state-independent invariants.");
