import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const homepagePath = path.join(ROOT, "index.html");
const errors = [];

const OBJECTS = [
  { id: "prostornaya-4a", page: "catalog/prostornaya-4a/index.html" },
  { id: "aerodromnaya-18g", page: "catalog/aerodromnaya-18g/index.html" },
  { id: "sennaya-76", page: "catalog/sennaya-76/index.html" }
];

function read(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

const homepage = read("index.html");

if (!homepage.includes('data-form-id="homepage_quick_selection"')) {
  errors.push("index.html: homepage quick selection form is missing");
}

OBJECTS.forEach(({ id, page }) => {
  const quickHref = `catalog/${id}/#quick-lead`;
  const legacyHref = `catalog/${id}/#lead`;
  const quickTracking = `href="${quickHref}" data-track-action="object_quick_consultation" data-track-placement="homepage_object_card" data-track-object="${id}"`;
  const detailsTracking = `href="catalog/${id}/" data-track-action="object_details" data-track-placement="homepage_object_card" data-track-object="${id}"`;

  if (!homepage.includes(quickTracking)) {
    errors.push(`index.html: ${id} primary CTA must lead to #quick-lead with object tracking`);
  }

  if (!homepage.includes(detailsTracking)) {
    errors.push(`index.html: ${id} details CTA tracking is missing`);
  }

  if (homepage.includes(legacyHref)) {
    errors.push(`index.html: ${id} still leads to the detailed #lead form`);
  }

  const objectPage = read(page);
  if (objectPage && (!objectPage.includes('id="quick-lead"') || !objectPage.includes("data-primary-lead"))) {
    errors.push(`${page}: homepage CTA target has no primary quick lead block`);
  }
});

if (/data-track-action=["']object_lead["']/i.test(homepage)) {
  errors.push("index.html: legacy object_lead event remains on homepage cards");
}

if (!homepage.includes('href="catalog/" data-track-action="catalog_open" data-track-placement="homepage_objects"')) {
  errors.push("index.html: general catalog CTA tracking is missing after object cards");
}

console.log(`Checked homepage object CTAs: ${OBJECTS.length}`);

if (errors.length) {
  console.error("\nHomepage object CTA validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Homepage object CTA validation passed.");
