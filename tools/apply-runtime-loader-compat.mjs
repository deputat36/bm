import fs from "node:fs";

function replaceRequired(file, before, after) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes(before)) throw new Error(`${file}: missing ${before}`);
  fs.writeFileSync(file, source.replaceAll(before, after));
}

replaceRequired(
  "assets/js/schema.js",
  "script.async = options.ordered !== true;",
  'script.async = options.ordered !== true && fileName !== "conversion-tracking.js";'
);
replaceRequired(
  "assets/js/schema.js",
  'loadPortalScript(schemaScriptUrl, "conversion-tracking.js", { ordered: true })',
  'loadPortalScript(schemaScriptUrl, "conversion-tracking.js")'
);
replaceRequired(
  "tools/validate-conversion-runtime.mjs",
  'loadPortalScript(schemaScriptUrl, "conversion-tracking.js", { ordered: true })',
  'loadPortalScript(schemaScriptUrl, "conversion-tracking.js")'
);
replaceRequired(
  "tools/validate-page-accessibility.mjs",
  'loadPortalScript(schemaScriptUrl, "conversion-tracking.js", { ordered: true })',
  'loadPortalScript(schemaScriptUrl, "conversion-tracking.js")'
);

console.log("Runtime loader compatibility applied without losing ordered conversion tracking.");
