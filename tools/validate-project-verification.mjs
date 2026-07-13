import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PROJECT_INDEX_PATH = "data/projects/index.json";
const PROJECT_PATH = "data/projects/tellermanov-sad.json";
const PAGE_PATH = "catalog/prostornaya-4a/index.html";
const errors = [];

const ALLOWED_OVERALL_STATUSES = new Set(["requires_recheck", "confirmed", "rejected"]);
const ALLOWED_SOURCE_STATUSES = new Set(["reference_required", "attached_unverified", "verified", "rejected"]);
const ALLOWED_CLAIM_STATUSES = new Set(["working_copy", "confirmed", "rejected", "not_applicable"]);
const ALLOWED_IMPORTANCE = new Set(["critical", "standard", "volatile"]);

const REQUIRED_CLAIM_FIELDS = [
  "address",
  "builder_name",
  "status",
  "sales_status",
  "class",
  "wall_material",
  "floors",
  "entrances",
  "apartments_total",
  "area_min",
  "area_max",
  "ceiling_height",
  "handover",
  "keys_until",
  "project_declaration",
  "project_declaration_date",
  "nash_dom_rf_id",
  "building_permit",
  "building_permit_date",
  "apartment_types.studio.count",
  "apartment_types.one-room.count",
  "apartment_types.two-room.count",
  "apartment_types.three-room.count"
];

const REQUIRED_EXCLUDED_CLAIMS = [
  "price",
  "availability",
  "discount",
  "booking",
  "mortgage_approval",
  "final_appearance",
  "guaranteed_parking_space"
];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: файл не найден`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const content = read(relativePath);
  if (!content) return null;

  try {
    return JSON.parse(content);
  } catch (error) {
    errors.push(`${relativePath}: некорректный JSON: ${error.message}`);
    return null;
  }
}

function repositoryPath(value) {
  return String(value || "").replace(/^\/+/, "");
}

function valuesEqual(left, right) {
  if (typeof left === "number" || typeof right === "number") {
    return Number(left) === Number(right);
  }
  return String(left ?? "") === String(right ?? "");
}

function resolveClaimValue(project, field) {
  if (field.startsWith("apartment_types.")) {
    const [, type, property] = field.split(".");
    const apartment = Array.isArray(project.apartment_types)
      ? project.apartment_types.find((item) => item.type === type)
      : null;
    return apartment?.[property];
  }

  return project[field];
}

const projectIndex = readJson(PROJECT_INDEX_PATH);
const project = readJson(PROJECT_PATH);
const pageHtml = read(PAGE_PATH);

let indexEntry = null;
let verification = null;
let verificationPath = "";

if (!Array.isArray(projectIndex)) {
  errors.push(`${PROJECT_INDEX_PATH}: ожидается массив проектов`);
} else {
  indexEntry = projectIndex.find((item) => item.id === "tellermanov-sad") || null;
  if (!indexEntry) errors.push(`${PROJECT_INDEX_PATH}: проект tellermanov-sad не найден`);
}

if (project) {
  verificationPath = repositoryPath(project.verification_file);
  if (!verificationPath) {
    errors.push(`${PROJECT_PATH}: отсутствует verification_file`);
  } else {
    verification = readJson(verificationPath);
  }
}

if (indexEntry && project) {
  if (indexEntry.verification_file !== project.verification_file) {
    errors.push(`${PROJECT_INDEX_PATH}: verification_file не совпадает с ${PROJECT_PATH}`);
  }

  if (indexEntry.is_public_ready !== project.is_public_ready) {
    errors.push(`${PROJECT_INDEX_PATH}: is_public_ready не совпадает с ${PROJECT_PATH}`);
  }

  if (indexEntry.verification_status !== project.verification_status) {
    errors.push(`${PROJECT_INDEX_PATH}: verification_status не совпадает с ${PROJECT_PATH}`);
  }
}

if (verification && project) {
  if (verification.project_id !== project.id) {
    errors.push(`${verificationPath}: project_id должен совпадать с ${PROJECT_PATH}`);
  }

  if (verification.portal_slug !== "prostornaya-4a") {
    errors.push(`${verificationPath}: portal_slug должен быть prostornaya-4a`);
  }

  if (!ALLOWED_OVERALL_STATUSES.has(verification.overall_status)) {
    errors.push(`${verificationPath}: неподдерживаемый overall_status=${verification.overall_status}`);
  }

  const sources = Array.isArray(verification.sources) ? verification.sources : [];
  const sourceIds = new Set();

  if (!sources.length) {
    errors.push(`${verificationPath}: sources должен быть непустым массивом`);
  }

  for (const source of sources) {
    const label = source?.id || "unknown-source";
    if (!source?.id) {
      errors.push(`${verificationPath}:${label}: отсутствует id источника`);
      continue;
    }
    if (sourceIds.has(source.id)) {
      errors.push(`${verificationPath}:${label}: дублирующий id источника`);
    }
    sourceIds.add(source.id);

    if (!ALLOWED_SOURCE_STATUSES.has(source.status)) {
      errors.push(`${verificationPath}:${label}: неподдерживаемый status=${source.status}`);
    }

    if (source.status === "verified" && !String(source.reference || "").trim()) {
      errors.push(`${verificationPath}:${label}: проверенный источник должен содержать reference`);
    }
  }

  const claims = Array.isArray(verification.claims) ? verification.claims : [];
  const claimMap = new Map();

  if (!claims.length) {
    errors.push(`${verificationPath}: claims должен быть непустым массивом`);
  }

  for (const claim of claims) {
    const label = claim?.field || "unknown-claim";
    if (!claim?.field) {
      errors.push(`${verificationPath}:${label}: отсутствует field`);
      continue;
    }
    if (claimMap.has(claim.field)) {
      errors.push(`${verificationPath}:${label}: дублирующее поле`);
    }
    claimMap.set(claim.field, claim);

    if (!ALLOWED_CLAIM_STATUSES.has(claim.verification_status)) {
      errors.push(`${verificationPath}:${label}: неподдерживаемый verification_status=${claim.verification_status}`);
    }

    if (!ALLOWED_IMPORTANCE.has(claim.importance)) {
      errors.push(`${verificationPath}:${label}: неподдерживаемый importance=${claim.importance}`);
    }

    if (!Array.isArray(claim.source_ids) || claim.source_ids.length === 0) {
      errors.push(`${verificationPath}:${label}: должен быть указан хотя бы один source_id`);
    } else {
      for (const sourceId of claim.source_ids) {
        if (!sourceIds.has(sourceId)) {
          errors.push(`${verificationPath}:${label}: неизвестный source_id=${sourceId}`);
        }
      }
    }

    const projectValue = resolveClaimValue(project, claim.field);
    if (projectValue === undefined) {
      errors.push(`${verificationPath}:${label}: поле отсутствует в проектном профиле`);
    } else if (!valuesEqual(projectValue, claim.value)) {
      errors.push(`${verificationPath}:${label}: значение не совпадает с проектным профилем`);
    }

    if (claim.verification_status === "confirmed") {
      const allSourcesVerified = claim.source_ids.every((sourceId) => {
        const source = sources.find((item) => item.id === sourceId);
        return source?.status === "verified" && String(source.reference || "").trim() !== "";
      });
      if (!allSourcesVerified) {
        errors.push(`${verificationPath}:${label}: confirmed требует проверенных источников со ссылками`);
      }
    }
  }

  for (const field of REQUIRED_CLAIM_FIELDS) {
    if (!claimMap.has(field)) {
      errors.push(`${verificationPath}: отсутствует обязательная проверяемая характеристика ${field}`);
    }
  }

  const excludedClaims = new Set(Array.isArray(verification.excluded_claims) ? verification.excluded_claims : []);
  for (const field of REQUIRED_EXCLUDED_CLAIMS) {
    if (!excludedClaims.has(field)) {
      errors.push(`${verificationPath}: excluded_claims должен содержать ${field}`);
    }
  }

  const criticalClaims = claims.filter((claim) => claim.importance === "critical");
  const allCriticalConfirmed = criticalClaims.length > 0
    && criticalClaims.every((claim) => claim.verification_status === "confirmed");

  if (project.is_public_ready === true && !allCriticalConfirmed) {
    errors.push(`${PROJECT_PATH}: is_public_ready=true требует подтверждения всех critical claims`);
  }

  if (verification.overall_status === "confirmed" && !allCriticalConfirmed) {
    errors.push(`${verificationPath}: overall_status=confirmed требует подтверждения всех critical claims`);
  }

  if (!allCriticalConfirmed) {
    if (!pageHtml.includes('content="noindex,follow"')) {
      errors.push(`${PAGE_PATH}: страница должна оставаться noindex,follow до подтверждения critical claims`);
    }
    if (project.is_public_ready !== false) {
      errors.push(`${PROJECT_PATH}: до подтверждения critical claims is_public_ready должен быть false`);
    }
  }
}

console.log(`Checked project verification claims: ${verification?.claims?.length || 0}`);
console.log(`Checked project verification sources: ${verification?.sources?.length || 0}`);

if (errors.length) {
  console.error("\nProject verification validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nProject verification validation passed.");
