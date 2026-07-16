(() => {
  const sections = Array.from(document.querySelectorAll("[data-verification-summary]"));
  if (!sections.length) return;

  function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : "дата уточняется";
  }

  function isVerifiedSource(source) {
    return source?.status === "verified" && /^https:\/\//i.test(String(source.reference || ""));
  }

  function createSummary(profile) {
    const sources = Array.isArray(profile?.sources) ? profile.sources : [];
    const claims = Array.isArray(profile?.claims) ? profile.claims : [];
    const criticalClaims = claims.filter((claim) => claim?.importance === "critical");
    const confirmedCritical = criticalClaims.filter((claim) => claim?.verification_status === "confirmed");

    return {
      updatedAt: formatDate(profile?.updated_at),
      sourcesTotal: sources.length,
      sourcesVerified: sources.filter(isVerifiedSource).length,
      criticalTotal: criticalClaims.length,
      criticalConfirmed: confirmedCritical.length
    };
  }

  function renderSummary(section, summary) {
    const container = section.querySelector(":scope > .container") || section;
    const heading = container.querySelector(":scope > .section__head");
    const block = document.createElement("div");
    const metrics = document.createElement("p");
    const note = document.createElement("p");

    block.className = "notice project-verification-summary";
    block.dataset.verificationSummaryRendered = "true";
    block.setAttribute("role", "status");
    block.setAttribute("aria-label", "Статус проверки сведений об объекте");

    metrics.textContent = `Внутренняя актуализация: ${summary.updatedAt}. Проверено источников: ${summary.sourcesVerified} из ${summary.sourcesTotal}. Подтверждено критических фактов: ${summary.criticalConfirmed} из ${summary.criticalTotal}.`;
    note.textContent = "Точные характеристики не публикуются до принятия первичных источников и завершения юридической проверки.";

    block.append(metrics, note);
    if (heading) {
      heading.insertAdjacentElement("afterend", block);
    } else {
      container.prepend(block);
    }
  }

  function renderUnavailable(section) {
    const container = section.querySelector(":scope > .container") || section;
    const heading = container.querySelector(":scope > .section__head");
    const block = document.createElement("div");

    block.className = "notice project-verification-summary";
    block.dataset.verificationSummaryRendered = "unavailable";
    block.setAttribute("role", "status");
    block.textContent = "Статус проверки временно недоступен. Уточните актуальные сведения перед консультацией.";

    if (heading) {
      heading.insertAdjacentElement("afterend", block);
    } else {
      container.prepend(block);
    }
  }

  sections.forEach(async (section) => {
    const profileUrl = String(section.dataset.verificationProfile || "").trim();
    if (!profileUrl) {
      renderUnavailable(section);
      return;
    }

    try {
      const response = await fetch(new URL(profileUrl, window.location.href), {
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!response.ok) throw new Error(`Verification profile request failed: ${response.status}`);

      const profile = await response.json();
      renderSummary(section, createSummary(profile));
    } catch (error) {
      renderUnavailable(section);
    }
  });
})();