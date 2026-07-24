import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILES = {
  runtime: "supabase/functions/newbuild-lead/index.ts",
  operationsMigration: "supabase/migrations/20260724060538_newbuild_lead_operations_v2.sql",
  locatorMigration: "supabase/migrations/20260724060700_newbuild_lead_record_locator_trigger.sql",
  approval: "data/operations/lead-operations-approval.json",
  lifecycle: "data/operations/lead-lifecycle.json",
  handoff: "data/operations/lead-handoff.json",
  eventLog: "data/operations/lead-event-log.json"
};
const errors = [];

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`${relativePath}: file does not exist`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const source = read(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON: ${error.message}`);
    return null;
  }
}

function requireFragments(source, sourcePath, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) errors.push(`${sourcePath}: missing ${fragment}`);
  }
}

const runtime = read(FILES.runtime);
const operationsMigration = read(FILES.operationsMigration);
const locatorMigration = read(FILES.locatorMigration);
const approval = readJson(FILES.approval);
const lifecycle = readJson(FILES.lifecycle);
const handoff = readJson(FILES.handoff);
const eventLog = readJson(FILES.eventLog);

if (!runtime || !operationsMigration || !locatorMigration || !approval || !lifecycle || !handoff || !eventLog) {
  process.exit(1);
}

requireFragments(runtime, FILES.runtime, [
  '"Access-Control-Allow-Methods": "GET, POST, OPTIONS"',
  'request.method === "GET" && url.searchParams.get("health") === "1"',
  'restFetch("rpc/newbuild_lead_health"',
  'restFetch("rpc/newbuild_lead_transition"',
  'p_to_state: "triage_ready"',
  'p_next_action: "assign_owner"',
  'lead_class: leadClass',
  'operational_status: "received"',
  'source_check_required: sourceCheckRequired',
  'next_action: "complete_triage"',
  'source_system: "supabase:newbuild_leads"',
  'operations_version: "2.0"',
  '"X-Robots-Tag": "noindex, nofollow"'
]);

if (runtime.includes("SUPABASE_SERVICE_ROLE_KEY") && runtime.includes("window.")) {
  errors.push(`${FILES.runtime}: service role key must never be exposed to browser code`);
}

requireFragments(operationsMigration.toLowerCase(), FILES.operationsMigration, [
  "add column if not exists operational_status",
  "add column if not exists lead_owner_ref",
  "add column if not exists first_action_due_at",
  "add column if not exists contact_outcome",
  "add column if not exists next_action",
  "add column if not exists source_system",
  "add column if not exists record_locator",
  "create table if not exists public.newbuild_lead_operational_policies",
  "alter table public.newbuild_lead_operational_policies enable row level security",
  "alter table public.newbuild_lead_operational_policies force row level security",
  "revoke all on table public.newbuild_lead_operational_policies from anon, authenticated",
  "create or replace function public.newbuild_lead_transition",
  "security invoker",
  "create or replace function public.newbuild_lead_health",
  "create trigger trg_newbuild_lead_events_append_only",
  "before update or delete on public.newbuild_lead_events",
  "with (security_invoker = true)",
  "revoke update, delete, truncate on public.newbuild_lead_events from service_role"
]);

requireFragments(locatorMigration.toLowerCase(), FILES.locatorMigration, [
  "create or replace function public.newbuild_set_lead_record_locator",
  "new.record_locator = coalesce",
  "new.id::text",
  "before insert on public.newbuild_leads",
  "security invoker"
]);

for (const source of [operationsMigration, locatorMigration]) {
  if (/security\s+definer/i.test(source)) errors.push("Newbuild operations migrations must not use SECURITY DEFINER");
  if (/grant\s+.*\s+to\s+(anon|authenticated)/i.test(source)) {
    errors.push("Newbuild operations migrations must not grant access to anon or authenticated");
  }
}

const systemDecision = approval.decisions?.find((item) => item.id === "system_of_record");
if (systemDecision?.status !== "approved" || systemDecision?.approved_value !== "supabase:newbuild_leads") {
  errors.push(`${FILES.approval}: system_of_record must be approved as supabase:newbuild_leads`);
}
if (approval.rules?.operational_activation_enabled !== false) {
  errors.push(`${FILES.approval}: operational activation must remain disabled`);
}
if (approval.rules?.automatic_owner_assignment_enabled !== false) {
  errors.push(`${FILES.approval}: automatic owner assignment must remain disabled`);
}
if (approval.rules?.automatic_triage_enabled !== true) {
  errors.push(`${FILES.approval}: automatic triage must be enabled`);
}

if (lifecycle.status !== "server_connected_owner_activation_pending" || lifecycle.rules?.automatic_triage_only !== true) {
  errors.push(`${FILES.lifecycle}: expected connected triage-only lifecycle`);
}
if (handoff.status !== "server_storage_connected_owner_assignment_pending" || handoff.rules?.server_storage_connected !== true) {
  errors.push(`${FILES.handoff}: expected connected protected storage`);
}
if (eventLog.status !== "server_append_only_connected" || eventLog.rules?.database_append_only_trigger_enabled !== true) {
  errors.push(`${FILES.eventLog}: expected connected append-only event log`);
}

console.log("Checked lead operations schema version: 2.0");
console.log("Checked protected system of record: supabase:newbuild_leads");
console.log("Checked server transition API and public-safe health route");
console.log("Checked automatic triage with owner/SLA activation still blocked");

if (errors.length) {
  console.error("\nLead operations runtime validation errors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Lead operations runtime validation passed.");