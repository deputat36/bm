import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CAMPAIGNS_PATH = path.join(ROOT, "data/marketing/utm-campaigns.json");
const RELEASE_PATH = path.join(ROOT, "data/marketing/campaign-release.json");
const PUBLICATIONS_PATH = path.join(ROOT, "data/marketing/campaign-publications.json");

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

function buildPreparedUrl(baseUrl, campaign) {
  const url = new URL(campaign.landing_path, baseUrl);
  url.searchParams.set("utm_source", campaign.utm_source);
  url.searchParams.set("utm_medium", campaign.utm_medium);
  url.searchParams.set("utm_campaign", campaign.utm_campaign);
  url.searchParams.set("utm_content", campaign.utm_content);
  return url.toString();
}

function latestPublication(records) {
  if (!records.length) return null;
  return [...records].sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))[0];
}

const registry = readJson(CAMPAIGNS_PATH, "UTM campaigns registry");
const release = readJson(RELEASE_PATH, "campaign release manifest");
const tracker = readJson(PUBLICATIONS_PATH, "campaign publications tracker");
const campaigns = Array.isArray(registry.campaigns) ? registry.campaigns : [];
const campaignMap = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
const releaseIds = Array.isArray(release.campaign_ids) ? release.campaign_ids : [];
const publications = Array.isArray(tracker.publications) ? tracker.publications : [];

const rows = releaseIds.map((campaignId) => {
  const campaign = campaignMap.get(campaignId);
  const records = publications.filter((publication) => publication.campaign_id === campaignId);
  const latest = latestPublication(records);
  return {
    campaign_id: campaignId,
    channel: campaign?.utm_source || "",
    medium: campaign?.utm_medium || "",
    object_id: campaign?.object_id || "",
    expected_form_id: campaign?.expected_form_id || "",
    prepared_url: campaign ? buildPreparedUrl(release.base_url, campaign) : "",
    publication_status: latest?.status || "not_published",
    publication_count: records.length,
    latest_published_at: latest?.published_at || "",
    latest_external_url: latest?.external_url || "",
    latest_owner: latest?.owner || "",
    latest_evidence: latest?.evidence || ""
  };
});

const summary = {
  release_id: release.release_id,
  total_campaigns: rows.length,
  total_publications: publications.length,
  campaigns_with_publications: rows.filter((row) => row.publication_count > 0).length,
  campaigns_not_published: rows.filter((row) => row.publication_count === 0).length,
  by_status: rows.reduce((acc, row) => {
    acc[row.publication_status] = (acc[row.publication_status] || 0) + 1;
    return acc;
  }, {}),
  by_channel: rows.reduce((acc, row) => {
    acc[row.channel] = (acc[row.channel] || 0) + 1;
    return acc;
  }, {})
};

const format = getArg("format", "markdown").toLowerCase();
const channel = getArg("channel", "all").toLowerCase();
const status = getArg("status", "all").toLowerCase();
const supportedFormats = new Set(["markdown", "json", "csv"]);

if (!supportedFormats.has(format)) {
  console.error(`Unsupported format: ${format}. Use markdown, json or csv.`);
  process.exit(1);
}

let filteredRows = rows;
if (channel !== "all") filteredRows = filteredRows.filter((row) => row.channel.toLowerCase() === channel);
if (status !== "all") filteredRows = filteredRows.filter((row) => row.publication_status.toLowerCase() === status);

if (!filteredRows.length) {
  console.error(`No campaign publication rows found for channel=${channel}, status=${status}`);
  process.exit(1);
}

function renderMarkdown() {
  const lines = [
    "# Отчёт по рекламным размещениям",
    "",
    `Release: ${summary.release_id}`,
    "",
    `Кампаний: ${summary.total_campaigns}`,
    `Фактических размещений: ${summary.total_publications}`,
    `Кампаний с размещениями: ${summary.campaigns_with_publications}`,
    `Не опубликовано: ${summary.campaigns_not_published}`,
    "",
    "| Кампания | Канал | Объект | Статус | Размещений | Внешняя публикация |",
    "|---|---|---|---|---:|---|"
  ];
  filteredRows.forEach((row) => {
    lines.push(`| ${row.campaign_id} | ${row.channel} / ${row.medium} | ${row.object_id} | ${row.publication_status} | ${row.publication_count} | ${row.latest_external_url || "—"} |`);
  });
  return lines.join("\n");
}

function renderCsv() {
  const fields = [
    "campaign_id",
    "channel",
    "medium",
    "object_id",
    "expected_form_id",
    "prepared_url",
    "publication_status",
    "publication_count",
    "latest_published_at",
    "latest_external_url",
    "latest_owner",
    "latest_evidence"
  ];
  return [
    fields.map(csvCell).join(","),
    ...filteredRows.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

const output = format === "json"
  ? JSON.stringify({ summary, campaigns: filteredRows, publications }, null, 2)
  : format === "csv"
    ? renderCsv()
    : renderMarkdown();

process.stdout.write(`${output}\n`);
