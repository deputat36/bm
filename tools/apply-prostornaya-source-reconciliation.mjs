import fs from "node:fs";

const registryPath = "data/research/source-collection.json";
const packagePath = "package.json";
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const project = registry.projects?.find((item) => item.project_id === "tellermanov-sad");
if (!project) throw new Error("tellermanov-sad source collection project not found");

const updates = new Map([
  ["prostornaya_4a_project_declaration", {
    reference: "https://bm36.ru/upload/iblock/8e2/pji4jdt72vhip2subx2vnxmefnnp04hi/%D0%9F%D1%80%D0%BE%D0%B5%D0%BA%D1%82%D0%BD%D0%B0%D1%8F%20%D0%B4%D0%B5%D0%BA%D0%BB%D0%B0%D1%80%D0%B0%D1%86%D0%B8%D1%8F%20%E2%84%9636-001139.pdf",
    verified_at: "2026-07-17",
    evidence_note: "Согласовано с data/verification/prostornaya-4a.json: официальный файл проектной декларации №36-001139 был проверен 2026-07-17. 2026-08-09 повторно подтверждено, что официальный сайт BM Group публикует этот документ в разделе «Документы проекта»."
  }],
  ["prostornaya_4a_building_permit", {
    reference: "https://bm36.ru/upload/iblock/223/dctqd0rd52ty43jgs9jhideyf9gz3c94/%D0%A0%D0%B0%D0%B7%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%BD%D0%B0%20%D1%81%D1%82%D1%80%D0%BE%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D1%81%D1%82%D0%B2%D0%BE.pdf",
    verified_at: "2026-07-17",
    evidence_note: "Согласовано с data/verification/prostornaya-4a.json: официальный файл разрешения №36-04-13-2026 от 2026-06-08 был проверен 2026-07-17. 2026-08-09 повторно подтверждено, что официальный сайт BM Group публикует разрешение в разделе «Документы проекта»."
  }]
]);

for (const [id, update] of updates) {
  const task = project.tasks?.find((item) => item.id === id);
  if (!task) throw new Error(`Source task not found: ${id}`);
  if (task.status !== "missing" || task.reference || task.verified_at !== null || task.evidence_note) {
    throw new Error(`Unexpected pre-patch state for ${id}`);
  }
  task.status = "accepted";
  task.reference = update.reference;
  task.verified_at = update.verified_at;
  task.evidence_note = update.evidence_note;
}
registry.updated_at = "2026-08-09";
fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.scripts["validate:source-collection"] = "node --check tools/validate-source-collection.mjs && node --check tools/build-source-collection-report.mjs && node tools/validate-source-collection.mjs && node tools/build-source-collection-report.mjs --format=json > /tmp/source-collection-report.json && node -e 'const fs=require(\"fs\"); const data=JSON.parse(fs.readFileSync(\"/tmp/source-collection-report.json\",\"utf8\")); if(!Array.isArray(data.tasks)||data.tasks.length!==14||data.summary?.total_projects!==3||data.summary?.total_tasks!==14) process.exit(1); const byStatus=data.summary?.by_status||{}; const statusTotal=Object.values(byStatus).reduce((sum,value)=>sum+Number(value||0),0); if(statusTotal!==14) process.exit(1); const pendingExpected=Number(byStatus.missing||0)+Number(byStatus.candidate_found||0)+Number(byStatus.review_required||0)+Number(byStatus.rejected||0); if(data.summary?.pending_tasks!==pendingExpected) process.exit(1); console.log(`Generated source collection tasks: ${data.tasks.length}; accepted: ${Number(byStatus.accepted||0)}; pending: ${data.summary.pending_tasks}`);'";
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

console.log("Accepted two verified Prostornaya document sources and removed source-collection state lock.");
