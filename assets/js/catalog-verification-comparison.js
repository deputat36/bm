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
      fields: new Set(["address", "status", "sales_status", "official_name", "project_name"])
    },
    {
      label: "Застройщик и документы",
      fields: new Set([
        "builder_name",
        "developer_name",
        "developer_inn",
        "developer_ogrn",
        "developer_ogrnip",
        "project_declaration",
        "project_declaration_date",
        "building_permit",
        "building_permit_date",
        "nash_dom_rf_id",
        "seller_identity",
        "seller_documents"
      ])
    },
    {
      label: "Дом и сроки",
      fields: new Set([
        "class",
        "wall_material",
        "floors",
        "entrances",
        "sections",
        "construction_status",
        "handover",
        "keys_until",
        "commissioning_status",
        "commissioning_date"
      ])
    },
    {
      label: "Квартиры",
      fields: new Set([
        "apartments_total",
        "apartment_types",
        "room_types",
        "area_min",
        "area_max",
        "ceiling_height",
        "layouts",
        "apartment_area",
        "cadastral_numbers"
      ])
    },
    {
      label: "Покупка и расчёт",
      fields: new Set([
        "sales_scheme",
        "contract_type",
        "purchase_method",
        "mortgage_eligibility",
        "payment_terms",
        "price",
        "availability"
      ])
    }
  ];

  function formatDate(value) {
    const date = new Date(`${String(value || "").slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "дата уточняется";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  function getCategories(claims) {
    const fields = new Set(
      claims
        .map((claim) => String(claim?.field || "").trim())
        .filter(Boolean)
    );

    return CATEGORY_RULES
      .filter((category) => Array.from(category.fields).some((field) => fields.has(field)))
      .map((category) => category.label);
  }

  function setText(card, selector, value) {
    const node = card.querySelector(selector);
    if (node) node.textContent = value;
  }

  function renderCard(card, profile) {
    const sources = Array.isArray(profile?.sources) ? profile.sources : [];
    const claims = Array.isArray(profile?.claims) ? profile.claims : [];
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
