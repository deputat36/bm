import fs from "node:fs";

const MAIN_PATH = "assets/js/main.js";
const MOBILE_PATH = "assets/js/mobile-lead-bar.js";
const TRACKING_PATH = "assets/js/conversion-tracking.js";
const REGISTRY_PATH = "data/analytics/events.json";
const VALIDATOR_PATH = "tools/validate-lead-source-output.mjs";

function removeFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Function ${name} not found`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      let end = index + 1;
      while (source[end] === "\n" || source[end] === "\r") end += 1;
      return source.slice(0, start) + source.slice(end);
    }
  }

  throw new Error(`Function ${name} closing brace not found`);
}

let mobile = fs.readFileSync(MOBILE_PATH, "utf8");
mobile = removeFunction(mobile, "enablePrimaryLeadDelivery");
mobile = mobile.replace(/^\s*enablePrimaryLeadDelivery\(\);\r?\n/m, "");
fs.writeFileSync(MOBILE_PATH, mobile);

const validator = `import fs from "node:fs";\nimport path from "node:path";\n\nconst ROOT = process.cwd();\nconst MAIN_PATH = "${MAIN_PATH}";\nconst MOBILE_PATH = "${MOBILE_PATH}";\nconst TRACKING_PATH = "${TRACKING_PATH}";\nconst REGISTRY_PATH = "${REGISTRY_PATH}";\nconst ENDPOINT = "https://ofewxuqfjhamgerwzull.supabase.co/functions/v1/newbuild-lead";\nconst errors = [];\n\nfunction read(relativePath) {\n  const fullPath = path.join(ROOT, relativePath);\n  if (!fs.existsSync(fullPath)) {\n    errors.push(\`\${relativePath}: файл не найден\`);\n    return "";\n  }\n  return fs.readFileSync(fullPath, "utf8");\n}\n\nfunction readJson(relativePath) {\n  try {\n    return JSON.parse(read(relativePath));\n  } catch (error) {\n    errors.push(\`\${relativePath}: некорректный JSON: \${error.message}\`);\n    return null;\n  }\n}\n\nfunction requireFragments(source, sourcePath, fragments) {\n  fragments.forEach((fragment) => {\n    if (!source.includes(fragment)) errors.push(\`\${sourcePath}: отсутствует фрагмент \${fragment}\`);\n  });\n}\n\nfunction forbidFragments(source, sourcePath, fragments) {\n  fragments.forEach((fragment) => {\n    if (source.includes(fragment)) errors.push(\`\${sourcePath}: найден устаревший транспорт \${fragment}\`);\n  });\n}\n\nconst main = read(MAIN_PATH);\nconst mobile = read(MOBILE_PATH);\nconst tracking = read(TRACKING_PATH);\nconst registry = readJson(REGISTRY_PATH);\n\nrequireFragments(main, MAIN_PATH, [\n  'LEAD_ENDPOINT: "' + ENDPOINT + '"',\n  'data.lead_source = data.lead_source || data.tracking?.current?.lead_source || "";',\n  'data.placement = data.placement || data.tracking?.current?.placement || "";',\n  '\`Внутренний источник: \${data.lead_source || ""}\`',\n  '\`Размещение перехода: \${data.placement || ""}\`',\n  'lead_source: data.lead_source || ""',\n  'placement: data.placement || ""',\n  'body: JSON.stringify(data)',\n  'return sendCustomLead(data);'\n]);\n\nforbidFragments(main, MAIN_PATH, [\n  "sendWeb3FormsLead",\n  "api.web3forms.com",\n  "Promise.allSettled",\n  "fields_json:"\n]);\n\nrequireFragments(mobile, MOBILE_PATH, [\n  "enableInternalLeadIdPrivacy",\n  "window.__NEWBUILD_INTERNAL_LEAD_ID_PRIVACY__ = true",\n  'event: "lead_submit"',\n  'lead_source: data.lead_source || ""',\n  'placement: data.placement || ""',\n  "data-mobile-lead-bar"\n]);\n\nforbidFragments(mobile, MOBILE_PATH, [\n  "enablePrimaryLeadDelivery",\n  "sendLeadWithPrimaryStorage",\n  "sendWeb3FormsLead",\n  "SITE_CONFIG.LEAD_ENDPOINT =",\n  "email_copy_sent",\n  "__NEWBUILD_PRIMARY_LEAD_DELIVERY__"\n]);\n\nrequireFragments(tracking, TRACKING_PATH, [\n  'sendConversionEvent("lead_submit_classified"',\n  'lead_source: detail.lead_source || ""',\n  'placement: detail.placement || ""'\n]);\n\nconst submitEvent = registry?.events?.find((event) => event.id === "lead_submit");\nconst classifiedEvent = registry?.events?.find((event) => event.id === "lead_submit_classified");\nfor (const [label, event] of [["lead_submit", submitEvent], ["lead_submit_classified", classifiedEvent]]) {\n  if (!event) {\n    errors.push(\`\${REGISTRY_PATH}: отсутствует \${label}\`);\n    continue;\n  }\n  ["lead_source", "placement"].forEach((field) => {\n    if (!event.optional_fields?.includes(field)) errors.push(\`\${REGISTRY_PATH}:\${label}: нет \${field}\`);\n  });\n  if (event.contains_personal_data !== false) errors.push(\`\${REGISTRY_PATH}:\${label}: техническая атрибуция не должна содержать персональные данные\`);\n}\n\nconst prohibited = new Set(registry?.rules?.prohibited_fields || []);\n["lead_source", "placement"].forEach((field) => {\n  if (prohibited.has(field)) errors.push(\`\${REGISTRY_PATH}: \${field} ошибочно запрещён\`);\n});\n\nconst forbiddenBindings = [\n  /lead_source\\s*:\\s*data\\.(name|phone|email|comment|question)/,\n  /placement\\s*:\\s*data\\.(name|phone|email|comment|question)/,\n  /data\\.lead_source\\s*=\\s*data\\.(name|phone|email|comment|question)/,\n  /data\\.placement\\s*=\\s*data\\.(name|phone|email|comment|question)/\n];\nforbiddenBindings.forEach((pattern) => {\n  if (pattern.test(main) || pattern.test(tracking) || pattern.test(mobile)) errors.push(\`Техническая атрибуция связана с персональными полями: \${pattern}\`);\n});\n\nconsole.log("Lead source and placement preserved in the primary server payload");\nconsole.log("Mobile bar transport override removed");\nconsole.log("Browser email duplication removed");\n\nif (errors.length) {\n  console.error("\\nLead source output validation errors:");\n  errors.forEach((error) => console.error(\`- \${error}\`));\n  process.exit(1);\n}\n\nconsole.log("Lead source output validation passed.");\n`;

fs.writeFileSync(VALIDATOR_PATH, validator);
console.log("Lead source validation and mobile delivery override updated.");
