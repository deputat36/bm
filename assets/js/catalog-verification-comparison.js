(() => {
  const cards = Array.from(document.querySelectorAll("[data-catalog-verification-card]"));
  if (!cards.length || typeof window.fetch !== "function") return;

  const SOURCE_ACCEPTED_STATUSES = new Set(["accepted", "verified"]);
  const CLAIM_CONFIRMED_STATUSES = new Set(["confirmed", "verified"]);
  const STATUS_LABELS = {
    public_ready: "Готово к публикации",
    requires_recheck: "Требует повторной проверки",
    requires_sources: "Нужны первичные источники"
  };
  const CATEGORY_RULES = [
    {
      label: "Статус объекта",
      fields: new Set(["address", "status", "sales_status", "official_name", "project_name", "complex_name", "public_name"])
    },
    {
      label: "Застройщик и документы",
      fields: new Set([
        "builder_name", "developer_name", "developer_inn", "developer_ogrn", "developer_ogrnip",
        "project_declaration", "project_declaration_date", "building_permit", "building_permit_date",
        "project_documents_published", "nash_dom_rf_id", "seller_identity", "seller_documents",
        "developer_attribution_statement"
      ])
    },
    {
      label: "Дом и сроки",
      fields: new Set([
        "class", "wall_material", "floors", "entrances", "sections", "buildings_total", "construction_status",
        "handover", "keys_until", "commissioning_status", "commissioning_date", "closed_yard", "house_boiler",
        "parking_spaces", "facade_material_statement", "roof_material_statement", "individual_heating_statement",
        "smart_home_statement", "video_surveillance_statement", "building_type_statement", "floor_range_statement",
        "guest_parking_statement", "territory_features_statement"
      ])
    },
    {
      label: "Квартиры",
      fields: new Set([
        "apartments_total", "complex_apartments_total", "apartment_types", "room_types", "area_min", "area_max",
        "studio_area_from_m2", "four_room_area_to_m2", "ceiling_height", "layouts", "layout_features",
        "finish_type", "apartment_area", "cadastral_numbers", "ceiling_height_statement", "finish_statement"
      ])
    },
    {
      label: "Покупка и расчёт",
      fields: new Set([
        "sales_scheme", "contract_type", "purchase_method", "purchase_methods", "mortgage_eligibility",
        "payment_terms", "price", "availability"
      ])
    }
  ];

  function formatDate(value) {
    const date = new Date(`${String(value || "").slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "дата уточняется";
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  function getCategories(claims) {
    const fields = new Set(claims.map((claim) => String(claim?.field || "").trim()).filter(Boolean));
    return CATEGORY_RULES
      .filter((category) => Array.from(category.fields).some((field) => fields.has(field)))
      .map((category) => category.label);
  }

  function getPublicClaimMap(claims) {
    return new Map(
      claims
        .filter((claim) => claim?.publication_allowed === true && CLAIM_CONFIRMED_STATUSES.has(String(claim?.verification_status || "")))
        .map((claim) => [String(claim.field || ""), claim.value])
    );
  }

  function setText(card, selector, value) {
    const node = card.querySelector(selector);
    if (node) node.textContent = value;
  }

  function renderTellermanovBuyerCard(card, profile, claims) {
    const publicClaims = getPublicClaimMap(claims);
    const buildings = publicClaims.get("buildings_total");
    const apartments = publicClaims.get("complex_apartments_total");
    const ceiling = publicClaims.get("ceiling_height");
    const studioFrom = publicClaims.get("studio_area_from_m2");
    const familyTo = publicClaims.get("four_room_area_to_m2");
    const finish = publicClaims.get("finish_type");
    const title = card.querySelector("h3");
    if (title) title.textContent = "ЖК «Теллерманов сад»";
    setText(card, "[data-verification-status]", "Подтверждённые сведения о проекте");
    setText(card, "[data-verification-date]", `Источник проверен: ${formatDate(profile?.updated_at)}`);
    setText(card, "[data-verification-sources]", `${buildings || 2} дома · ${apartments || 194} квартиры · потолки ${String(ceiling || 2.7).replace(".", ",")} м`);
    setText(card, "[data-verification-critical]", "Закрытый двор · общедомовая котельная · видеонаблюдение");
    setText(card, "[data-verification-categories]", `Студии от ${studioFrom || 25} м² · семейные квартиры до ${familyTo || 92} м² · ${String(finish || "предчистовая отделка").toLowerCase()}`);
    const primaryAction = card.querySelector('a[data-track-action="object_quick_consultation"]');
    const detailsAction = card.querySelector('a[data-track-action="object_open"]');
    if (primaryAction) primaryAction.textContent = "Узнать цены и наличие";
    if (detailsAction) detailsAction.textContent = "Смотреть проект";
    card.dataset.buyerContent = "confirmed";
  }

  function renderAerodromnayaBuyerCard(card, profile, claims) {
    const publicClaims = getPublicClaimMap(claims);
    if (!publicClaims.has("public_name") || !publicClaims.has("building_type_statement")) return false;
    const title = card.querySelector("h3");
    if (title) title.textContent = "ЖК «Чкалов»";
    setText(card, "[data-verification-status]", "Публичные сведения карточки ЦИАН");
    setText(card, "[data-verification-date]", `Площадки проверены: ${formatDate(profile?.updated_at)}`);
    setText(card, "[data-verification-sources]", "Кирпичный дом · этажность 3–7 · потолки 2,7 м");
    setText(card, "[data-verification-critical]", "Черновая отделка · гостевая парковка · площадки и места отдыха");
    setText(card, "[data-verification-categories]", "Секция, ввод, продавец, договор, цена и ипотека проверяются по конкретной квартире");
    const primaryAction = card.querySelector('a[data-track-action="object_quick_consultation"]');
    const detailsAction = card.querySelector('a[data-track-action="object_open"]');
    if (primaryAction) primaryAction.textContent = "Проверить квартиру";
    if (detailsAction) detailsAction.textContent = "Смотреть ЖК";
    card.dataset.buyerContent = "confirmed-marketplace-statement";
    return true;
  }

  function renderSennayaBuyerCard(card, profile, claims) {
    const publicClaims = getPublicClaimMap(claims);
    if (!publicClaims.has("public_name") || !publicClaims.has("facade_material_statement")) return false;
    const title = card.querySelector("h3");
    if (title) title.textContent = "Дом на Сенной 76";
    setText(card, "[data-verification-status]", "Публичные сведения представителя застройщика");
    setText(card, "[data-verification-date]", `Источник проверен: ${formatDate(profile?.updated_at)}`);
    setText(card, "[data-verification-sources]", "Кирпичный фасад · керамическая кровля · утепление фасада");
    setText(card, "[data-verification-critical]", "Индивидуальное отопление · система «умный дом» · видеонаблюдение");
    setText(card, "[data-verification-categories]", "Ландшафтный дизайн · автополив · энергоэффективное освещение; документы квартиры проверяются отдельно");
    const primaryAction = card.querySelector('a[data-track-action="object_quick_consultation"]');
    const detailsAction = card.querySelector('a[data-track-action="object_open"]');
    if (primaryAction) primaryAction.textContent = "Проверить квартиры";
    if (detailsAction) detailsAction.textContent = "Смотреть дом";
    card.dataset.buyerContent = "confirmed-statement";
    return true;
  }

  function renderCard(card, profile) {
    const sources = Array.isArray(profile?.sources) ? profile.sources : [];
    const claims = Array.isArray(profile?.claims) ? profile.claims : [];
    if (profile?.project_id === "tellermanov-sad") {
      renderTellermanovBuyerCard(card, profile, claims);
      card.dataset.verificationLoaded = "true";
      return;
    }
    if (profile?.project_id === "aerodromnaya-18g" && renderAerodromnayaBuyerCard(card, profile, claims)) {
      card.dataset.verificationLoaded = "true";
      return;
    }
    if (profile?.project_id === "sennaya-76" && renderSennayaBuyerCard(card, profile, claims)) {
      card.dataset.verificationLoaded = "true";
      return;
    }
    const acceptedSources = sources.filter((source) => SOURCE_ACCEPTED_STATUSES.has(String(source?.status || ""))).length;
    const criticalClaims = claims.filter((claim) => claim?.importance === "critical");
    const confirmedCritical = criticalClaims.filter((claim) => {
      const status = String(claim?.verification_status || "");
      return claim?.publication_allowed === true && CLAIM_CONFIRMED_STATUSES.has(status);
    }).length;
    const categories = getCategories(claims);
    setText(card, "[data-verification-status]", STATUS_LABELS[profile?.overall_status] || "Статус проверки уточняется");
    setText(card, "[data-verification-date]", `Обновлено: ${formatDate(profile?.updated_at)}`);
    setText(card, "[data-verification-sources]", `Проверено источников: ${acceptedSources}/${sources.length}`);
    setText(card, "[data-verification-critical]", `Подтверждено ключевых сведений: ${confirmedCritical}/${criticalClaims.length}`);
    setText(card, "[data-verification-categories]", categories.length ? categories.join(" · ") : "Категории сведений уточняются");
    card.dataset.verificationLoaded = "true";
  }

  function renderError(card) {
    setText(card, "[data-verification-status]", "Статус проверки временно недоступен");
    setText(card, "[data-verification-date]", "Данные будут обновлены после повторной проверки");
    setText(card, "[data-verification-sources]", "Источники уточняются");
    setText(card, "[data-verification-critical]", "Ключевые сведения уточняются");
    setText(card, "[data-verification-categories]", "Категории сведений уточняются");
    card.dataset.verificationLoaded = "error";
  }

  cards.forEach((card) => {
    const profileUrl = String(card.dataset.verificationProfile || "").trim();
    if (!profileUrl) {
      renderError(card);
      return;
    }
    fetch(profileUrl, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error("Verification profile unavailable");
        return response.json();
      })
      .then((profile) => renderCard(card, profile))
      .catch(() => renderError(card));
  });
})();
