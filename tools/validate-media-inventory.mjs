import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = "data/media/prostornaya-4a.json";
const GALLERY_SCRIPT_PATH = "assets/js/gallery.js";
const errors = [];

const ACTIVE_PAGE_PATHS = [
  "index.html",
  "catalog/index.html",
  "catalog/prostornaya-4a/index.html",
  "catalog/aerodromnaya-18g/index.html",
  "catalog/sennaya-76/index.html",
  "developers/index.html",
  "guides/index.html",
  "news/index.html",
  "contacts/index.html",
  "ipoteka/index.html"
];

const ALLOWED_VERIFICATION_STATUSES = new Set(["requires_check", "confirmed", "rejected"]);
const ALLOWED_RIGHTS_STATUSES = new Set(["unknown", "cleared", "restricted", "rejected"]);
const ALLOWED_MEDIA_TYPES = new Set(["architectural_render", "photo", "layout", "map", "document_preview", "illustration"]);
const ALLOWED_PUBLIC_USAGE = new Set(["catalog", "project_page", "news", "guides", "social", "advertising"]);
const ALLOWED_FILE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg"]);

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

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

const registry = readJson(REGISTRY_PATH);
const galleryScript = read(GALLERY_SCRIPT_PATH);
const seenIds = new Set();
const seenFiles = new Set();
let publicReadyCount = 0;

if (!registry) {
  errors.push(`${REGISTRY_PATH}: реестр не загружен`);
} else {
  if (registry.project_id !== "prostornaya-4a") {
    errors.push(`${REGISTRY_PATH}: project_id должен быть prostornaya-4a`);
  }

  if (!Array.isArray(registry.assets) || registry.assets.length === 0) {
    errors.push(`${REGISTRY_PATH}: assets должен быть непустым массивом`);
  } else {
    for (const asset of registry.assets) {
      const label = asset?.id || asset?.file || "unknown-media";

      if (!nonEmptyString(asset.id)) {
        errors.push(`${label}: отсутствует id`);
      } else if (seenIds.has(asset.id)) {
        errors.push(`${label}: дублирующий id`);
      } else {
        seenIds.add(asset.id);
      }

      if (!nonEmptyString(asset.file)) {
        errors.push(`${label}: отсутствует file`);
      } else {
        if (seenFiles.has(asset.file)) {
          errors.push(`${label}: один файл зарегистрирован несколько раз`);
        }
        seenFiles.add(asset.file);

        const extension = path.extname(asset.file).toLowerCase();
        if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
          errors.push(`${label}: неподдерживаемое расширение ${extension || "без расширения"}`);
        }

        if (!exists(asset.file)) {
          errors.push(`${label}: основной файл не найден: ${asset.file}`);
        }
      }

      if (asset.fallback_file) {
        if (!String(asset.fallback_file).endsWith(".b64")) {
          errors.push(`${label}: fallback_file должен иметь расширение .b64`);
        }
        if (!exists(asset.fallback_file)) {
          errors.push(`${label}: резервный файл не найден: ${asset.fallback_file}`);
        }
      }

      if (!ALLOWED_MEDIA_TYPES.has(asset.media_type)) {
        errors.push(`${label}: неподдерживаемый media_type=${asset.media_type}`);
      }

      if (!ALLOWED_VERIFICATION_STATUSES.has(asset.verification_status)) {
        errors.push(`${label}: неподдерживаемый verification_status=${asset.verification_status}`);
      }

      if (!ALLOWED_RIGHTS_STATUSES.has(asset.rights_status)) {
        errors.push(`${label}: неподдерживаемый rights_status=${asset.rights_status}`);
      }

      if (!nonEmptyString(asset.title) || !nonEmptyString(asset.alt)) {
        errors.push(`${label}: title и alt должны быть заполнены`);
      }

      if (!Array.isArray(asset.allowed_usage)) {
        errors.push(`${label}: allowed_usage должен быть массивом`);
      } else {
        for (const usage of asset.allowed_usage) {
          if (!ALLOWED_PUBLIC_USAGE.has(usage)) {
            errors.push(`${label}: неподдерживаемый allowed_usage=${usage}`);
          }
        }
      }

      if (asset.is_public_ready === true) {
        publicReadyCount += 1;

        if (asset.verification_status !== "confirmed") {
          errors.push(`${label}: публичный материал должен иметь verification_status=confirmed`);
        }
        if (asset.rights_status !== "cleared") {
          errors.push(`${label}: публичный материал должен иметь rights_status=cleared`);
        }
        if (!nonEmptyString(asset.source_reference)) {
          errors.push(`${label}: для публичного материала нужен source_reference`);
        }
        if (!Array.isArray(asset.allowed_usage) || asset.allowed_usage.length === 0) {
          errors.push(`${label}: для публичного материала нужен хотя бы один allowed_usage`);
        }
      } else if (asset.verification_status === "confirmed" && asset.rights_status === "cleared") {
        errors.push(`${label}: подтверждённый материал с очищенными правами должен явно получить решение по is_public_ready`);
      }
    }
  }
}

if (galleryScript) {
  if (!galleryScript.includes(REGISTRY_PATH)) {
    errors.push(`${GALLERY_SCRIPT_PATH}: скрипт должен загружать ${REGISTRY_PATH}`);
  }

  if (/Borisoglebsk_\d+\.(?:jpg|b64)/i.test(galleryScript)) {
    errors.push(`${GALLERY_SCRIPT_PATH}: обнаружен обход реестра через жёстко заданный файл изображения`);
  }

  if (!galleryScript.includes("verification_status === 'confirmed'")
      || !galleryScript.includes("rights_status === 'cleared'")
      || !galleryScript.includes("is_public_ready === true")) {
    errors.push(`${GALLERY_SCRIPT_PATH}: отсутствует полный фильтр публичной готовности`);
  }
}

for (const relativePath of ACTIVE_PAGE_PATHS) {
  const html = read(relativePath);
  if (!html) continue;

  if (/assets\/js\/gallery\.js/i.test(html) && publicReadyCount === 0) {
    errors.push(`${relativePath}: подключена галерея, хотя в реестре нет публично готовых материалов`);
  }
}

console.log(`Checked media assets: ${registry?.assets?.length || 0}`);
console.log(`Public-ready media assets: ${publicReadyCount}`);

if (errors.length) {
  console.error("\nMedia inventory validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nMedia inventory validation passed.");
