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

function setHiddenField(form, name, value) {
  let field = form.querySelector(`input[name='${name}']`);

  if (!field) {
    field = document.createElement("input");
    field.type = "hidden";
    field.name = name;
    form.prepend(field);
  }

  field.value = value || "";
  return field;
}

function attachReferenceInterest(project) {
  const form = document.querySelector("form[data-form-id='catalog_priority_selection']") || document.querySelector("#lead form[data-lead-form]");
  if (!form) return;

  const objectName = project.display_name || project.address || "Выбранная новостройка";
  const objectId = project.id ? `reference:${project.id}` : "reference-object";
  const select = form.querySelector("select[name='residential_complex']");

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
    card.append(createElement("p", "", `Проверено: ${project.last_checked_at}`));
  }

  const actions = createElement("div", "hero__actions");
  const selectionLink = createElement("a", "button", "Подобрать новостройку");
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

document.querySelectorAll("[data-reference-catalog]").forEach(loadReferenceCatalog);
