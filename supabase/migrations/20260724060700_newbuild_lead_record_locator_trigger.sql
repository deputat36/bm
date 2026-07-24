create or replace function public.newbuild_set_lead_record_locator()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.id is null then
    new.id = gen_random_uuid();
  end if;
  new.record_locator = coalesce(nullif(new.record_locator, ''), new.id::text);
  new.source_system = coalesce(nullif(new.source_system, ''), 'supabase:newbuild_leads');
  new.operations_version = coalesce(nullif(new.operations_version, ''), '2.0');
  new.operational_status = coalesce(nullif(new.operational_status, ''), 'received');
  new.next_action = coalesce(nullif(new.next_action, ''), 'complete_triage');
  return new;
end;
$$;

drop trigger if exists trg_newbuild_set_lead_record_locator on public.newbuild_leads;
create trigger trg_newbuild_set_lead_record_locator
before insert on public.newbuild_leads
for each row execute function public.newbuild_set_lead_record_locator();

revoke all on function public.newbuild_set_lead_record_locator() from public, anon, authenticated;