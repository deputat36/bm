import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const js = fs.readFileSync("assets/js/buyer-project-content.js", "utf8");
const paths = ["prostornaya-4a", "aerodromnaya-18g", "sennaya-76"];
const baseline = Object.fromEntries(paths.map((id) => [
  id, JSON.parse(fs.readFileSync(`data/verification/${id}.json`, "utf8"))
]));

function createCard(name) {
  const nodes = new Map();
  const list = {
    textContent: "",
    items: [],
    replaceChildren(...items) { this.items = items; }
  };
  nodes.set("h3", { textContent: name });
  nodes.set("p", { textContent: "Данные уточняются" });
  nodes.set(".eyebrow", { textContent: "Данные уточняются" });
  nodes.set("ul.list", list);
  const card = {
    dataset: {},
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, { textContent: "" });
      return nodes.get(selector);
    }
  };
  return { card, get text() {
    return [...nodes.values()].map((node) =>
      "items" in node ? node.items.map((item) => item.textContent).join(" · ") : node.textContent
    ).join(" ");
  } };
}

async function render(profiles) {
  const cards = [
    createCard("Просторная 4А"),
    createCard("Аэродромная 18Г"),
    createCard("Сенная 76")
  ];
  const calls = [];
  const fetch = async (url) => {
    const match = paths.find((id) => String(url).endsWith(`/data/verification/${id}.json`));
    assert.ok(match, `unexpected profile URL: ${url}`);
    calls.push(match);
    return { ok: true, json: async () => profiles[match] };
  };
  const document = {
    currentScript: { src: "https://novostroyki-borisoglebsk.ru/assets/js/buyer-project-content.js" },
    querySelectorAll(selector) {
      if (selector === "#objects article.card") return cards.map((item) => item.card);
      return [];
    },
    createElement(tag) {
      assert.equal(tag, "li");
      return { textContent: "" };
    }
  };
  const window = { fetch };
  vm.runInNewContext(js, { document, window, fetch, URL, Set, Map, Promise, Intl, Number, String, Array, JSON });
  for (let i = 0; i < 4; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual([...calls].sort(), [...paths].sort(), "profiles must all be checked");
  assert.equal(window.__NEWBUILD_BUYER_PROJECT_CONTENT__, true);
  return cards;
}

const full = await render(structuredClone(baseline));
assert.match(full[0].text, /2 дома/);
assert.match(full[0].text, /194 квартир/);
assert.match(full[0].text, /2,7 м/);
assert.match(full[0].text, /25 м²/);
assert.match(full[0].text, /92 м²/);
assert.doesNotMatch(full[0].text, /семейная ипотека/i, "do not infer a bank product from generic mortgage");
assert.match(full[1].text, /этажность 3–7/);
assert.match(full[1].text, /черновая отделка/);
assert.match(full[2].text, /керамической черепицы/);
assert.match(full[2].text, /система «умный дом»/);

const partial = structuredClone(baseline);
const restricted = {
  "prostornaya-4a": [
    "buildings_total", "ceiling_height", "studio_area_from_m2", "four_room_area_to_m2",
    "closed_yard", "house_boiler", "finish_type", "purchase_methods", "class"
  ],
  "aerodromnaya-18g": ["floor_range_statement", "ceiling_height_statement", "finish_statement"],
  "sennaya-76": [
    "roof_material_statement", "individual_heating_statement",
    "smart_home_statement", "energy_efficient_lighting_statement", "video_surveillance_statement"
  ]
};
for (const id of paths) {
  for (const claim of partial[id].claims) {
    if (restricted[id].includes(claim.field)) {
      claim.publication_allowed = false;
      claim.value = "WITHHELD_SENTINEL";
    }
  }
}
const redacted = await render(partial);
assert.match(redacted[0].text, /194 квартир/);
for (const value of [/2 дома/, /2,7 м/, /25 м²/, /92 м²/, /Закрытый двор/, /котельн/i, /предчистовая/i, /ипотека/i]) {
  assert.doesNotMatch(redacted[0].text, value, "Telermanov revoked claim leaked");
}
for (const value of [/3–7/, /2,7/, /черновая/i]) {
  assert.doesNotMatch(redacted[1].text, value, "Aerodromnaya revoked claim leaked");
}
for (const value of [/керамической/i, /отоплени/i, /умный дом/i, /видеонаблюдени/i]) {
  assert.doesNotMatch(redacted[2].text, value, "Sennaya revoked claim leaked");
}
for (const card of redacted) assert.doesNotMatch(card.text, /WITHHELD_SENTINEL/);

const revoked = structuredClone(baseline);
for (const id of paths) {
  for (const claim of revoked[id].claims) {
    claim.publication_allowed = false;
    claim.value = "WITHHELD_SENTINEL";
  }
}
const empty = await render(revoked);
for (const card of empty) {
  assert.match(card.text, /Данные уточняются/, "fallback must remain cautious");
  assert.equal(card.card.dataset.buyerContent, undefined, "revoked project cannot get confirmed badge");
  assert.doesNotMatch(card.text, /WITHHELD_SENTINEL|194 квартир|3–7|черепицы/);
}

const updated = structuredClone(baseline);
updated["prostornaya-4a"].claims.find((claim) => claim.field === "buildings_total").value = 3;
updated["prostornaya-4a"].claims.find((claim) => claim.field === "complex_apartments_total").value = 211;
const changed = await render(updated);
assert.match(changed[0].text, /3 дома/);
assert.match(changed[0].text, /211 квартир/);
assert.doesNotMatch(changed[0].text, /2 дома|194 квартир/);

console.log("Homepage source-bound facts passed: full, partial revoked, all revoked, changed primary values; no lead requests.");
