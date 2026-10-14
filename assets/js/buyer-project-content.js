(() => {
  const scriptUrl = document.currentScript?.src || "";
  if (!scriptUrl || typeof window.fetch !== "function") return;

  const PROFILE_URL = new URL("../../data/verification/prostornaya-4a.json", scriptUrl).href;
  const AERODROMNAYA_PROFILE_URL = new URL("../../data/verification/aerodromnaya-18g.json", scriptUrl).href;
  const SENNAYA_PROFILE_URL = new URL("../../data/verification/sennaya-76.json", scriptUrl).href;
  const CONFIRMED_STATUSES = new Set(["confirmed", "verified"]);

  function getPublicClaims(profile) {
    return new Map(
      (Array.isArray(profile?.claims) ? profile.claims : [])
        .filter((claim) => claim?.publication_allowed === true && CONFIRMED_STATUSES.has(String(claim?.verification_status || "")))
        .map((claim) => [String(claim.field || ""), claim.value])
    );
  }

  function updateProjectOptions() {
    document.querySelectorAll("select[name='residential_complex'] option").forEach((option) => {
      const value = String(option.value || option.textContent || "").trim();
      if (value === "Просторная 4А") {
        option.value = "Просторная 4А";
        option.textContent = "ЖК «Теллерманов сад» — ул. Просторная";
      }
      if (value === "Аэродромная 18Г") {
        option.value = "Аэродромная 18Г";
        option.textContent = "ЖК «Патриот» — Аэродромная 18Г";
      }
      if (value === "Сенная 76") {
        option.value = "Сенная 76";
        option.textContent = "Дом на Сенной 76";
      }
    });
  }

  function findHomepageProjectCard(...titles) {
    return Array.from(document.querySelectorAll("#objects article.card")).find((card) => {
      const title = card.querySelector("h3")?.textContent?.trim() || "";
      return titles.includes(title);
    }) || null;
  }

  function createListItem(text) {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }


  function publicMetric(claims, field) {
    const value = claims.get(field);
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
  }

  function publicStatement(claims, field) {
    const value = claims.get(field);
    return typeof value === "string" ? value.trim() : "";
  }

  function replacePublicFacts(list, facts) {
    if (!list) return;
    const visible = facts.filter((value) => typeof value === "string" && value.trim());
    list.replaceChildren(...(visible.length ? visible : ["Дополнительные характеристики уточняются."]).map(createListItem));
  }

  function updateTellermanovHomepageCard(claims) {
    const card = findHomepageProjectCard("Просторная 4А", "ЖК «Теллерманов сад»");
    if (!card || !publicStatement(claims, "complex_name") || !claims.has("complex_apartments_total")) return false;
    const buildings = publicMetric(claims, "buildings_total");
    const apartments = publicMetric(claims, "complex_apartments_total");
    const ceiling = publicMetric(claims, "ceiling_height");
    const studioFrom = publicMetric(claims, "studio_area_from_m2");
    const familyTo = publicMetric(claims, "four_room_area_to_m2");
    const purchaseMethods = Array.isArray(claims.get("purchase_methods"))
      ? claims.get("purchase_methods").filter((method) => typeof method === "string" && method.trim())
      : [];
    const eyebrow = card.querySelector(".eyebrow");
    const title = card.querySelector("h3");
    const description = card.querySelector("p");
    const list = card.querySelector("ul.list");
    const primary = card.querySelector('a[data-track-action="object_quick_consultation"]');
    const details = card.querySelector('a[data-track-action="object_details"]');

    if (eyebrow) eyebrow.textContent = publicStatement(claims, "sales_status") === "Старт продаж"
      ? "Старт продаж · подтверждённые сведения"
      : "Подтверждённые сведения о проекте";
    if (title) title.textContent = publicStatement(claims, "complex_name");
    const features = [
      publicStatement(claims, "class") && `Класс: ${publicStatement(claims, "class")}`,
      claims.get("closed_yard") === true && "Закрытый двор",
      claims.get("house_boiler") === true && "Общедомовая котельная",
      publicStatement(claims, "finish_type")
    ].filter(Boolean);
    if (description) description.textContent = [
      publicStatement(claims, "address") && `Адрес: ${publicStatement(claims, "address")}.`,
      features.length && `${features.join(" · ")}.`
    ].filter(Boolean).join(" ") || "Сведения о доме проверяются по первичным источникам.";

    const buildingFacts = [
      buildings !== null && `${buildings} ${buildings === 1 ? "дом" : buildings < 5 ? "дома" : "домов"}`,
      apartments !== null && `${apartments} квартир`,
      ceiling !== null && `потолки ${String(ceiling).replace(".", ",")} м`
    ].filter(Boolean);
    const areaFacts = [
      studioFrom !== null && `Студии от ${String(studioFrom).replace(".", ",")} м²`,
      familyTo !== null && `Четырёхкомнатные квартиры до ${String(familyTo).replace(".", ",")} м²`
    ].filter(Boolean);

    replacePublicFacts(list, [
      buildingFacts.length && `${buildingFacts.join(" · ")}.`,
      areaFacts.length && `${areaFacts.join("; ")}.`,
      purchaseMethods.length && `Указанные способы покупки: ${purchaseMethods.join(", ")}. Условия уточняются.`
    ]);
    if (primary) primary.textContent = "Узнать цены и наличие";
    if (details) details.textContent = "Смотреть проект";
    card.dataset.buyerContent = "confirmed";
    return true;
  }

  function updateAerodromnayaHomepageCard(claims) {
    const card = findHomepageProjectCard("Аэродромная 18Г", "ЖК «Патриот»", "ЖК «Патриот» на Аэродромной 18Г");
    if (!card || !publicStatement(claims, "building_type_statement")) return false;
    const eyebrow = card.querySelector(".eyebrow");
    const title = card.querySelector("h3");
    const description = card.querySelector("p");
    const list = card.querySelector("ul.list");
    const primary = card.querySelector('a[data-track-action="object_quick_consultation"]');
    const details = card.querySelector('a[data-track-action="object_details"]');
    if (eyebrow) eyebrow.textContent = "Рабочее название · первичный документ ожидается";
    if (title) title.textContent = "ЖК «Патриот»";
    if (description) description.textContent = "ЖК «Патриот» на Аэродромной 18Г. Общие характеристики дома приведены по карточке ЦИАН и требуют сверки по выбранной секции.";
    replacePublicFacts(list, [
      "ЖК «Патриот» используется как рабочее название; первичный документ по связке названия и адреса пока не принят.",
      ...["building_type_statement", "floor_range_statement", "ceiling_height_statement", "finish_statement"]
        .map((field) => publicStatement(claims, field)),
      "Секция, ввод, продавец, договор, цена и ипотека проверяются по конкретной квартире."
    ]);
    if (primary) primary.textContent = "Проверить квартиру";
    if (details) details.textContent = "Смотреть ЖК";
    card.dataset.buyerContent = "working-name-marketplace-characteristics";
    return true;
  }

  function updateSennayaHomepageCard(claims) {
    const card = findHomepageProjectCard("Сенная 76", "Дом на Сенной 76");
    if (!card || !publicStatement(claims, "public_name") || !publicStatement(claims, "facade_material_statement")) return false;
    const eyebrow = card.querySelector(".eyebrow");
    const title = card.querySelector("h3");
    const description = card.querySelector("p");
    const list = card.querySelector("ul.list");
    const primary = card.querySelector('a[data-track-action="object_quick_consultation"]');
    const details = card.querySelector('a[data-track-action="object_details"]');
    if (eyebrow) eyebrow.textContent = "Публичные сведения о доме";
    if (title) title.textContent = publicStatement(claims, "public_name");
    if (description) description.textContent = "Характеристики дома приводятся по публичному интервью представителя застройщика и требуют проверки для конкретной квартиры.";
    replacePublicFacts(list, [
      ...[
        "facade_material_statement", "roof_material_statement", "individual_heating_statement",
        "smart_home_statement", "energy_efficient_lighting_statement", "video_surveillance_statement"
      ].map((field) => publicStatement(claims, field)),
      "Цена, наличие, продавец и документы конкретной квартиры проверяются отдельно."
    ]);
    if (primary) primary.textContent = "Проверить квартиры";
    if (details) details.textContent = "Смотреть дом";
    card.dataset.buyerContent = "confirmed-statement";
    return true;
  }

  function updateHomepageStructuredData(pathFragment, name) {
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || "{}");
        const items = data?.mainEntity?.itemListElement;
        if (!Array.isArray(items)) return;
        const project = items.find((item) => String(item?.url || "").includes(pathFragment));
        if (!project) return;
        project.name = name;
        script.textContent = JSON.stringify(data);
      } catch (error) {
        // Невалидный или чужой JSON-LD не должен мешать странице.
      }
    });
  }

  function fetchProfile(url) {
    return fetch(url, { credentials: "same-origin" }).then((response) => {
      if (!response.ok) throw new Error("Buyer profile unavailable");
      return response.json();
    });
  }

  updateProjectOptions();

  Promise.allSettled([fetchProfile(PROFILE_URL), fetchProfile(AERODROMNAYA_PROFILE_URL), fetchProfile(SENNAYA_PROFILE_URL)]).then((results) => {
    const tellermanovProfile = results[0].status === "fulfilled" ? results[0].value : null;
    const aerodromnayaProfile = results[1].status === "fulfilled" ? results[1].value : null;
    const sennayaProfile = results[2].status === "fulfilled" ? results[2].value : null;
    if (tellermanovProfile) {
      const claims = getPublicClaims(tellermanovProfile);
      if (claims.has("complex_name") && claims.has("complex_apartments_total")) {
        updateTellermanovHomepageCard(claims);
        updateHomepageStructuredData("/catalog/prostornaya-4a/", "ЖК «Теллерманов сад»");
      }
    }
    if (aerodromnayaProfile) {
      const claims = getPublicClaims(aerodromnayaProfile);
      if (updateAerodromnayaHomepageCard(claims)) {
        updateHomepageStructuredData("/catalog/aerodromnaya-18g/", "ЖК «Патриот»");
      }
    }
    if (sennayaProfile) {
      const claims = getPublicClaims(sennayaProfile);
      if (updateSennayaHomepageCard(claims)) {
        updateHomepageStructuredData("/catalog/sennaya-76/", "Дом на Сенной 76");
      }
    }
    window.__NEWBUILD_BUYER_PROJECT_CONTENT__ = true;
  });
})();