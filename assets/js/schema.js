function createJsonLdScript(data) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function buildBreadcrumbList() {
  const breadcrumbs = document.querySelector(".breadcrumbs");
  if (!breadcrumbs) return null;

  const items = [];
  const links = Array.from(breadcrumbs.querySelectorAll("a"));

  links.forEach((link, index) => {
    items.push({
      "@type": "ListItem",
      position: index + 1,
      name: link.textContent.trim(),
      item: new URL(link.getAttribute("href"), window.location.href).href
    });
  });

  const textParts = breadcrumbs.textContent
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  const lastText = textParts[textParts.length - 1];

  if (lastText && (!items.length || items[items.length - 1].name !== lastText)) {
    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      name: lastText,
      item: window.location.href
    });
  }

  if (items.length < 2) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
  };
}

function buildResidenceSchema() {
  const project = document.body.dataset.schemaProject;
  if (!project) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: document.body.dataset.schemaProjectName || project,
    url: window.location.href,
    address: {
      "@type": "PostalAddress",
      streetAddress: document.body.dataset.schemaAddress || "",
      addressLocality: document.body.dataset.schemaCity || "Борисоглебск",
      addressRegion: document.body.dataset.schemaRegion || "Воронежская область",
      addressCountry: "RU"
    },
    numberOfFloors: document.body.dataset.schemaFloors || ""
  };
}

const breadcrumbSchema = buildBreadcrumbList();
if (breadcrumbSchema) createJsonLdScript(breadcrumbSchema);

const residenceSchema = buildResidenceSchema();
if (residenceSchema) createJsonLdScript(residenceSchema);
