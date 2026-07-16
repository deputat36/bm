import fs from "node:fs";

const pages = [
  {
    path: "catalog/prostornaya-4a/index.html",
    interest: "Документы по объекту",
    label: "Проверить документы",
    placement: "project_documents_check",
    objectId: "prostornaya-4a",
    note: "Перед консультацией и тем более перед сделкой сведения сверяются по первичным источникам на текущую дату."
  },
  {
    path: "catalog/aerodromnaya-18g/index.html",
    interest: "Схема покупки и договор",
    label: "Проверить схему покупки",
    placement: "project_purchase_scheme",
    objectId: "aerodromnaya-18g",
    note: "Эти сведения появятся в карточке только после фиксации первичного источника и даты проверки.",
    addOptionAfter: "Документы и застройщик"
  },
  {
    path: "catalog/sennaya-76/index.html",
    interest: "Проверка конкретной квартиры",
    label: "Проверить конкретную квартиру",
    placement: "project_apartment_check",
    objectId: "sennaya-76",
    note: "Эти сведения появятся в карточке только после фиксации первичного источника и даты проверки.",
    addOptionAfter: "Документы и застройщик"
  }
];

const runtimeTag = '<script src="../../assets/js/project-intent-prefill.js"></script>';
const summaryTag = '<script src="../../assets/js/project-verification-summary.js"></script>';

for (const page of pages) {
  let html = fs.readFileSync(page.path, "utf8");

  if (page.addOptionAfter && !html.includes(`<option>${page.interest}</option>`)) {
    const anchor = `<option>${page.addOptionAfter}</option>`;
    const occurrences = html.split(anchor).length - 1;
    if (occurrences !== 2) {
      throw new Error(`${page.path}: expected two option anchors, found ${occurrences}`);
    }
    html = html.split(anchor).join(`${anchor}<option>${page.interest}</option>`);
  }

  const cta = `<div class="hero__actions"><a class="button" href="#quick-lead" data-prefill-interest="${page.interest}" data-track-action="intent_prefill" data-track-placement="${page.placement}" data-track-object="${page.objectId}">${page.label}</a></div>`;
  if (!html.includes(`data-track-placement="${page.placement}"`)) {
    const noteFragment = `<p class="project-status-note">${page.note}</p></article>`;
    if (!html.includes(noteFragment)) {
      throw new Error(`${page.path}: pending status note not found`);
    }
    html = html.replace(noteFragment, `<p class="project-status-note">${page.note}</p>${cta}</article>`);
  }

  if (!html.includes(runtimeTag)) {
    if (!html.includes(summaryTag)) {
      throw new Error(`${page.path}: verification summary runtime tag not found`);
    }
    html = html.replace(summaryTag, `${runtimeTag}\n  ${summaryTag}`);
  }

  if (!html.includes(`data-prefill-interest="${page.interest}"`)) {
    throw new Error(`${page.path}: intent CTA was not connected`);
  }

  fs.writeFileSync(page.path, html, "utf8");
}

console.log(`Project intent CTAs connected: ${pages.length}`);