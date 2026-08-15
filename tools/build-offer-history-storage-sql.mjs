import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STORAGE_PATH = "data/offers/history-storage.json";
const HISTORY_PATH = "data/offers/history-contract.json";
const OFFER_PATH = "data/offers/contract.json";

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const storage = readJson(STORAGE_PATH);
const history = readJson(HISTORY_PATH);
const offer = readJson(OFFER_PATH);

if (storage.deployment?.sql_preview_only !== true
  || storage.deployment?.migration_file_created !== false
  || storage.deployment?.production_ddl_applied !== false
  || storage.deployment?.history_writer_deployed !== false
  || storage.deployment?.history_write_enabled !== false) {
  throw new Error("Offer history storage SQL can only be generated from design-only state");
}

const table = `${storage.store.schema}.${storage.store.table}`;
const appendFunction = "public.newbuild_offer_history_events_append_only";
const eventTypes = Array.isArray(history.event_types) ? history.event_types : [];
const statuses = Array.isArray(offer.allowed_values?.availability_status) ? offer.allowed_values.availability_status : [];

if (eventTypes.length !== 2 || !eventTypes.includes("price_observed") || !eventTypes.includes("availability_observed")) {
  throw new Error("Canonical offer history event types are invalid");
}
if (!statuses.length) throw new Error("Availability enum is missing from offer contract");

const sql = `-- PREVIEW ONLY - NOT DEPLOYED
-- Review-only table/append-only preview. No hash-chain writer is included.
-- Do not execute or copy into supabase/migrations until live source, retention,
-- backup/export and hash-chain writer policies are explicitly reviewed.

create table if not exists ${table} (
  event_id uuid primary key default gen_random_uuid(),
  offer_identity text not null,
  object_id text not null,
  section_or_entrance text not null,
  apartment_number_public text not null,
  event_type text not null,
  observed_at timestamptz not null,
  price numeric(14,2),
  availability_status text,
  source_id text not null,
  source_checked_at timestamptz not null,
  previous_event_hash text,
  event_hash text not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint newbuild_offer_history_event_type_check
    check (event_type in (${eventTypes.map(quote).join(", ")})),
  constraint newbuild_offer_history_availability_check
    check (availability_status is null or availability_status in (${statuses.map(quote).join(", ")})),
  constraint newbuild_offer_history_value_shape_check
    check (
      (event_type = 'price_observed' and availability_status is null and (price is null or price > 0))
      or
      (event_type = 'availability_observed' and price is null and availability_status is not null)
    ),
  constraint newbuild_offer_history_hash_check
    check (event_hash ~ '^[0-9a-f]{64}$'),
  constraint newbuild_offer_history_previous_hash_check
    check (previous_event_hash is null or previous_event_hash ~ '^[0-9a-f]{64}$'),
  constraint newbuild_offer_history_event_hash_unique unique (event_hash),
  constraint newbuild_offer_history_idempotency_unique unique (offer_identity, idempotency_key)
);

alter table ${table} enable row level security;
alter table ${table} force row level security;
revoke all on table ${table} from public, anon, authenticated;
grant select, insert on table ${table} to service_role;

create index if not exists newbuild_offer_history_offer_time_idx
  on ${table} (offer_identity, observed_at desc);
create index if not exists newbuild_offer_history_object_time_idx
  on ${table} (object_id, observed_at desc);

create or replace function ${appendFunction}()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'newbuild_offer_history_events is append-only';
end;
$$;

revoke all on function ${appendFunction}() from public, anon, authenticated;
grant execute on function ${appendFunction}() to service_role;

drop trigger if exists trg_newbuild_offer_history_events_append_only on ${table};
create trigger trg_newbuild_offer_history_events_append_only
before update or delete on ${table}
for each row execute function ${appendFunction}();

-- IMPORTANT: this preview intentionally has no INSERT writer function.
-- The protected writer must verify previous_event_hash and compute event_hash
-- server-side from the canonical field order before any deployment is allowed.
-- PREVIEW ONLY - NOT DEPLOYED
`;

process.stdout.write(sql);
