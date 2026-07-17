(() => {
  const scriptUrl = document.currentScript?.src || "";
  if (!scriptUrl || typeof window.fetch !== "function") return;

  const PROFILE_URL = new URL("../../data/verification/prostornaya-4a.json", scriptUrl).href;
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
      if (String(option.value || option.textContent || "").trim() !== "Просторная 4А") return;
      option.value = "Просторная 4А";
      option.textContent = "ЖК «Теллерманов сад» — ул. Просторная";
    });
  }

  function findHomepageProjectCard() {
    return Array.from(document.querySelectorAll("#objects article.card")).find((card) => {
      const title = card.querySelector("h3")?.textContent?.trim() || "";
      return title === "Просторная 4А" || title === "ЖК «Теллерманов сад»";
    }) || null;
  }

  function updateHomepageCard(claims) {
    const card = findHomepageProjectCard();
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
    if (list) {
      list.replaceChildren(
        createListItem(`${buildings} дома · ${apartments} квартиры · потолки ${ceiling} м.`),
        createListItem(`Студии от ${studioFrom} м² и семейные квартиры до ${familyTo} м².`),
        createListItem("Ипотека, семейная ипотека, материнский капитал, рассрочка и trade-in — условия уточняются.")
      );
    }
    if (primary) primary.textContent = "Узнать цены и наличие";
    if (details) details.textContent = "Смотреть проект";
    card.dataset.buyerContent = "confirmed";
    return true;
  }

  function createListItem(text) {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }

  function updateHomepageStructuredData() {
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || "{}");
        const items = data?.mainEntity?.itemListElement;
        if (!Array.isArray(items)) return;
        const project = items.find((item) => String(item?.url || "").includes("/catalog/prostornaya-4a/"));
        if (!project) return;
        project.name = "ЖК «Теллерманов сад»";
        script.textContent = JSON.stringify(data);
      } catch (error) {
        // Невалидный или чужой JSON-LD не должен мешать странице.
      }
    });
  }

  fetch(PROFILE_URL, { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error("Buyer profile unavailable");
      return response.json();
    })
    .then((profile) => {
      const claims = getPublicClaims(profile);
      if (!claims.has("complex_name") || !claims.has("complex_apartments_total")) return;
      updateProjectOptions();
      updateHomepageCard(claims);
      updateHomepageStructuredData();
      window.__NEWBUILD_BUYER_PROJECT_CONTENT__ = true;
    })
    .catch(() => {
      updateProjectOptions();
    });
})();
