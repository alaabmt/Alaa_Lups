-- Allow signed-in testers to inspect only the public "demo enabled" bit.
-- Avoid SECURITY DEFINER exposure while keeping the privileged write switch.
begin;
grant select on public.na7n_pilot_feature_flags to authenticated;
drop policy if exists na7n_demo_gate_read on public.na7n_pilot_feature_flags;
create policy na7n_demo_gate_read on public.na7n_pilot_feature_flags
 for select to authenticated using (feature_key='qslaq_synthetic_only');
create or replace function public.na7n_qslaq_pilot_enabled()
returns boolean language sql stable security invoker set search_path=pg_catalog,public as $$
 select coalesce((select is_enabled from public.na7n_pilot_feature_flags
  where feature_key='qslaq_synthetic_only'),false);
$$;
revoke all on function public.na7n_qslaq_pilot_enabled() from public,anon,authenticated;
grant execute on function public.na7n_qslaq_pilot_enabled() to authenticated;
commit;
