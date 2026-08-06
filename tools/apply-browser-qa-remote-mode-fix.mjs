import fs from "node:fs";

function patchFile(file, replacements) {
  let source = fs.readFileSync(file, "utf8");
  for (const [before, after, label] of replacements) {
    if (!source.includes(before)) throw new Error(`${file}: missing patch target ${label}`);
    source = source.replace(before, after);
  }
  fs.writeFileSync(file, source, "utf8");
}

patchFile("tools/validate-form-browser-qa-artifact.mjs", [
  [
    "const errors = [];",
    `const errors = [];
const EXPECTED_MODES = new Set(["local_static", "allowlisted_remote"]);
const expectedMode = process.env.QA_EXPECTED_MODE || "local_static";
const expectedOrigin = new URL(process.env.QA_EXPECTED_ORIGIN || "http://127.0.0.1:4173").origin;
if (!EXPECTED_MODES.has(expectedMode)) {
  throw new Error(\`Unsupported QA_EXPECTED_MODE: \${expectedMode}\`);
}`,
    "expected target configuration"
  ],
  [
    `assertEqual(summary.target?.mode, "local_static", "target.mode");`,
    `assertEqual(summary.target?.mode, expectedMode, "target.mode");
assertEqual(summary.target?.origin, expectedOrigin, "target.origin");`,
    "target assertions"
  ]
]);

patchFile(".github/workflows/form-browser-qa.yml", [
  [
    `          if [[ "$EVENT_NAME" == "workflow_dispatch" && -n "$REQUESTED_BASE_URL" ]]; then
            printf 'QA_BASE_URL=%s\\n' "$REQUESTED_BASE_URL" >> "$GITHUB_ENV"
            echo 'QA_START_SERVER=0' >> "$GITHUB_ENV"
          else
            echo 'QA_BASE_URL=http://127.0.0.1:4173' >> "$GITHUB_ENV"
            echo 'QA_START_SERVER=1' >> "$GITHUB_ENV"
          fi`,
    `          if [[ "$EVENT_NAME" == "workflow_dispatch" && -n "$REQUESTED_BASE_URL" ]]; then
            NORMALIZED_ORIGIN="$(node -e 'process.stdout.write(new URL(process.argv[1]).origin)' "$REQUESTED_BASE_URL")"
            printf 'QA_BASE_URL=%s\\n' "$NORMALIZED_ORIGIN" >> "$GITHUB_ENV"
            echo 'QA_START_SERVER=0' >> "$GITHUB_ENV"
            echo 'QA_EXPECTED_MODE=allowlisted_remote' >> "$GITHUB_ENV"
            printf 'QA_EXPECTED_ORIGIN=%s\\n' "$NORMALIZED_ORIGIN" >> "$GITHUB_ENV"
          else
            echo 'QA_BASE_URL=http://127.0.0.1:4173' >> "$GITHUB_ENV"
            echo 'QA_START_SERVER=1' >> "$GITHUB_ENV"
            echo 'QA_EXPECTED_MODE=local_static' >> "$GITHUB_ENV"
            echo 'QA_EXPECTED_ORIGIN=http://127.0.0.1:4173' >> "$GITHUB_ENV"
          fi`,
    "workflow target environment"
  ]
]);

console.log("Remote/local browser QA artifact validation is configured.");
