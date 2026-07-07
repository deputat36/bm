(() => {
  const DEFAULT_PROJECTS_INDEX_URL = "/data/projects/index.json";
  const DEFAULT_BUILDERS_INDEX_URL = "/data/builders/index.json";

  function normalizeIndexPayload(payload) {
    if (Array.isArray(payload)) {
      return {
        schema_version: 0,
        updated_at: "",
        project: {},
        items: payload
      };
    }

    if (payload && Array.isArray(payload.items)) {
      return {
        schema_version: payload.schema_version || 1,
        updated_at: payload.updated_at || "",
        project: payload.project || {},
        items: payload.items
      };
    }

    return {
      schema_version: 0,
      updated_at: "",
      project: {},
      items: []
    };
  }

  async function loadJsonIndex(url) {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Не удалось загрузить индекс: ${url}`);
    }

    return normalizeIndexPayload(await response.json());
  }

  function normalizeProject(item) {
    return {
      id: item.id || "",
      slug: item.slug || "",
      name: item.name || "",
      shortName: item.short_name || item.name || "",
      city: item.city || "",
      region: item.region || "",
      address: item.address || "",
      builderId: item.builder_id || "",
      builderName: item.builder_name || "",
      status: item.status || "",
      salesStatus: item.sales_status || "",
      housingClass: item.class || "",
      apartmentsTotal: Number(item.apartments_total || 0),
      areaMin: Number(item.area_min || 0),
      areaMax: Number(item.area_max || 0),
      handover: item.handover || "",
      apartmentTypeTitles: Array.isArray(item.apartment_type_titles) ? item.apartment_type_titles : [],
      detailUrl: item.detail_url || item.url || "",
      dataFile: item.data_file || "",
      verificationStatus: item.verification_status || "unknown",
      isPublicReady: Boolean(item.is_public_ready),
      isFeatured: Boolean(item.is_featured),
      isActive: item.is_active !== false,
      lastCheckedAt: item.last_checked_at || "",
      verificationNote: item.verification_note || ""
    };
  }

  function normalizeBuilder(item) {
    return {
      id: item.id || "",
      slug: item.slug || "",
      name: item.name || "",
      brandName: item.brand_name || item.name || "",
      city: item.city || "",
      region: item.region || "",
      logo: item.logo || "",
      projects: Array.isArray(item.projects) ? item.projects : [],
      projectsCount: Number(item.projects_count || (Array.isArray(item.projects) ? item.projects.length : 0)),
      detailUrl: item.detail_url || "",
      dataFile: item.data_file || "",
      isActive: item.is_active !== false
    };
  }

  function formatAreaRange(project) {
    if (!project.areaMin && !project.areaMax) return "";
    if (project.areaMin === project.areaMax) return `${project.areaMin.toLocaleString("ru-RU")} м²`;
    return `${project.areaMin.toLocaleString("ru-RU")}–${project.areaMax.toLocaleString("ru-RU")} м²`;
  }

  function getActiveProjects(projects) {
    return projects.filter((project) => project.isActive);
  }

  function getFeaturedProjects(projects) {
    return getActiveProjects(projects).filter((project) => project.isFeatured);
  }

  async function loadCatalogData(options = {}) {
    const projectsIndexUrl = options.projectsIndexUrl || DEFAULT_PROJECTS_INDEX_URL;
    const buildersIndexUrl = options.buildersIndexUrl || DEFAULT_BUILDERS_INDEX_URL;

    const [projectsIndex, buildersIndex] = await Promise.all([
      loadJsonIndex(projectsIndexUrl),
      loadJsonIndex(buildersIndexUrl).catch(() => normalizeIndexPayload([]))
    ]);

    const projects = projectsIndex.items.map(normalizeProject);
    const builders = buildersIndex.items.map(normalizeBuilder);

    return {
      projectsIndex,
      buildersIndex,
      projects,
      builders,
      activeProjects: getActiveProjects(projects),
      featuredProjects: getFeaturedProjects(projects)
    };
  }

  window.NewbuildsCatalogData = {
    loadCatalogData,
    normalizeIndexPayload,
    normalizeProject,
    normalizeBuilder,
    formatAreaRange,
    getActiveProjects,
    getFeaturedProjects
  };
})();
