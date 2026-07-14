import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CAMPAIGNS_PATH = path.join(ROOT, "data/marketing/utm-campaigns.json");
const RELEASE_PATH = path.join(ROOT, "data/marketing/campaign-release.json");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : fallback;
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`${label} not found: ${filePath}`);
    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Cannot parse ${label}: ${error.message}`);
    process.exit(1);
  }
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildUrl(baseUrl, campaign) {
  const url = new URL(campaign.landing_path, baseUrl);
  url.searchParams.set("utm_source", campaign.utm_source);
  url.searchParams.set("utm_medium", campaign.utm_medium);
  url.searchParams.set("utm_campaign", campaign.utm_campaign);
  url.searchParams.set("utm_content", campaign.utm_content);
  return url.toString();
}

function toRow(release, campaign) {
  const url = buildUrl(release.base_url, campaign);
  return {
    release_id: release.release_id,
    release_status: release.status,
    campaign_id: campaign.id,
    channel: campaign.utm_source,
    medium: campaign.utm_medium,
    object_id: campaign.object_id,
    landing_path: campaign.landing_path,
    expected_form_id: campaign.expected_form_id,
    expected_lead_type: campaign.expected_lead_type,
    entry_point: "primary_short_form",
    url,
    qr_payload: campaign.utm_medium === "qr" ? url : "",
    goal: campaign.goal,
    sales_note: campaign.sales_note,
    publication_status: release.publication?.links_published ? "published" : "prepared_not_published"
  };
}

function renderMarkdown(rows) {
  const lines = [
    `# Пакет рекламных ссылок ${rows[0]?.release_id || ""}`,
    "",
    "| Кампания | Канал | Объект | Целевая форма | Статус | Готовая ссылка |",
    "|---|---|---|---|---|---|"
  ];

  rows.forEach((row) => {
    lines.push(`| ${row.campaign_id} | ${row.channel} / ${row.medium} | ${row.object_id} | ${row.expected_form_id} | ${row.publication_status} | ${row.url} |`);
  });

  return lines.join("\n");
}

function renderCsv(rows) {
  const fields = [
    "release_id",
    "release_status",
    "campaign_id",
    "channel",
    "medium",
    "object_id",
    "landing_path",
    "expected_form_id",
    "expected_lead_type",
    "entry_point",
    "url",
    "qr_payload",
    "goal",
    "sales_note",
    "publication_status"
  ];

  return [
    fields.map(csvCell).join(","),
    ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

const campaignsRegistry = readJson(CAMPAIGNS_PATH, "UTM campaigns registry");
const release = readJson(RELEASE_PATH, "campaign release manifest");
const campaigns = Array.isArray(campaignsRegistry.campaigns) ? campaignsRegistry.campaigns : [];
const campaignMap = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
const releaseIds = Array.isArray(release.campaign_ids) ? release.campaign_ids : [];

const missing = releaseIds.filter((id) => !campaignMap.has(id));
if (missing.length) {
  console.error(`Release references unknown campaigns: ${missing.join(", ")}`);
  process.exit(1);
}

const format = getArg("format", "markdown").toLowerCase();
const channel = getArg("channel", "all").toLowerCase();
const objectId = getArg("object", "all").toLowerCase();
const supportedFormats = new Set(["markdown", "json", "csv"]);

if (!supportedFormats.has(format)) {
  console.error(`Unsupported format: ${format}. Use markdown, json or csv.`);
  process.exit(1);
}

let rows = releaseIds.map((id) => toRow(release, campaignMap.get(id)));
if (channel !== "all") rows = rows.filter((row) => row.channel.toLowerCase() === channel);
if (objectId !== "all") rows = rows.filter((row) => row.object_id.toLowerCase() === objectId);

if (!rows.length) {
  console.error(`No release links found for channel=${channel}, object=${objectId}`);
  process.exit(1);
}

const output = format === "json"
  ? JSON.stringify({
      release_id: release.release_id,
      release_status: release.status,
      base_url: release.base_url,
      publication: release.publication,
      links: rows
    }, null, 2)
  : format === "csv"
    ? renderCsv(rows)
    : renderMarkdown(rows);

process.stdout.write(`${output}\n`);
