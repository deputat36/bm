function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function isPublishableReferenceProject(project) {
  return Boolean(
    project &&
    project.commercial_role === "reference_catalog" &&
    project.verification_status === "confirmed" &&
    project.is_public_ready === true &&
    Array.isArray(project.sources) &&
    project.sources.length > 0
  );
}

function formatProjectFacts(project) {
  const facts = [];

  if (project.building_status) facts.push(`Статус: ${project.building_status}`);
  if (project.builder_name) facts.push(`Застройщик: ${project.builder_name}`);
  if (project.commissioned_year) facts.push(`Год ввода: ${project.commissioned_year}`);
  if (project.handover) facts.push(`Срок сдачи: ${project.handover}`);
  if (project.floors) facts.push(`Этажность: ${project.floors}`);
  if (project.wall_material) facts.push(`Материал: ${project.wall_material}`);

  return facts.slice(0, 5);
}

function trackReferenceCatalogAction(project, action) {
  const payload = {
    event: "reference_catalog_action",
    action,
    reference_object_id: project.id || "",
    reference_object_name: project.display_name || project.address || "",
    reference_object_address: project.address || ""
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);

  if (typeof window.gtag === "function") {
    window.gtag("event", "reference_catalog_action", {
      event_category: "catalog",
      event_label: action,
      reference_object_id: payload.reference_object_id
    });
  }
}

// Preserve the general-form context when a buyer explores a reference card.
// Reference attribution is valid only while its temporary option is selected.
const referenceFormContexts = new WeakMap();

function bindReferenceForm(form) {
  if (referenceFormContexts.has(form)) return;
  const select = form.querySelector("select[name='residential_complex']");
  if (!select) return;

  referenceFormContexts.set(form, {
    complex: form.dataset.complex || "",
    complexId: form.dataset.complexId || ""
  });

  select.addEventListener("change", () => {
    if (select.selectedOptions[0]?.hasAttribute("data-reference-option")) return;

    form.querySelectorAll("[data-reference-catalog-field]").forEach((field) => field.remove());
    select.querySelectorAll("option[data-reference-option]").forEach((option) => option.remove());

    const initial = referenceFormContexts.get(form);
    if (initial.complex) form.dataset.complex = initial.complex;
    else delete form.dataset.complex;
    if (initial.complexId) form.dataset.complexId = initial.complexId;
    else delete form.dataset.complexId;
  });
}

function setHiddenField(form, name, value) {
  let field = form.querySelector(`input[name='${name}']`);

  if (!field) {
    field = document.createElement("input");
    field.type = "hidden";
    field.name = name;
    form.prepend(field);
  }

  field.value = value || "";
  field.setAttribute("data-reference-catalog-field", "");
  return field;
}

function attachReferenceInterest(project) {
  const form = document.querySelector("form[data-form-id='catalog_priority_selection']") || document.querySelector("#lead form[data-lead-form]");
  if (!form) return;

  const objectName = project.display_name || project.address || "Выбранная новостройка";
  const objectId = project.id ? `reference:${project.id}` : "reference-object";
  const select = form.querySelector("select[name='residential_complex']");
  bindReferenceForm(form);

  if (select) {
    select.querySelectorAll("option[data-reference-option]").forEach((option) => option.remove());
    const option = document.createElement("option");
    option.value = objectName;
    option.textContent = objectName;
    option.selected = true;
    option.setAttribute("data-reference-option", "");
    select.append(option);
    select.value = objectName;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  setHiddenField(form, "residential_complex_id", objectId);
  setHiddenField(form, "reference_object_id", project.id || "");
  setHiddenField(form, "reference_object_name", objectName);
  setHiddenField(form, "reference_object_address", project.address || "");

  form.dataset.complex = objectName;
  form.dataset.complexId = objectId;
  trackReferenceCatalogAction(project, "selection");
}

function createSourceLink(source, project) {
  if (!source || !source.url || !/^https?:\/\//i.test(source.url)) return null;

  const link = createElement("a", "", source.title || "Открыть источник");
  link.href = source.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.addEventListener("click", () => trackReferenceCatalogAction(project, "source"));
  return link;
}

function renderReferenceProject(project) {
  const card = createElement("article", "card card--shadow");
  card.id = `reference-${project.id}`;
  const status = createElement("span", "eyebrow", project.public_status_label || "Данные проверены");
  const title = createElement("h3", "", project.display_name || project.address || "Новостройка");
  const address = createElement("p", "", project.address || "Адрес подтверждается");
  const facts = formatProjectFacts(project);

  card.append(status, title, address);

  if (facts.length) {
    const list = createElement("ul", "list");
    facts.forEach((fact) => list.append(createElement("li", "", fact)));
    card.append(list);
  }

  if (project.last_checked_at) {
    card.append(createElement("p", "city-guide__source", `Основные сведения проверены: ${project.last_checked_at}. Даты дополнительных сведений указаны в источниках.`));
  }

  const details = createElement("details", "reference-buyers__details");
  details.append(createElement("summary", "", "Особенности, вопросы и источники"));
  const acceptedUrls = new Set(project.sources.map((source) => source.url));
  const publicFacts = (project.buyer_facts || []).filter((fact) =>
    fact.publication_allowed === true && fact.verification_status === "confirmed"
    && acceptedUrls.has(fact.source_url) && typeof fact.text === "string"
  );
  publicFacts.forEach((fact) => {
    details.append(createElement("p", "", fact.text));
    const source = createSourceLink({url: fact.source_url, title: `Источник · проверено ${fact.checked_at}`}, project);
    if (source) { source.className = "city-guide__source"; details.append(source); }
  });
  if (Array.isArray(project.buyer_checks) && project.buyer_checks.length) {
    details.append(createElement("h4", "", "Что уточнить на просмотре"));
    const checks = createElement("ul", "list");
    project.buyer_checks.forEach((check) => checks.append(createElement("li", "", check)));
    details.append(checks);
  }
  details.append(createElement("h4", "", "Источники по дому"));
  const sourceList = createElement("ul", "list");
  project.sources.forEach((source) => {
    const link = createSourceLink(source, project);
    if (link) { const item = createElement("li"); item.append(link); sourceList.append(item); }
  });
  details.append(sourceList);
  card.append(details);

  const actions = createElement("div", "hero__actions");
  const selectionLink = createElement("a", "button", "Узнать о квартирах");
  selectionLink.href = "#lead";
  selectionLink.addEventListener("click", () => attachReferenceInterest(project));
  actions.append(selectionLink);

  const firstPublicSource = project.sources.map((source) => createSourceLink(source, project)).find(Boolean);
  if (firstPublicSource) {
    firstPublicSource.className = "button button--ghost";
    actions.append(firstPublicSource);
  }

  card.append(actions);
  return card;
}

function renderEmptyState(container, data) {
  const emptyState = data?.empty_state || {};
  const card = createElement("article", "card card--shadow");
  card.append(
    createElement("span", "eyebrow", "Сбор и проверка данных"),
    createElement("h3", "", emptyState.title || "Справочный реестр наполняется"),
    createElement("p", "", emptyState.text || "Объекты появятся после проверки первичных публичных источников.")
  );
  container.append(card);
}

async function loadReferenceCatalog(container) {
  const source = container.dataset.source || "../data/research/reference-projects.json";

  try {
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const projects = Array.isArray(data.projects)
      ? data.projects.filter(isPublishableReferenceProject)
      : [];

    container.replaceChildren();

    if (!projects.length) {
      renderEmptyState(container, data);
      return;
    }

    projects.forEach((project) => container.append(renderReferenceProject(project)));
  } catch (error) {
    container.replaceChildren();
    const card = createElement("article", "card");
    card.append(
      createElement("h3", "", "Каталог временно недоступен"),
      createElement("p", "", "Не удалось загрузить справочные карточки. Приоритетные объекты и общая форма заявки продолжают работать.")
    );
    container.append(card);
  }
}

const detailedForm = document.querySelector("form[data-form-id='catalog_priority_selection']");
if (detailedForm) bindReferenceForm(detailedForm);

document.querySelectorAll("[data-reference-catalog]").forEach(loadReferenceCatalog);
