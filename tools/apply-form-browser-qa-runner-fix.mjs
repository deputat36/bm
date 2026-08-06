import fs from "node:fs";

const file = "tools/run-form-browser-qa.mjs";
let source = fs.readFileSync(file, "utf8");

function replaceRequired(before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing patch target: ${label}`);
  source = source.replace(before, after);
}

replaceRequired(
`function validateEventPrivacy(events) {
  const keyViolations = collectProhibitedKeyPaths(events);
  const serialized = JSON.stringify(events);
  const valueViolations = [];
  if (PHONE_LIKE_VALUE.test(serialized)) valueViolations.push("phone-like value");
  if (EMAIL_LIKE_VALUE.test(serialized)) valueViolations.push("email-like value");
  return { keyViolations, valueViolations };
}`,
`const ISO_TIMESTAMP_VALUE = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$/;

function collectProhibitedValuePaths(value, prefix = "") {
  const violations = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => violations.push(...collectProhibitedValuePaths(item, prefix + "[" + index + "]")));
    return violations;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = prefix ? prefix + "." + key : key;
      violations.push(...collectProhibitedValuePaths(nested, nextPath));
    }
    return violations;
  }
  if (typeof value !== "string" || ISO_TIMESTAMP_VALUE.test(value)) return violations;
  if (PHONE_LIKE_VALUE.test(value)) violations.push(prefix + ":phone-like");
  if (EMAIL_LIKE_VALUE.test(value)) violations.push(prefix + ":email-like");
  return violations;
}

function validateEventPrivacy(events) {
  return {
    keyViolations: collectProhibitedKeyPaths(events),
    valueViolations: collectProhibitedValuePaths(events)
  };
}`,
"privacy value scan"
);

replaceRequired(
`    if (meta.tag === "select") {
      const option = await control.evaluate((select) => Array.from(select.options).find((item) => !item.disabled && String(item.value || "").trim())?.value || "");
      if (option) await control.selectOption(option);
      continue;
    }`,
`    if (meta.tag === "select") {
      const option = await control.evaluate((select, expectedObjectId) => {
        const options = Array.from(select.options).filter((item) => !item.disabled && String(item.value || "").trim());
        const current = String(select.value || "").trim();

        if (select.name === "residential_complex") {
          const aliases = {
            "all-newbuilds": ["общий подбор", "все новостройки"],
            "prostornaya-4a": ["просторная 4а", "просторной 4а"],
            "aerodromnaya-18g": ["аэродромная 18г", "аэродромной 18г"],
            "sennaya-76": ["сенная 76", "сенной 76"]
          };
          const expectedAliases = aliases[expectedObjectId] || [String(expectedObjectId || "").toLowerCase()];
          const matched = options.find((item) => {
            const searchable = String(item.value || "") + " " + String(item.textContent || "");
            return expectedAliases.some((alias) => alias && searchable.toLowerCase().includes(alias));
          });
          if (matched) return matched.value;
        }

        if (current) return current;
        return options[0]?.value || "";
      }, scenario.object_id);
      if (option) await control.selectOption(option);
      continue;
    }`,
"scenario-aware select"
);

fs.writeFileSync(file, source, "utf8");
console.log("Applied browser QA runner fixes.");
