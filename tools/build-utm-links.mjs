import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "data/marketing/utm-campaigns.json");
const BASE_URL = "https://novostroyki-borisoglebsk.ru";

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : fallback;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildUrl(campaign) {
  const url = new URL(campaign.landing_path, BASE_URL);
  url.searchParams.set("utm_source", campaign.utm_source);
  url.searchParams.set("utm_medium", campaign.utm_medium);
  url.searchParams.set("utm_campaign", campaign.utm_campaign);
  url.searchParams.set("utm_content", campaign.utm_content);
  return url.toString();
}

function toRow(campaign) {
  return {
    id: campaign.id,
    status: campaign.status,
    object_id: campaign.object_id,
    landing_path: campaign.landing_path,
    expected_form_id: campaign.expected_form_id,
    expected_lead_type: campaign.expected_lead_type,
    entry_point: "primary_short_form",
    url: buildUrl(campaign),
    goal: campaign.goal,
    sales_note: campaign.sales_note
  };
}

function renderJson(rows) {
  return JSON.stringify(rows, null, 2);
}

function renderCsv(rows) {
  const fields = [
    "id",
    "status",
    "object_id",
    "landing_path",
    "expected_form_id",
    "expected_lead_type",
    "entry_point",
    "url",
    "goal",
    "sales_note"
  ];

  return [
    fields.map(csvCell).join(","),
    ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

function renderMarkdown(rows) {
  const lines = [
    "| ID | Объект | Канал | Посадочная страница | Целевая форма | Готовая ссылка | Цель |",
    "|---|---|---|---|---|---|---|"
  ];

  for (const row of rows) {
    const channel = `${new URL(row.url).searchParams.get("utm_source")} / ${new URL(row.url).searchParams.get("utm_medium")}`;
    lines.push(`| ${row.id} | ${row.object_id} | ${channel} | ${row.landing_path} | ${row.expected_form_id} | ${row.url} | ${row.goal} |`);
  }

  return lines.join("\n");
}

if (!fs.existsSync(REGISTRY_PATH)) {
  console.error(`UTM registry not found: ${REGISTRY_PATH}`);
  process.exit(1);
}

let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
} catch (error) {
  console.error(`Cannot parse UTM registry: ${error.message}`);
  process.exit(1);
}

const format = getArg("format", "markdown").toLowerCase();
const status = getArg("status", "active").toLowerCase();
const supportedFormats = new Set(["markdown", "csv", "json"]);

if (!supportedFormats.has(format)) {
  console.error(`Unsupported format: ${format}. Use markdown, csv or json.`);
  process.exit(1);
}

const campaigns = Array.isArray(registry.campaigns) ? registry.campaigns : [];
const filtered = status === "all"
  ? campaigns
  : campaigns.filter((campaign) => String(campaign.status || "").toLowerCase() === status);
const rows = filtered.map(toRow);

if (!rows.length) {
  console.error(`No UTM campaigns found for status=${status}`);
  process.exit(1);
}

const output = format === "json"
  ? renderJson(rows)
  : format === "csv"
    ? renderCsv(rows)
    : renderMarkdown(rows);

process.stdout.write(`${output}\n`);
