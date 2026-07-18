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
        option.textContent = "ЖК «Чкалов» — Аэродромная 18Г";
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

  function updateTellermanovHomepageCard(claims) {
    const card = findHomepageProjectCard("Просторная 4А", "ЖК «Теллерманов сад»");
    if (!card) return false;
    const buildings = claims.get("buildings_total") || 2;
    const apartments = claims.get("complex_apartments_total") || 194;
    const ceiling = String(claims.get("ceiling_height") || 2.7).replace(".", ",");
    const studioFrom = claims.get("studio_area_from_m2") || 25;
    const familyTo = claims.get("four_room_area_to_m2") || 92;
    const eyebrow = card.querySelector(".eyebrow");
    const title = card.querySelector("h3");
    const description = card.querySelector("p");
    const list = card.querySelector("ul.list");
    const primary = card.querySelector('a[data-track-action="object_quick_consultation"]');
    const details = card.querySelector('a[data-track-action="object_details"]');
    if (eyebrow) eyebrow.textContent = "Старт продаж · подтверждённые сведения";
    if (title) title.textContent = "ЖК «Теллерманов сад»";
    if (description) description.textContent = "Два дома комфорт-класса на улице Просторной с закрытым двором, общедомовой котельной и улучшенной предчистовой отделкой.";
    if (list) list.replaceChildren(
      createListItem(`${buildings} дома · ${apartments} квартиры · потолки ${ceiling} м.`),
      createListItem(`Студии от ${studioFrom} м² и семейные квартиры до ${familyTo} м².`),
      createListItem("Ипотека, семейная ипотека, материнский капитал, рассрочка и trade-in — условия уточняются.")
    );
    if (primary) primary.textContent = "Узнать цены и наличие";
    if (details) details.textContent = "Смотреть проект";
    card.dataset.buyerContent = "confirmed";
    return true;
  }

  function updateAerodromnayaHomepageCard(claims) {
    const card = findHomepageProjectCard("Аэродромная 18Г", "ЖК «Чкалов»", "ЖК «Чкалов» на Аэродромной 18Г");
    if (!card || !claims.has("public_name") || !claims.has("building_type_statement")) return false;
    const eyebrow = card.querySelector(".eyebrow");
    const title = card.querySelector("h3");
    const description = card.querySelector("p");
    const list = card.querySelector("ul.list");
    const primary = card.querySelector('a[data-track-action="object_quick_consultation"]');
    const details = card.querySelector('a[data-track-action="object_details"]');
    if (eyebrow) eyebrow.textContent = "Публичные сведения площадки";
    if (title) title.textContent = "ЖК «Чкалов»";
    if (description) description.textContent = "ЦИАН указывает кирпичный дом на Аэродромной 18Г с этажностью 3–7, потолками 2,7 м и черновой отделкой.";
    if (list) list.replaceChildren(
      createListItem("Название и общие характеристики приведены по карточке ЦИАН."),
      createListItem("Указаны гостевая парковка, детская и спортивная площадки и места отдыха."),
      createListItem("Секция, ввод, продавец, договор, цена и ипотека проверяются по конкретной квартире.")
    );
    if (primary) primary.textContent = "Проверить квартиру";
    if (details) details.textContent = "Смотреть ЖК";
    card.dataset.buyerContent = "confirmed-marketplace-statement";
    return true;
  }

  function updateSennayaHomepageCard(claims) {
    const card = findHomepageProjectCard("Сенная 76", "Дом на Сенной 76");
    if (!card || !claims.has("public_name") || !claims.has("facade_material_statement")) return false;
    const eyebrow = card.querySelector(".eyebrow");
    const title = card.querySelector("h3");
    const description = card.querySelector("p");
    const list = card.querySelector("ul.list");
    const primary = card.querySelector('a[data-track-action="object_quick_consultation"]');
    const details = card.querySelector('a[data-track-action="object_details"]');
    if (eyebrow) eyebrow.textContent = "Публичные сведения о доме";
    if (title) title.textContent = "Дом на Сенной 76";
    if (description) description.textContent = "Дом с заявленными кирпичным фасадом, керамической кровлей, индивидуальным отоплением, благоустройством и видеонаблюдением.";
    if (list) list.replaceChildren(
      createListItem("Фасад из голландского кирпича и кровля из керамической черепицы — по публичному заявлению представителя застройщика."),
      createListItem("Индивидуальное отопление, система «умный дом» и энергоэффективное освещение."),
      createListItem("Цена, наличие, продавец и документы конкретной квартиры проверяются отдельно.")
    );
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
        updateHomepageStructuredData("/catalog/aerodromnaya-18g/", "ЖК «Чкалов»");
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
