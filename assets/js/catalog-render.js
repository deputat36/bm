(() => {
  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getProjectBadges(project) {
    const badges = [];

    if (project.isFeatured) badges.push("Первый объект");
    if (project.status) badges.push(project.status);
    if (project.isPublicReady === false) badges.push("Требует проверки");

    return badges;
  }

  function renderBadges(project) {
    const badges = getProjectBadges(project);

    if (!badges.length) return "";

    return `<div class="catalog-project-card__badges">${badges
      .map((badge) => `<span class="catalog-project-card__badge">${escapeHtml(badge)}</span>`)
      .join("")}</div>`;
  }

  function renderProjectParams(project) {
    const areaRange = window.NewbuildsCatalogData?.formatAreaRange(project) || "";
    const params = [
      ["Адрес", project.address],
      ["Застройщик", project.builderName],
      ["Квартиры", project.apartmentTypeTitles.join(", ")],
      ["Площади", areaRange],
      ["Квартир", project.apartmentsTotal ? String(project.apartmentsTotal) : ""],
      ["Срок сдачи", project.handover]
    ].filter(([, value]) => value);

    return `<div class="catalog-project-card__params">${params
      .map(([label, value]) => `<div class="catalog-project-card__param"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
      .join("")}</div>`;
  }

  function renderProjectCard(project) {
    const detailUrl = project.detailUrl || `/zhk/${project.slug}/`;
    const note = project.verificationNote || project.salesStatus || "Информация справочная. Актуальные цены, наличие квартир и условия покупки нужно уточнять перед принятием решения.";

    return `
      <article class="catalog-project-card" data-project-id="${escapeHtml(project.id)}">
        ${renderBadges(project)}
        <h3>${escapeHtml(project.name)}</h3>
        <p class="catalog-project-card__summary">${escapeHtml(project.salesStatus || "Карточка объекта в каталоге новостроек Борисоглебска.")}</p>
        ${renderProjectParams(project)}
        <p class="catalog-project-card__note">${escapeHtml(note)}</p>
        <div class="catalog-project-card__actions">
          <a class="catalog-project-card__button" href="${escapeHtml(detailUrl)}">Открыть карточку</a>
        </div>
      </article>
    `;
  }

  function renderProjects(container, projects) {
    const onlyFeatured = container.dataset.catalogFeatured === "true";
    const maxItems = Number(container.dataset.catalogLimit || 0);
    const sourceProjects = onlyFeatured
      ? window.NewbuildsCatalogData.getFeaturedProjects(projects)
      : window.NewbuildsCatalogData.getActiveProjects(projects);
    const visibleProjects = maxItems > 0 ? sourceProjects.slice(0, maxItems) : sourceProjects;

    if (!visibleProjects.length) {
      container.innerHTML = `<div class="catalog-project-card catalog-project-card--empty">Пока нет активных объектов для вывода.</div>`;
      return;
    }

    container.innerHTML = visibleProjects.map(renderProjectCard).join("");
  }

  async function initCatalogRender() {
    const containers = document.querySelectorAll("[data-catalog-projects]");

    if (!containers.length || !window.NewbuildsCatalogData) return;

    try {
      const catalog = await window.NewbuildsCatalogData.loadCatalogData();
      containers.forEach((container) => renderProjects(container, catalog.projects));
      window.dispatchEvent(new CustomEvent("newbuildsCatalogRendered", { detail: catalog }));
    } catch (error) {
      containers.forEach((container) => {
        container.innerHTML = `<div class="catalog-project-card catalog-project-card--empty">Не удалось загрузить каталог. Попробуйте обновить страницу позже.</div>`;
      });
    }
  }

  window.NewbuildsCatalogRender = {
    escapeHtml,
    renderProjectCard,
    renderProjects,
    initCatalogRender
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCatalogRender);
  } else {
    initCatalogRender();
  }
})();
