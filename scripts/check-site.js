const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const ignoredSchemes = /^(https?:|mailto:|tel:|sms:|javascript:|data:)/i;
const htmlFiles = [];
const warnings = [];
const errors = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      htmlFiles.push(fullPath);
    }
  }
}

function stripUrl(value) {
  return value.split("#")[0].split("?")[0].trim();
}

function existsAsPageOrAsset(candidate) {
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return true;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    return fs.existsSync(path.join(candidate, "index.html"));
  }
  if (!path.extname(candidate)) {
    return fs.existsSync(path.join(candidate, "index.html"));
  }
  return false;
}

function resolveLocalUrl(fromFile, rawUrl) {
  const cleanUrl = stripUrl(rawUrl);

  if (!cleanUrl || cleanUrl.startsWith("#") || ignoredSchemes.test(cleanUrl)) {
    return null;
  }

  if (cleanUrl.startsWith("/")) {
    return path.join(root, cleanUrl);
  }

  return path.resolve(path.dirname(fromFile), cleanUrl);
}

function checkHtmlFile(file) {
  const html = fs.readFileSync(file, "utf8");
  const relativeFile = path.relative(root, file);
  const attrPattern = /\b(?:href|src)=["']([^"']+)["']/gi;
  let match;

  while ((match = attrPattern.exec(html)) !== null) {
    const rawUrl = match[1];
    const localPath = resolveLocalUrl(file, rawUrl);
    if (!localPath) continue;

    if (!localPath.startsWith(root)) {
      errors.push(`${relativeFile}: ссылка выходит за пределы сайта: ${rawUrl}`);
      continue;
    }

    if (!existsAsPageOrAsset(localPath)) {
      errors.push(`${relativeFile}: не найден локальный ресурс: ${rawUrl}`);
    }
  }
}

function checkPlaceholders() {
  const filesToScan = ["robots.txt", "sitemap.xml", "README.md"];
  for (const fileName of filesToScan) {
    const filePath = path.join(root, fileName);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    if (content.includes("https://example.com")) {
      warnings.push(`${fileName}: нужно заменить https://example.com на реальный домен перед публикацией.`);
    }
  }
}

walk(root);
htmlFiles.forEach(checkHtmlFile);
checkPlaceholders();

if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (errors.length) {
  console.error("Errors:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Site check passed: ${htmlFiles.length} HTML files checked.`);
