import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const HISTORY_PATH = path.join(ROOT, "data/offers/history-contract.json");

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
const requirements = Array.isArray(contract.store?.activation_requires) ? contract.store.activation_requires : [];
const summary = {
  status: contract.status,
  event_types: Array.isArray(contract.event_types) ? contract.event_types.length : 0,
  required_event_fields: Array.isArray(contract.required_event_fields) ? contract.required_event_fields.length : 0,
  store_connected: contract.rules?.history_store_connected === true,
  writes_enabled: contract.rules?.history_write_enabled === true,
  store_type: contract.store?.type || null,
  retention_days: contract.store?.retention_days ?? null,
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
    `Store подключён: ${summary.store_connected ? "да" : "нет"}`,
    `Writes включены: ${summary.writes_enabled ? "да" : "нет"}`,
    `Append-only: ${summary.append_only ? "да" : "нет"}`,
    `Hash chain: ${summary.hash_chain_required ? "обязателен" : "нет"}`,
    `Retention: ${summary.retention_days === null ? "не определён до подключения store" : `${summary.retention_days} дней`}`,
    "",
    "## События",
    ""
  ];
  (contract.event_types || []).forEach((event) => lines.push(`- ${event}`));
  lines.push("", "## Условия активации", "");
  requirements.forEach((item) => lines.push(`- ${item}`));
  lines.push("", "До выполнения этих условий история не записывается и не доступна браузеру.");
  return lines.join("\n");
}

const format = getArg("format", "markdown");
if (!new Set(["markdown", "json"]).has(format)) {
  console.error("Unsupported format. Use markdown or json.");
  process.exit(1);
}

process.stdout.write(`${format === "json" ? JSON.stringify({ summary, contract }, null, 2) : renderMarkdown()}\n`);
