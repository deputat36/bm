import fs from "node:fs";

const pages = [
  {
    path: "catalog/prostornaya-4a/index.html",
    profile: "../../data/verification/prostornaya-4a.json"
  },
  {
    path: "catalog/aerodromnaya-18g/index.html",
    profile: "../../data/verification/aerodromnaya-18g.json"
  },
  {
    path: "catalog/sennaya-76/index.html",
    profile: "../../data/verification/sennaya-76.json"
  }
];

for (const page of pages) {
  let html = fs.readFileSync(page.path, "utf8");

  if (!html.includes("data-verification-summary")) {
    const sectionPattern = /<section([^>]*?)data-project-status([^>]*?)>/;
    if (!sectionPattern.test(html)) {
      throw new Error(`${page.path}: data-project-status section not found`);
    }
    html = html.replace(
      sectionPattern,
      `<section$1data-project-status data-verification-summary data-verification-profile="${page.profile}"$2>`
    );
  }

  const scriptTag = '<script src="../../assets/js/project-verification-summary.js"></script>';
  if (!html.includes(scriptTag)) {
    const schemaTag = '<script src="../../assets/js/schema.js"></script>';
    if (!html.includes(schemaTag)) {
      throw new Error(`${page.path}: schema.js script tag not found`);
    }
    html = html.replace(schemaTag, `${scriptTag}\n  ${schemaTag}`);
  }

  if (!html.includes(`data-verification-profile="${page.profile}"`)) {
    throw new Error(`${page.path}: verification profile was not connected`);
  }

  fs.writeFileSync(page.path, html, "utf8");
}

console.log(`Connected verification summaries: ${pages.length}`);