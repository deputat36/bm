import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FORM_SCENARIOS_PATH = "data/qa/form-scenarios.json";
const errors = [];

const TARGETS = [
  {
    id: "aerodromnaya-18g",
    page: "catalog/aerodromnaya-18g/index.html",
    verification: "data/verification/aerodromnaya-18g.json",
    requiredFragments: [
      '<meta name="robots" content="noindex,follow">',
      'data-verification-profile="../../data/verification/aerodromnaya-18g.json"',
      'data-project-faq',
      'id="sources"',
      'data-status-available',
      'data-status-pending',
      'Портал не является официальным сайтом застройщика',
      'Нужны первичные документы',
      'Проверить квартиру',
      'Статус ввода и документы',
      'Актуальные цены и наличие',
      'Продавец и договор',
      'Планировки и отделка',
      'Ипотека и способы покупки'
    ],
    requiredRiskBoundaries: [
      "разрешение на ввод",
      "ЕГРН",
      "продавец",
      "договор"
    ]
  },
  {
    id: "sennaya-76",
    page: "catalog/sennaya-76/index.html",
    verification: "data/verification/sennaya-76.json",
    requiredFragments: [
      '<meta name="robots" content="noindex,follow">',
      'data-verification-profile="../../data/verification/sennaya-76.json"',
      'data-project-faq',
      'id="source"',
      'data-status-available',
      'data-status-pending',
      'Портал не является официальным сайтом застройщика',
      'Публичное интервью',
      'Граница достоверности',
      'Проверка конкретной квартиры',
      'Актуальные цены и наличие',
      'Планировки и площади',
      'Документы и продавец',
      'Ипотека и способы покупки',
      'Особенности и оснащение дома'
    ],
    requiredRiskBoundaries: [
      "разрешение на ввод",
      "ЕГРН",
      "продавца",
      "конкретной квартиры"
    ]
  }
];

function readText(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

function readJson(relativePath) {
  const text = readText(relativePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function countOccurrences(text, fragment) {
  if (!fragment) return 0;
  return text.split(fragment).length - 1;
}

const formRegistry = readJson(FORM_SCENARIOS_PATH);
if (!formRegistry) process.exit(1);
const scenarios = Array.isArray(formRegistry.scenarios) ? formRegistry.scenarios : [];

for (const target of TARGETS) {
  const html = readText(target.page);
  const verification = readJson(target.verification);
  if (!html || !verification) continue;

  if (verification.project_id !== target.id) {
    errors.push(`${target.verification}: project_id must be ${target.id}`);
  }
  if (verification.overall_status === "confirmed") {
    errors.push(`${target.verification}: this guard is for source-gated buyer cards; confirmed profile requires separate release review`);
  }
  if (verification.publication_policy?.page_must_remain_noindex_until_confirmed !== true) {
    errors.push(`${target.verification}: page_must_remain_noindex_until_confirmed must be true`);
  }
  if (verification.publication_policy?.prices_and_availability_are_not_covered !== true) {
    errors.push(`${target.verification}: prices_and_availability_are_not_covered must be true`);
  }

  for (const fragment of target.requiredFragments) {
    if (!html.includes(fragment)) {
      errors.push(`${target.page}: missing buyer-content/safety fragment: ${fragment}`);
    }
  }
  for (const boundary of target.requiredRiskBoundaries) {
    if (!html.toLowerCase().includes(boundary.toLowerCase())) {
      errors.push(`${target.page}: missing explicit risk boundary mention: ${boundary}`);
    }
  }

  const pageScenarios = scenarios.filter((scenario) => scenario.page_file === target.page);
  if (pageScenarios.length !== 2) {
    errors.push(`${FORM_SCENARIOS_PATH}:${target.id}: expected exactly 2 form scenarios, found ${pageScenarios.length}`);
  }
  const roles = [...new Set(pageScenarios.map((scenario) => scenario.form_role))].sort();
  if (JSON.stringify(roles) !== JSON.stringify(["detailed", "primary"])) {
    errors.push(`${FORM_SCENARIOS_PATH}:${target.id}: expected primary + detailed roles`);
  }
  const anchors = [...new Set(pageScenarios.map((scenario) => scenario.anchor))].sort();
  if (JSON.stringify(anchors) !== JSON.stringify(["lead", "quick-lead"])) {
    errors.push(`${FORM_SCENARIOS_PATH}:${target.id}: expected quick-lead + lead anchors`);
  }
  for (const scenario of pageScenarios) {
    if (scenario.lead_type !== "project_consultation") {
      errors.push(`${FORM_SCENARIOS_PATH}:${scenario.id}: lead_type must remain project_consultation`);
    }
    const marker = `data-form-id="${scenario.form_id}"`;
    const count = countOccurrences(html, marker);
    if (count !== 1) {
      errors.push(`${target.page}: expected exactly one ${marker}, found ${count}`);
    }
  }
  if (countOccurrences(html, 'data-fail-closed="true"') < 2) {
    errors.push(`${target.page}: both buyer forms must remain fail-closed`);
  }

  const sources = Array.isArray(verification.sources) ? verification.sources : [];
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const claims = Array.isArray(verification.claims) ? verification.claims : [];
  const publicClaims = claims.filter((claim) => claim.publication_allowed === true);
  const blockedCritical = claims.filter((claim) => claim.importance === "critical" && claim.publication_allowed !== true);

  if (publicClaims.length < 1) {
    errors.push(`${target.verification}: at least one publication_allowed claim is required for buyer content`);
  }
  if (blockedCritical.length < 1) {
    errors.push(`${target.verification}: source-gated buyer card must retain blocked critical claims`);
  }

  for (const claim of publicClaims) {
    if (claim.verification_status !== "confirmed") {
      errors.push(`${target.verification}:${claim.field}: publication_allowed claim must be confirmed`);
    }
    if (!Array.isArray(claim.source_ids) || claim.source_ids.length < 1) {
      errors.push(`${target.verification}:${claim.field}: publication_allowed claim requires source_ids`);
      continue;
    }
    for (const sourceId of claim.source_ids) {
      const source = sourceById.get(sourceId);
      if (!source) {
        errors.push(`${target.verification}:${claim.field}: missing source ${sourceId}`);
        continue;
      }
      if (source.status !== "verified") {
        errors.push(`${target.verification}:${claim.field}: public claim source ${sourceId} must be verified`);
      }
      if (!/^https:\/\//i.test(String(source.reference || ""))) {
        errors.push(`${target.verification}:${claim.field}: verified public claim source ${sourceId} requires HTTPS reference`);
      }
    }
  }

  const verifiedReferences = sources
    .filter((source) => source.status === "verified" && /^https:\/\//i.test(String(source.reference || "")))
    .map((source) => source.reference);
  if (!verifiedReferences.some((reference) => html.includes(reference))) {
    errors.push(`${target.page}: page must expose at least one verified source reference from its verification profile`);
  }

  if (!html.includes("noindex,follow")) {
    errors.push(`${target.page}: source-gated buyer card must remain noindex,follow`);
  }

  console.log(`${target.id}: public claims=${publicClaims.length}; blocked critical=${blockedCritical.length}; forms=${pageScenarios.length}`);
}

if (errors.length) {
  console.error("\nPriority buyer-content validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Priority buyer-content validation passed.");
