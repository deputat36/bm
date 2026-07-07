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
const ALLOWED_REDIRECT_STATUSES = new Set(["planned", "requires_decision", "ready", "active", "archived"]);
const ALLOWED_REDIRECT_TYPES = new Set([
  "301_after_migration",
  "html_or_301_after_audit",
  "decision_required",
  "html_redirect",
  "server_301"
]);
const ALLOWED_LEAD_TYPES = new Set([
  "complex_interest",
  "mortgage",
  "apartment_selection",
  "consultation",
  "callback",
  "waitlist",
  "portal_selection",
  "project_consultation",
  "general"
]);
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

const leadTypesUsedInForms = new Set();

const results = {
  checkedHtmlFiles: 0,
  checkedLocalReferences: 0,
  checkedJsonFiles: 0,
  checkedIndexedPages: 0,
  checkedLegacyRedirects: 0,
  checkedLeadTypes: 0,
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
    if (leadType) {
      leadTypesUsedInForms.add(leadType);
      if (!ALLOWED_LEAD_TYPES.has(leadType)) {
        addLeadFormMetadataProblem(relativePath, `${relativePath}: lead form #${humanIndex} uses unsupported data-lead-type="${leadType}"`);
      }
    }

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

function validateLegacyRedirects() {
  const redirectPath = "data/pages/legacy-redirects.json";
  const redirects = readJson(redirectPath);
  if (!redirects) return;

  if (!Array.isArray(redirects)) {
    addError(`${redirectPath}: expected array`);
    return;
  }

  const seenSources = new Set();

  redirects.forEach((redirect, index) => {
    const label = `${redirectPath}#${index + 1}:${redirect?.source_url || "unknown"}`;
    results.checkedLegacyRedirects += 1;

    if (!redirect.source_url || !String(redirect.source_url).startsWith("/")) {
      addError(`${label}: source_url must start with /`);
      return;
    }

    if (!redirect.target_url || !String(redirect.target_url).startsWith("/")) {
      addError(`${label}: target_url must start with /`);
      return;
    }

    if (redirect.source_url === redirect.target_url) {
      addError(`${label}: source_url and target_url must be different`);
    }

    if (seenSources.has(redirect.source_url)) {
      addError(`${label}: duplicate source_url`);
    }
    seenSources.add(redirect.source_url);

    if (!redirect.redirect_type || !ALLOWED_REDIRECT_TYPES.has(redirect.redirect_type)) {
      addError(`${label}: unsupported redirect_type "${redirect.redirect_type || ""}"`);
    }

    if (!redirect.status || !ALLOWED_REDIRECT_STATUSES.has(redirect.status)) {
      addError(`${label}: unsupported status "${redirect.status || ""}"`);
    }

    ["source_url", "target_url"].forEach((field) => {
      const file = resolvePageFile(redirect[field]);
      if (!fs.existsSync(fromRoot(file))) {
        addError(`${label}: ${field} file does not exist: ${file}`);
      }
    });

    if (redirect.status === "active" && !["html_redirect", "server_301"].includes(redirect.redirect_type)) {
      addError(`${label}: active redirect must use html_redirect or server_301`);
    }
  });
}

function findMissingLeadTypes(filePath, expectedTypes) {
  const file = fromRoot(filePath);
  if (!fs.existsSync(file)) {
    return expectedTypes;
  }

  const content = read(file);
  return expectedTypes.filter((leadType) => !content.includes(`'${leadType}'`) && !content.includes(`"${leadType}"`));
}

function validateLeadTypeCompatibility() {
  const expectedTypes = Array.from(ALLOWED_LEAD_TYPES);
  const formTypes = Array.from(leadTypesUsedInForms).sort();
  results.checkedLeadTypes = formTypes.length;

  formTypes.forEach((leadType) => {
    if (!ALLOWED_LEAD_TYPES.has(leadType)) {
      addError(`Lead type compatibility: unsupported form lead_type "${leadType}"`);
    }
  });

  const missingInSql = findMissingLeadTypes("docs/supabase-leads.sql", expectedTypes);
  if (missingInSql.length) {
    addError(`docs/supabase-leads.sql: missing allowed lead_type values: ${missingInSql.join(", ")}`);
  }

  const missingInEdgeFunction = findMissingLeadTypes("supabase/functions/newbuild-lead/index.ts", expectedTypes);
  if (missingInEdgeFunction.length) {
    addWarning(`supabase/functions/newbuild-lead/index.ts: missing lead_type values: ${missingInEdgeFunction.join(", ")}. Fix before enabling LEAD_ENDPOINT.`);
  }
}

function validateDataFiles() {
  validateProjectIndex();
  validateResearchRegister();
  validatePageIndex();
  validateLegacyRedirects();
}

function main() {
  const htmlFiles = walk(ROOT);
  htmlFiles.forEach(validateHtmlFile);
  validateDataFiles();
  validateLeadTypeCompatibility();

  console.log(`Checked HTML files: ${results.checkedHtmlFiles}`);
  console.log(`Checked local references: ${results.checkedLocalReferences}`);
  console.log(`Checked JSON files: ${results.checkedJsonFiles}`);
  console.log(`Checked indexed pages: ${results.checkedIndexedPages}`);
  console.log(`Checked legacy redirects: ${results.checkedLegacyRedirects}`);
  console.log(`Checked lead types: ${results.checkedLeadTypes}`);

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
