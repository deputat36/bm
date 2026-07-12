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

function buildOrganizationSchema() {
  const organizationName = document.body.dataset.schemaOrganization;
  if (!organizationName) return null;

  const sameAs = (document.body.dataset.schemaSameAs || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organizationName,
    url: document.body.dataset.schemaOrganizationUrl || window.location.href
  };

  if (sameAs.length) {
    schema.sameAs = sameAs;
  }

  return schema;
}

function buildWebSiteSchema() {
  const siteName = document.body.dataset.schemaWebsite;
  if (!siteName) return null;

  const description = document.body.dataset.schemaDescription || document.querySelector('meta[name="description"]')?.getAttribute("content") || "";

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: document.body.dataset.schemaWebsiteUrl || window.location.origin + "/",
    description
  };
}

function buildItemListSchema() {
  const listName = document.body.dataset.schemaItemList;
  if (!listName) return null;

  const cards = Array.from(document.querySelectorAll("[data-schema-list-item]"));
  if (!cards.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    itemListElement: cards.map((card, index) => {
      const link = card.querySelector("a[href]");
      const name = card.dataset.schemaItemName || card.querySelector("h2, h3")?.textContent?.trim() || link?.textContent?.trim() || `Объект ${index + 1}`;
      const url = card.dataset.schemaItemUrl || link?.getAttribute("href") || window.location.href;

      return {
        "@type": "ListItem",
        position: index + 1,
        name,
        url: new URL(url, window.location.href).href
      };
    })
  };
}

function loadPortalScript(baseUrl, fileName) {
  const script = document.createElement("script");
  script.src = new URL(fileName, baseUrl).href;
  script.async = true;
  document.head.appendChild(script);
}

const websiteSchema = buildWebSiteSchema();
if (websiteSchema) createJsonLdScript(websiteSchema);

const breadcrumbSchema = buildBreadcrumbList();
if (breadcrumbSchema) createJsonLdScript(breadcrumbSchema);

const residenceSchema = buildResidenceSchema();
if (residenceSchema) createJsonLdScript(residenceSchema);

const organizationSchema = buildOrganizationSchema();
if (organizationSchema) createJsonLdScript(organizationSchema);

const itemListSchema = buildItemListSchema();
if (itemListSchema) createJsonLdScript(itemListSchema);

const schemaScriptUrl = document.currentScript?.src || "";
const portalLeadForm = document.querySelector("form[data-lead-form]");

if (schemaScriptUrl && portalLeadForm?.querySelector("select[name='residential_complex']")) {
  loadPortalScript(schemaScriptUrl, "priority-leads.js");
}

if (schemaScriptUrl && portalLeadForm) {
  loadPortalScript(schemaScriptUrl, "mobile-lead-bar.js");
}
