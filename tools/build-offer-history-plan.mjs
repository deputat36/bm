import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HISTORY_PATH = path.join(ROOT, "data/offers/history-contract.json");
const STORAGE_PATH = path.join(ROOT, "data/offers/history-storage.json");
const OFFER_PATH = path.join(ROOT, "data/offers/contract.json");
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

const contract = readJson(HISTORY_PATH);
const storage = readJson(STORAGE_PATH);
const offer = readJson(OFFER_PATH);
const feed = readJson(FEED_PATH);
const requirements = Array.isArray(contract.store?.activation_requires) ? contract.store.activation_requires : [];
const completion = storage.completion_state || {};

const summary = {
  status: contract.status,
  event_types: Array.isArray(contract.event_types) ? contract.event_types.length : 0,
  required_event_fields: Array.isArray(contract.required_event_fields) ? contract.required_event_fields.length : 0,
  store_selected: completion.store_selected === true,
  store_type: contract.store?.type || null,
  storage_connected: contract.rules?.history_store_connected === true,
  store_connected: contract.rules?.history_store_connected === true,
  history_write_enabled: contract.rules?.history_write_enabled === true,
  writes_enabled: contract.rules?.history_write_enabled === true,
  public_history_api_enabled: contract.rules?.public_history_api_enabled === true,
  retention_days: contract.store?.retention_days ?? null,
  retention_policy_selected: completion.retention_policy_selected === true,
  backup_export_policy_selected: completion.backup_export_policy_selected === true,
  hash_chain_writer_available: completion.hash_chain_writer_available === true,
  current_feed_connected: offer.rules?.live_source_connected === true,
  current_feed_public: offer.rules?.public_render_enabled === true,
  current_offer_count: Array.isArray(feed.offers) ? feed.offers.length : -1,
  activation_requirements: requirements.length,
  append_only: contract.rules?.append_only === true,
  hash_chain_required: contract.rules?.hash_chain_required === true
};

function renderMarkdown() {
  const lines = [
    "# План хранилища истории offer feed",
    "",
    `Статус: ${summary.status}`,
    `Типов событий: ${summary.event_types}`,
    `Обязательных полей события: ${summary.required_event_fields}`,
    `Store design выбран: ${summary.store_selected ? "да" : "нет"}`,
    `Store type: ${summary.store_type || "не выбран"}`,
    `Store подключён: ${summary.storage_connected ? "да" : "нет"}`,
    `Writes включены: ${summary.history_write_enabled ? "да" : "нет"}`,
    `Public history API: ${summary.public_history_api_enabled ? "включён" : "выключен"}`,
    `Append-only: ${summary.append_only ? "да" : "нет"}`,
    `Hash chain: ${summary.hash_chain_required ? "обязателен" : "нет"}`,
    `Hash-chain writer: ${summary.hash_chain_writer_available ? "готов" : "не реализован"}`,
    `Retention: ${summary.retention_days === null ? "не определён" : `${summary.retention_days} дней`}`,
    `Backup/export policy: ${summary.backup_export_policy_selected ? "выбрана" : "не выбрана"}`,
    `Current live feed: ${summary.current_feed_connected ? "подключён" : "не подключён"}; public=${summary.current_feed_public ? "да" : "нет"}; rows=${summary.current_offer_count}`,
    "",
    "## События",
    ""
  ];
  (contract.event_types || []).forEach((event) => lines.push(`- ${event}`));
  lines.push("", "## Условия активации", "");
  requirements.forEach((item) => lines.push(`- ${item}`));
  lines.push("", "Выбор store design не является deployment: до выполнения остальных условий история не записывается и не доступна браузеру.");
  return lines.join("\n");
}

const format = getArg("format", "markdown");
if (!new Set(["markdown", "json"]).has(format)) {
  console.error("Unsupported format. Use markdown or json.");
  process.exit(1);
}

process.stdout.write(`${format === "json" ? JSON.stringify({ summary, contract, storage }, null, 2) : renderMarkdown()}\n`);
