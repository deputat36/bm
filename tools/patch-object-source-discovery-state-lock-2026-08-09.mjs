import fs from "node:fs";

const file = "tools/validate-object-source-discovery.mjs";
let source = fs.readFileSync(file, "utf8");

const before = `    const missingTasks = (queueProject.tasks || []).filter((item) => item.status === "missing");
    if (queueProject.collection_status !== "blocked" || missingTasks.length !== 5) {
      errors.push(\`${QUEUE_PATH}:\${projectId}: source queue must remain blocked with 5 missing tasks\`);
    }`;

const after = `    const queueTasks = Array.isArray(queueProject.tasks) ? queueProject.tasks : [];
    const pendingStatuses = new Set(["missing", "candidate_found", "review_required", "rejected"]);
    const pendingTasks = queueTasks.filter((item) => pendingStatuses.has(item.status));
    if (queueTasks.length !== 5) {
      errors.push(\`${QUEUE_PATH}:\${projectId}: expected 5 registered source tasks\`);
    }
    if (pendingTasks.length > 0 && !["blocked", "in_progress"].includes(queueProject.collection_status)) {
      errors.push(\`${QUEUE_PATH}:\${projectId}: pending source tasks require blocked or in_progress collection status\`);
    }
    if (pendingTasks.length === 0 && queueProject.collection_status !== "ready_for_review") {
      errors.push(\`${QUEUE_PATH}:\${projectId}: completed source queue must be ready_for_review\`);
    }`;

const occurrences = source.split(before).length - 1;
if (occurrences !== 1) throw new Error(`expected exactly one state-lock block, found ${occurrences}`);
source = source.replace(before, after);
fs.writeFileSync(file, source);
