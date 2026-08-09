import fs from "node:fs";

const path = "data/research/source-collection.json";
const registry = JSON.parse(fs.readFileSync(path, "utf8"));
const project = registry.projects?.find((item) => item.project_id === "aerodromnaya-18g");
if (!project) throw new Error("aerodromnaya-18g project is missing");

const task = project.tasks?.find((item) => item.id === "aerodromnaya_18g_developer_entity");
if (!task) throw new Error("aerodromnaya_18g_developer_entity task is missing");

if (task.status !== "missing" || task.reference !== "" || task.verified_at !== null || task.evidence_note !== "") {
  throw new Error("source candidate patch precondition failed: task state changed");
}

// Official PСК page confirms the Borisoglebsk developer entity and active construction queues,
// but does not bind that entity to Aerodromnaya 18G. This is deliberately candidate_found,
// not accepted, so critical claims and publication gates remain blocked.
task.status = "candidate_found";
task.reference = "https://zhbi36.ru/psk/";
task.verified_at = "2026-08-09";
task.evidence_note = "Официальная страница ПСК подтверждает ООО «Первая Строительная Компания» как компанию, созданную для строительства многоквартирных домов в Борисоглебске, и сообщает об открытых продажах во II и III очередях. Однако страница не называет ул. Аэродромную, 18Г и не содержит разрешительной/кадастровой привязки к этому объекту. Поэтому источник зафиксирован только как candidate_found и не подтверждает developer_id или builder_name для 18Г.";

registry.updated_at = "2026-08-09";
fs.writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`);
