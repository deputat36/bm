import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = path.join(ROOT, "data/offers/contract.json");
const FEED_PATH = path.join(ROOT, "data/offers/feed.json");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim().toLowerCase() : fallback;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Cannot read ${path.relative(ROOT, filePath)}: ${error.message}`);
    process.exit(1);
  }
}

function ageHours(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return Math.max(0, (Date.now() - Date.parse(value)) / 3600000);
}

function round(value) {
  return value === null ? null : Math.round(value * 10) / 10;
}

const contract = readJson(CONTRACT_PATH);
const feed = readJson(FEED_PATH);
const offers = Array.isArray(feed.offers) ? feed.offers : [];
const priceWindow = Number(contract.freshness_policy?.price_max_age_hours || 0);
const availabilityWindow = Number(contract.freshness_policy?.availability_max_age_hours || 0);

const rows = offers.map((offer) => {
  const priceAge = ageHours(offer.price_checked_at);
  const availabilityAge = ageHours(offer.availability_checked_at);
  return {
    object_id: offer.object_id,
    section_or_entrance: offer.section_or_entrance,
    apartment_number_public: offer.apartment_number_public,
    rooms: offer.rooms,
    area_m2: offer.area_m2,
    floor: offer.floor,
    price: offer.price,
    availability_status: offer.availability_status,
    seller_type: offer.seller_type,
    contract_type: offer.contract_type,
    mortgage_status: offer.mortgage_status,
    source_id: offer.source_id,
    publication_allowed: offer.publication_allowed === true,
    price_age_hours: round(priceAge),
    availability_age_hours: round(availabilityAge),
    price_fresh: priceAge !== null && priceAge <= priceWindow,
    availability_fresh: availabilityAge !== null && availabilityAge <= availabilityWindow
  };
});

const summary = {
  total_offers: rows.length,
  publication_allowed_rows: rows.filter((row) => row.publication_allowed).length,
  globally_public: contract.rules?.public_render_enabled === true,
  live_source_connected: contract.rules?.live_source_connected === true,
  available_rows: rows.filter((row) => row.availability_status === "available").length,
  stale_price_rows: rows.filter((row) => row.price_age_hours !== null && !row.price_fresh).length,
  stale_availability_rows: rows.filter((row) => row.availability_age_hours !== null && !row.availability_fresh).length,
  missing_price_timestamp_rows: offers.filter((row) => !row.price_checked_at).length,
  missing_availability_timestamp_rows: offers.filter((row) => !row.availability_checked_at).length
};

function renderMarkdown() {
  const lines = [
    "# Внутренний preview offer feed",
    "",
    "Этот отчёт не является публичной витриной и не подтверждает наличие, цену или право продажи без прохождения всех publication gates.",
    "",
    `Всего нормализованных строк: ${summary.total_offers}`,
    `Строк с publication_allowed=true: ${summary.publication_allowed_rows}`,
    `Live source подключён: ${summary.live_source_connected ? "да" : "нет"}`,
    `Публичный renderer включён: ${summary.globally_public ? "да" : "нет"}`,
    `Устаревшие цены: ${summary.stale_price_rows}`,
    `Устаревшее наличие: ${summary.stale_availability_rows}`,
    ""
  ];

  if (!rows.length) {
    lines.push("Feed пуст. Это ожидаемое fail-closed состояние до подключения управляемого источника.");
    return lines.join("\n");
  }

  lines.push(
    "| Объект | Секция | № | Комнат | Площадь | Этаж | Цена | Наличие | Цена свежая | Наличие свежее | Публикация |",
    "|---|---|---|---:|---:|---:|---:|---|---|---|---|"
  );
  rows.forEach((row) => {
    lines.push(`| ${row.object_id} | ${row.section_or_entrance} | ${row.apartment_number_public} | ${row.rooms} | ${row.area_m2} | ${row.floor} | ${row.price ?? "—"} | ${row.availability_status} | ${row.price_fresh ? "да" : "нет"} | ${row.availability_fresh ? "да" : "нет"} | ${row.publication_allowed ? "разрешена строкой" : "нет"} |`);
  });
  return lines.join("\n");
}

const format = getArg("format", "markdown");
if (!new Set(["markdown", "json"]).has(format)) {
  console.error("Unsupported format. Use markdown or json.");
  process.exit(1);
}

const output = format === "json"
  ? JSON.stringify({
      schema_version: contract.schema_version,
      status: feed.status,
      generated_at: feed.generated_at,
      summary,
      offers: rows
    }, null, 2)
  : renderMarkdown();

process.stdout.write(`${output}\n`);
