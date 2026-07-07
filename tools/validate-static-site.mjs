import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IGNORED_DIRS = new Set([".git", "node_modules"]);
const DRAFT_PREFIXES = [
  "portal-preview/",
  "novostroyki/",
  "zhk/",
  "zastroyschiki/",
  "spravochnik/",
  "sravnenie/"
];
const ALLOWED_VERIFICATION_STATUSES = new Set([
  "confirmed",
  "partially_confirmed",
  "requires_check",
  "do_not_publish"
]);
const ALLOWED_PAGE_STATUSES = new Set(["draft", "ready", "published", "archived"]);
const PAGE_TYPES_REQUIRING_PROJECT_ID = new Set([
  "project",
  "project_about",
  "project_apartments",
  "project_layouts",
  "project_prices",
  "project_documents",
  "project_gallery",
  "project_builder",
  "project_infrastructure",
  "project_mortgage",
  "project_construction_progress",
  "project_faq",
  "project_contacts",
  "project_address_landing",
  "project_news",
  "project_news_article"
]);

const results = {
  checkedHtmlFiles: 0,
  checkedLocalReferences: 0,
  checkedJsonFiles: 0,
  checkedIndexedPages: 0,
  errors: [],
  warnings: []
};

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function fromRoot(...parts) {
  return path.join(ROOT, ...parts);
}

function addError(message) {
  results.errors.push(message);
}

function addWarning(message) {
  results.warnings.push(message);
}

function isDraftPath(relativePath) {
  return DRAFT_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function addLeadFormMetadataProblem(relativePath, message) {
  if (isDraftPath(relativePath)) {
    addError(message);
  } else {
    addWarning(`${message}; legacy published page should be upgraded before migration`);
  }
}

function isExternalReference(value) {
  return (
    !value ||
    value.startsWith("#") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("data:") ||
    value.startsWith("javascript:")
  );
}

function stripQueryAndHash(value) {
  return value.split("#")[0].split("?")[0];
}

function resolveReference(fromFile, reference) {
  const cleanReference = stripQueryAndHash(reference);
  if (!cleanReference) return null;

  const resolved = cleanReference.startsWith("/")
    ? path.join(ROOT, cleanReference)
    : path.resolve(path.dirname(fromFile), cleanReference);

  if (path.extname(resolved)) return resolved;
  return path.join(resolved, "index.html");
}

function existsReference(targetPath) {
  return targetPath && fs.existsSync(targetPath);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function readJson(relativePath) {
  const file = fromRoot(relativePath);
  if (!fs.existsSync(file)) {
    addError(`${relativePath}: JSON file does not exist`);
    return null;
  }

  results.checkedJsonFiles += 1;

  try {
    return JSON.parse(read(file));
  } catch (error) {
    addError(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function getLocalReferences(html) {
  const refs = [];
  const attrRegex = /\s(?:href|src)=["']([^"']+)["']/gi;
  let match;

  while ((match = attrRegex.exec(html))) {
    const value = match[1].trim();
    if (!isExternalReference(value)) refs.push(value);
  }

  return refs;
}

function getLeadForms(html) {
  return html.match(/<form\b[^>]*data-lead-form[^>]*>/gi) || [];
}

function getAttribute(tag, name) {
  const regex = new RegExp(`${name}=["']([^"']*)["']`, "i");
  const match = tag.match(regex);
  return match ? match[1].trim() : "";
}

function htmlHasNoindexFollow(html) {
  return /<meta\s+name=["']robots["']\s+content=["']noindex,follow["']/i.test(html);
}

function validateDraftRobots(relativePath, html) {
  if (!isDraftPath(relativePath)) return;

  if (!htmlHasNoindexFollow(html)) {
    addError(`${relativePath}: draft page must include <meta name="robots" content="noindex,follow">`);
  }
}

function validateLeadForms(relativePath, html) {
  const forms = getLeadForms(html);

  forms.forEach((form, index) => {
    const humanIndex = index + 1;
    const requiredDataAttributes = ["data-lead-type", "data-form-id"];
    const recommendedDataAttributes = ["data-project", "data-project-id", "data-project-name"];

    requiredDataAttributes.forEach((attribute) => {
      if (!getAttribute(form, attribute)) {
        addLeadFormMetadataProblem(relativePath, `${relativePath}: lead form #${humanIndex} missing ${attribute}`);
      }
    });

    recommendedDataAttributes.forEach((attribute) => {
      if (!getAttribute(form, attribute)) {
        addWarning(`${relativePath}: lead form #${humanIndex} missing ${attribute}; main.js will use SITE_CONFIG fallback`);
      }
    });

    const leadType = getAttribute(form, "data-lead-type");
    if (leadType === "project_consultation" && !getAttribute(form, "data-complex-id")) {
      addLeadFormMetadataProblem(relativePath, `${relativePath}: project_consultation form #${humanIndex} missing data-complex-id`);
    }
  });
}

function validateLocalReferences(file, relativePath, html) {
  const refs = getLocalReferences(html);

  refs.forEach((reference) => {
    const target = resolveReference(file, reference);
    if (!target) return;

    results.checkedLocalReferences += 1;

    if (!existsReference(target)) {
      const normalizedTarget = toPosix(path.relative(ROOT, target));
      addError(`${relativePath}: broken local reference "${reference}" -> ${normalizedTarget}`);
    }
  });
}

function validateHtmlFile(file) {
  const html = read(file);
  const relativePath = toPosix(path.relative(ROOT, file));

  results.checkedHtmlFiles += 1;
  validateDraftRobots(relativePath, html);
  validateLeadForms(relativePath, html);
  validateLocalReferences(file, relativePath, html);
}

function validateVerificationStatus(relativePath, entity) {
  if (!entity || typeof entity !== "object") {
    addError(`${relativePath}: expected object with verification metadata`);
    return;
  }

  if (!entity.verification_status) {
    addError(`${relativePath}: missing verification_status`);
  } else if (!ALLOWED_VERIFICATION_STATUSES.has(entity.verification_status)) {
    addError(`${relativePath}: unsupported verification_status "${entity.verification_status}"`);
  }

  if (typeof entity.is_public_ready !== "boolean") {
    addError(`${relativePath}: is_public_ready must be boolean`);
  }

  if (!entity.last_checked_at) {
    addWarning(`${relativePath}: missing last_checked_at`);
  }

  if (entity.is_public_ready === true && entity.verification_status !== "confirmed") {
    addError(`${relativePath}: public-ready object must have verification_status="confirmed"`);
  }
}

function resolveRepositoryPath(value) {
  if (!value) return "";
  return value.startsWith("/") ? value.slice(1) : value;
}

function resolvePageFile(url) {
  const cleanUrl = String(url || "").replace(/^\/+/, "").replace(/\/+$/, "");
  return cleanUrl ? `${cleanUrl}/index.html` : "index.html";
}

function validateProjectIndex() {
  const indexPath = "data/projects/index.json";
  const projects = readJson(indexPath);
  if (!projects) return;

  if (!Array.isArray(projects)) {
    addError(`${indexPath}: expected array`);
    return;
  }

  projects.forEach((project, index) => {
    const label = `${indexPath}#${index + 1}:${project?.id || "unknown"}`;
    validateVerificationStatus(label, project);

    const dataFile = resolveRepositoryPath(project.data_file);
    if (!dataFile) {
      addError(`${label}: missing data_file`);
      return;
    }

    if (!fs.existsSync(fromRoot(dataFile))) {
      addError(`${label}: data_file does not exist: ${project.data_file}`);
      return;
    }

    const detail = readJson(dataFile);
    if (!detail) return;

    validateVerificationStatus(dataFile, detail);

    ["id", "slug", "verification_status", "is_public_ready"].forEach((field) => {
      if (project[field] !== detail[field]) {
        addError(`${label}: field ${field} does not match ${dataFile}`);
      }
    });
  });
}

function validateResearchRegister() {
  const registerPath = "data/research/newbuilds-borisoglebsk-2018.json";
  const register = readJson(registerPath);
  if (!register) return;

  if (!register.publication_rules) {
    addError(`${registerPath}: missing publication_rules`);
  }

  const sections = [
    "confirmed_projects",
    "requires_check_projects",
    "do_not_publish_projects"
  ];

  sections.forEach((section) => {
    const items = register[section];
    if (!Array.isArray(items)) {
      addError(`${registerPath}: ${section} must be array`);
      return;
    }

    items.forEach((item, index) => {
      validateVerificationStatus(`${registerPath}:${section}#${index + 1}:${item?.id || "unknown"}`, item);
    });
  });
}

function validatePageIndex() {
  const indexPath = "data/pages/index.json";
  const pages = readJson(indexPath);
  if (!pages) return;

  if (!Array.isArray(pages)) {
    addError(`${indexPath}: expected array`);
    return;
  }

  const seenUrls = new Set();

  pages.forEach((page, index) => {
    const label = `${indexPath}#${index + 1}:${page?.url || "unknown"}`;
    results.checkedIndexedPages += 1;

    if (!page.url || !String(page.url).startsWith("/")) {
      addError(`${label}: url must start with /`);
      return;
    }

    if (seenUrls.has(page.url)) {
      addError(`${label}: duplicate url`);
    }
    seenUrls.add(page.url);

    if (!page.title) addError(`${label}: missing title`);
    if (!page.page_type) addError(`${label}: missing page_type`);

    if (!page.status || !ALLOWED_PAGE_STATUSES.has(page.status)) {
      addError(`${label}: unsupported status "${page.status || ""}"`);
    }

    if (PAGE_TYPES_REQUIRING_PROJECT_ID.has(page.page_type) && !page.project_id) {
      addError(`${label}: missing project_id for project page type`);
    }

    if (page.status === "archived") return;

    const pageFile = resolvePageFile(page.url);
    const pagePath = fromRoot(pageFile);
    if (!fs.existsSync(pagePath)) {
      addError(`${label}: indexed page file does not exist: ${pageFile}`);
      return;
    }

    const html = read(pagePath);
    if (page.robots === "noindex,follow" && !htmlHasNoindexFollow(html)) {
      addError(`${label}: page index says noindex,follow, but ${pageFile} has no matching meta robots`);
    }

    if (page.status === "published" && page.robots === "noindex,follow") {
      addError(`${label}: published page must not have robots=noindex,follow`);
    }
  });
}

function validateDataFiles() {
  validateProjectIndex();
  validateResearchRegister();
  validatePageIndex();
}

function main() {
  const htmlFiles = walk(ROOT);
  htmlFiles.forEach(validateHtmlFile);
  validateDataFiles();

  console.log(`Checked HTML files: ${results.checkedHtmlFiles}`);
  console.log(`Checked local references: ${results.checkedLocalReferences}`);
  console.log(`Checked JSON files: ${results.checkedJsonFiles}`);
  console.log(`Checked indexed pages: ${results.checkedIndexedPages}`);

  if (results.warnings.length) {
    console.log("\nWarnings:");
    results.warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (results.errors.length) {
    console.error("\nErrors:");
    results.errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log("\nStatic site validation passed.");
}

main();
