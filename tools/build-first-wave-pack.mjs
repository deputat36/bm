import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const PLAN_PATH = path.join(ROOT, "data/marketing/first-wave.json");
const CAMPAIGNS_PATH = path.join(ROOT, "data/marketing/utm-campaigns.json");
const READINESS_SCRIPT = path.join(ROOT, "tools/build-launch-readiness-report.mjs");

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

function buildUrl(campaign, placement) {
  const url = new URL(campaign.landing_path, "https://novostroyki-borisoglebsk.ru");
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) url.searchParams.set(key, campaign[key]);
  url.searchParams.set("placement", placement);
  return url.toString();
}

const plan = readJson(PLAN_PATH);
const campaignsRegistry = readJson(CAMPAIGNS_PATH);
const campaigns = new Map((campaignsRegistry.campaigns || []).map((item) => [item.id, item]));
let readiness;
try {
  readiness = JSON.parse(execFileSync(process.execPath, [READINESS_SCRIPT, "--format=json"], { cwd: ROOT, encoding: "utf8" }));
} catch (error) {
  console.error(`Cannot build launch readiness: ${error.message}`);
  process.exit(1);
}
const profile = (readiness.profiles || []).find((item) => item.id === "campaign_launch");
const gateMap = new Map((readiness.gates || []).map((item) => [item.id, item]));

const rows = (plan.placements || []).map((item) => {
  const campaign = campaigns.get(item.campaign_id);
  return {
    id: item.id,
    status: item.status,
    offer_variant: item.offer_variant,
    target_class: item.target_class,
    campaign_id: item.campaign_id,
    placement: item.placement,
    object_id: campaign?.object_id || "",
    landing_path: campaign?.landing_path || "",
    expected_form_id: campaign?.expected_form_id || "",
    expected_lead_type: campaign?.expected_lead_type || "",
    url: campaign ? buildUrl(campaign, item.placement) : "",
    external_target_url: item.external_target_url,
    owner_ref: item.owner_ref,
    planned_publish_at: item.planned_publish_at,
    planned_cost_rub: item.planned_cost_rub
  };
});

const gates = (profile?.required_gates || []).map((id) => {
  const gate = gateMap.get(id);
  return {
    id,
    status: gate?.status || "missing",
    details: gate?.details || ""
  };
});

const summary = {
  status: plan.status,
  placements: rows.length,
  offer_variants: (plan.offer_variants || []).length,
  unique_urls: new Set(rows.map((row) => row.url)).size,
  campaign_launch_ready: profile?.ready === true,
  blocked_gates: profile?.blocked_gates || [],
  prepared_not_approved: rows.filter((row) => row.status === "prepared_not_approved").length,
  approved_to_publish: rows.filter((row) => row.status === "approved_to_publish").length,
  published: rows.filter((row) => row.status === "published").length
};

function renderMarkdown() {
  const lines = [
    "# Первая управляемая волна трафика",
    "",
    `Статус: ${summary.status}`,
    `Placements: ${summary.placements}`,
    `Офферов: ${summary.offer_variants}`,
    `Campaign launch ready: ${summary.campaign_launch_ready ? "да" : "нет"}`,
    "",
    "## Ворота запуска",
    "",
    "| Gate | Статус |",
    "|---|---|"
  ];
  gates.forEach((gate) => lines.push(`| ${gate.id} | ${gate.status} |`));
  lines.push("", "## Подготовленные placements", "", "| Placement | Оффер | Канал | URL | Статус |", "|---|---|---|---|---|");
  rows.forEach((row) => lines.push(`| ${row.placement} | ${row.offer_variant} | ${row.target_class} | ${row.url} | ${row.status} |`));
  lines.push("", "Фактическая публикация запрещена, пока campaign_launch не станет ready и для placement не будут заполнены external target, owner, дата и стоимость.");
  return lines.join("\n");
}

const format = getArg("format", "markdown");
if (!new Set(["markdown", "json"]).has(format)) {
  console.error("Unsupported format. Use markdown or json.");
  process.exit(1);
}

process.stdout.write(`${format === "json" ? JSON.stringify({ summary, gates, placements: rows }, null, 2) : renderMarkdown()}\n`);
