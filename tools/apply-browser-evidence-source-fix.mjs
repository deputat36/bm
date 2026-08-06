import fs from "node:fs";

const file = "tools/build-browser-qa-evidence.mjs";
let source = fs.readFileSync(file, "utf8");

function replaceRequired(before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing patch target: ${label}`);
  source = source.replace(before, after);
}

replaceRequired(
  'const EXPECTED_HEAD = "d839d7e49df5fe8e04b0b4ac4f524df06244f816";',
  'const SOURCE_HEAD = "d839d7e49df5fe8e04b0b4ac4f524df06244f816";\nconst ARTIFACT_COMMIT = "7842152ae7d8c42d6dae692247cafe5dc995d07f";',
  "source commit constants"
);
replaceRequired(
  'assertEqual(summary.source_commit, EXPECTED_HEAD, "source_commit");',
  'assertEqual(summary.source_commit, ARTIFACT_COMMIT, "source_commit");',
  "artifact commit assertion"
);
replaceRequired(
  '    source_head: EXPECTED_HEAD,\n    merge_commit: MERGE_COMMIT,',
  '    source_head: SOURCE_HEAD,\n    artifact_commit: ARTIFACT_COMMIT,\n    merge_commit: MERGE_COMMIT,',
  "manifest source fields"
);
replaceRequired(
  'Автоматизированная приёмка выполнена на head \\`${EXPECTED_HEAD}\\`, вошедшем в \\`main\\` через PR #154',
  'Автоматизированная приёмка выполнена на head \\`${SOURCE_HEAD}\\`; workflow проверял PR merge-ref \\`${ARTIFACT_COMMIT}\\`. Изменения вошли в \\`main\\` через PR #154',
  "report source text"
);

fs.writeFileSync(file, source, "utf8");
console.log("Evidence generator now separates source head and artifact merge-ref.");
