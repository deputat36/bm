import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];
const warnings = [];

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);

  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function repositoryPath(value) {
  return String(value || "").replace(/^\/+/, "");
}

function pageFile(value) {
  const clean = repositoryPath(value).replace(/\/+$/, "");
  return clean ? `${clean}/index.html` : "index.html";
}

function validateProject(project, projectIndex) {
  const label = project?.id || "unknown";

  if (!project?.id) {
    errors.push("priority project: missing id");
    return;
  }

  if (project.commercial_role !== "priority_lead") {
    errors.push(`${label}: commercial_role must be priority_lead`);
  }

  if (project.lead_type !== "project_consultation") {
    errors.push(`${label}: lead_type must be project_consultation`);
  }

  if (!project.lead_form_id) {
    errors.push(`${label}: missing lead_form_id`);
  }

  if (!project.data_file) {
    errors.push(`${label}: missing data_file`);
  }

  if (!project.page_url) {
    errors.push(`${label}: missing page_url`);
  }

  if (project.is_public_ready === true && project.verification_status !== "confirmed") {
    errors.push(`${label}: public-ready priority project must be confirmed`);
  }

  const indexedProject = projectIndex.find((item) => item.id === project.id);
  if (!indexedProject) {
    errors.push(`${label}: missing in data/projects/index.json`);
  } else {
    ["commercial_role", "lead_type", "lead_form_id", "verification_status", "is_public_ready"].forEach((field) => {
      if (indexedProject[field] !== project[field]) {
        errors.push(`${label}: ${field} does not match data/projects/index.json`);
      }
    });
  }

  const dataPath = repositoryPath(project.data_file);
  const data = dataPath ? readJson(dataPath) : null;

  if (data) {
    ["id", "verification_status", "is_public_ready"].forEach((field) => {
      if (data[field] !== project[field]) {
        errors.push(`${label}: ${field} does not match ${dataPath}`);
      }
    });

    if (data.commercial_role && data.commercial_role !== project.commercial_role) {
      errors.push(`${label}: commercial_role does not match ${dataPath}`);
    }

    if (data.lead_type && data.lead_type !== project.lead_type) {
      errors.push(`${label}: lead_type does not match ${dataPath}`);
    }

    if (data.lead_form_id && data.lead_form_id !== project.lead_form_id) {
      errors.push(`${label}: lead_form_id does not match ${dataPath}`);
    }
  }

  const htmlPath = pageFile(project.page_url);
  const fullHtmlPath = path.join(ROOT, htmlPath);

  if (!fs.existsSync(fullHtmlPath)) {
    errors.push(`${label}: page does not exist: ${htmlPath}`);
    return;
  }

  const html = fs.readFileSync(fullHtmlPath, "utf8");

  if (!html.includes(`data-form-id="${project.lead_form_id}"`)) {
    errors.push(`${label}: page does not contain lead form ${project.lead_form_id}`);
  }

  if (!html.includes(`data-lead-type="${project.lead_type}"`)) {
    errors.push(`${label}: page does not contain lead type ${project.lead_type}`);
  }

  if (!html.includes("noindex,follow") && project.is_public_ready === false) {
    warnings.push(`${label}: non-public project page should contain noindex,follow`);
  }
}

const register = readJson("data/research/priority-projects.json");
const projectIndex = readJson("data/projects/index.json");

if (register && Array.isArray(projectIndex)) {
  if (!Array.isArray(register.projects) || !register.projects.length) {
    errors.push("data/research/priority-projects.json: projects must be a non-empty array");
  } else {
    register.projects.forEach((project) => validateProject(project, projectIndex));
  }
}

console.log(`Checked priority projects: ${register?.projects?.length || 0}`);

if (warnings.length) {
  console.log("\nWarnings:");
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (errors.length) {
  console.error("\nErrors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nPriority project validation passed.");
