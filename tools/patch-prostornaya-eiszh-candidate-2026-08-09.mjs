import fs from "node:fs";

const path = "data/research/source-collection.json";
const registry = JSON.parse(fs.readFileSync(path, "utf8"));
const project = registry.projects?.find((item) => item.project_id === "tellermanov-sad");
if (!project) throw new Error("tellermanov-sad project is missing");

const task = project.tasks?.find((item) => item.id === "prostornaya_4a_eiszh_project_card");
if (!task) throw new Error("prostornaya_4a_eiszh_project_card task is missing");

if (task.status !== "missing" || task.reference !== "" || task.verified_at !== null || task.evidence_note !== "") {
  throw new Error("EISZH candidate patch precondition failed: task state changed");
}
if (String(task.expected_identifiers?.object_id || "") !== "72480") {
  throw new Error("expected EISZH object_id 72480 is missing");
}

task.status = "candidate_found";
task.reference = "https://наш.дом.рф/сервисы/каталог-новостроек/объект/72480";
task.verified_at = "2026-08-09";
task.evidence_note = "Для ранее зафиксированного expected object_id 72480 сформирован точный URL по каноническому публичному маршруту карточек ЕИСЖС. Маршрут подтверждается индексируемыми ссылками на другие объекты, а внешний marketplace маркирует ЖК «Теллерманов сад» как проверенный наш.дом.рф. Однако текущий crawler получает 403 от наш.дом.рф, а содержимое именно карточки 72480 не было независимо прочитано. Поэтому статус только candidate_found: связь ID 72480 с Просторной 4А по содержимому первичного источника ещё должна быть подтверждена.";

registry.updated_at = "2026-08-09";
fs.writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`);
