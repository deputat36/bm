(() => {
  const scriptUrl = document.currentScript?.src || "";
  const projectId = String(document.body?.dataset?.schemaProject || "").trim();
  const snapshotFiles = {
    "aerodromnaya-18g": "../../data/market-snapshots/aerodromnaya-18g.json",
    "sennaya-76": "../../data/market-snapshots/sennaya-76.json"
  };
  const snapshotPath = snapshotFiles[projectId];
  if (!scriptUrl || !snapshotPath || typeof window.fetch !== "function") return;
  if (document.querySelector("[data-project-market-snapshot]")) return;

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : "дата уточняется";
  }

  function createNode(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function renderSnapshot(snapshot) {
    if (snapshot?.project_id !== projectId || !Array.isArray(snapshot?.cards) || snapshot.cards.length < 3) return;

    const section = createNode("section", "section--soft");
    section.dataset.projectMarketSnapshot = "true";
    section.setAttribute("aria-labelledby", `${projectId}-market-snapshot-title`);

    const container = createNode("div", "container");
    const head = createNode("div", "section__head");
    const eyebrow = createNode("span", "eyebrow", `Рыночный срез · ${formatDate(snapshot.checked_at)}`);
    const title = createNode("h2", "", snapshot.title || "Примеры квартир в предложениях");
    title.id = `${projectId}-market-snapshot-title`;
    const intro = createNode("p", "", snapshot.intro || "Публичные предложения проверяются на дату обращения.");
    head.append(eyebrow, title, intro);

    const grid = createNode("div", "grid grid--4");
    snapshot.cards.forEach((cardData) => {
      const card = createNode("article", "card card--shadow");
      const cardTitle = createNode("h3", "", String(cardData?.title || "Вариант квартиры"));
      const cardText = createNode("p", "", String(cardData?.text || "Подробности уточняются."));
      const source = createNode("p", "project-status-note", String(cardData?.source_label || "Публичный источник"));
      card.append(cardTitle, cardText, source);
      grid.appendChild(card);
    });

    const notes = createNode("div", "notice");
    const noteParts = [snapshot.location_note, snapshot.source_note].filter(Boolean);
    notes.textContent = noteParts.join(" ");

    const actions = createNode("div", "hero__actions");
    const consultation = createNode("a", "button", snapshot.cta_label || "Получить актуальную подборку");
    consultation.href = "#quick-lead";
    consultation.dataset.trackAction = "market_snapshot_consultation";
    consultation.dataset.trackPlacement = "project_market_snapshot";
    consultation.dataset.trackObject = projectId;
    actions.appendChild(consultation);

    const sources = Array.isArray(snapshot.sources) ? snapshot.sources : [];
    sources.slice(0, 3).forEach((sourceData) => {
      const url = String(sourceData?.url || "");
      if (!/^https:\/\//i.test(url)) return;
      const link = createNode("a", "button button--ghost", String(sourceData?.label || "Открыть источник"));
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.dataset.trackAction = "market_snapshot_source_open";
      link.dataset.trackPlacement = "project_market_snapshot";
      link.dataset.trackObject = projectId;
      actions.appendChild(link);
    });

    container.append(head, grid, notes, actions);
    section.appendChild(container);

    const verificationSection = document.querySelector("[data-verification-summary]");
    if (verificationSection) {
      verificationSection.insertAdjacentElement("beforebegin", section);
    } else {
      document.querySelector("main")?.appendChild(section);
    }
  }

  fetch(new URL(snapshotPath, scriptUrl), {
    cache: "no-store",
    credentials: "same-origin"
  })
    .then((response) => {
      if (!response.ok) throw new Error(`Market snapshot request failed: ${response.status}`);
      return response.json();
    })
    .then(renderSnapshot)
    .catch(() => undefined);
})();
