-- Emergency cut-off for SYNTHETIC Q-SLAQ Supabase pilot.
-- Administrative-only gate, checked by the RLS INSERT policy on every write.
begin;
create table if not exists public.na7n_pilot_feature_flags (
 feature_key text primary key,
 is_enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.na7n_pilot_feature_flags enable row level security;
revoke all on public.na7n_pilot_feature_flags from public,anon,authenticated;
insert into public.na7n_pilot_feature_flags(feature_key,is_enabled)
 values ('qslaq_synthetic_only',true)
 on conflict(feature_key) do nothing;
create or replace function public.na7n_qslaq_pilot_enabled()
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce((select is_enabled from public.na7n_pilot_feature_flags
   where feature_key='qslaq_synthetic_only'),false);
$$;
revoke all on function public.na7n_qslaq_pilot_enabled() from public,anon,authenticated;
grant execute on function public.na7n_qslaq_pilot_enabled() to authenticated;
drop policy if exists na7n_qslaq_demo_insert_self on public.na7n_qslaq_demo_results;
create policy na7n_qslaq_demo_insert_self on public.na7n_qslaq_demo_results
 for insert to authenticated with check (
 user_id=(select auth.uid())
 and is_demo is true and synthetic_attested is true
 and (select public.na7n_qslaq_pilot_enabled())
 );
comment on table public.na7n_pilot_feature_flags is
 'Privileged switch for simulated-data pilot only. Set is_enabled=false BEFORE any real patient launch; no public read/write grants.';
commit;
-- To stop new demo inserts before real-patient launch, run PRIVILEGED:
-- UPDATE public.na7n_pilot_feature_flags SET is_enabled=false, updated_at=now()
-- WHERE feature_key='qslaq_synthetic_only';
