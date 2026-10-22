-- Owner-approved participation replaces license checks. No license evidence is fabricated.
create schema if not exists na7n_private;
revoke all on schema na7n_private from public, anon;
grant usage on schema na7n_private to authenticated, service_role;

alter table public.na7n_medical_reviewers
  alter column licensing_authority drop not null,
  alter column license_reference drop not null,
  alter column specialty_ar drop not null,
  add column nomination_approved_at timestamptz,
  add column nomination_approved_by uuid references auth.users(id);
alter table public.na7n_medical_review_applications
  alter column licensing_authority drop not null,
  alter column license_reference drop not null,
  drop constraint na7n_medical_review_applications_status_check,
  add constraint na7n_medical_review_applications_status_check
    check (status in ('pending','verified','approved','declined'));

-- Preserve eligibility of previously verified reviewers, without changing their evidence.
update public.na7n_medical_reviewers set nomination_approved_at=license_verified_at
where is_active and license_verified_at is not null;

create table public.na7n_medical_reviewer_approvals (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references auth.users(id),
  approved_by uuid not null references auth.users(id),
  outcome text not null check(outcome in ('approved','declined')),
  decided_at timestamptz not null default now(),
  constraint reviewer_approval_no_self check (reviewer_id<>approved_by)
);
alter table public.na7n_medical_reviewer_approvals enable row level security;
grant select on public.na7n_medical_reviewer_approvals to authenticated;
create policy reviewer_approval_read on public.na7n_medical_reviewer_approvals
for select to authenticated using (
 reviewer_id=(select auth.uid()) or (select public.na7n_medical_staff_ok(null))
 or (select public.na7n_medical_is_license_verifier())
);

create function public.na7n_medical_reviewer_manager()
returns boolean language sql stable security invoker set search_path=''
as $$ select (select auth.uid()) is not null and
 ((select public.na7n_medical_staff_ok(null)) or
  (select public.na7n_medical_is_license_verifier())); $$;
revoke all on function public.na7n_medical_reviewer_manager() from public,anon;
grant execute on function public.na7n_medical_reviewer_manager() to authenticated;

create function na7n_private.medical_nominate(
 p_user_id uuid,p_name_ar text,p_name_en text,p_specialty_ar text,p_specialty_en text
) returns boolean language plpgsql security definer set search_path=''
as $$
begin
 if (select auth.uid()) is null or not (select public.na7n_medical_reviewer_manager()) then
  raise exception 'Reviewer administration permission required';
 end if;
 if p_user_id is null or p_user_id=(select auth.uid()) then
  raise exception 'Another administrator must approve this reviewer';
 end if;
 if p_name_ar is null or char_length(trim(p_name_ar)) not between 3 and 120 then
  raise exception 'Reviewer name must be 3 to 120 characters';
 end if;
 if not exists(select 1 from auth.users where id=p_user_id and deleted_at is null
  and (banned_until is null or banned_until<now())) then
  raise exception 'Active account required';
 end if;
 if exists(select 1 from public.na7n_medical_reviewers where user_id=p_user_id) then
  raise exception 'Reviewer already exists; no account or permissions were overwritten';
 end if;
 insert into public.na7n_medical_reviewers
  (user_id,display_name_ar,display_name_en,specialty_ar,specialty_en,
   nomination_approved_at,nomination_approved_by,is_active)
 values (p_user_id,trim(p_name_ar),nullif(trim(p_name_en),''),
  nullif(trim(p_specialty_ar),''),nullif(trim(p_specialty_en),''),now(),auth.uid(),true);
 insert into public.na7n_medical_reviewer_approvals(reviewer_id,approved_by,outcome)
 values(p_user_id,auth.uid(),'approved');
 return true;
end; $$;
revoke all on function na7n_private.medical_nominate(uuid,text,text,text,text) from public,anon;
grant execute on function na7n_private.medical_nominate(uuid,text,text,text,text) to authenticated;

create function public.na7n_medical_nominate(
 p_user_id uuid,p_name_ar text,p_name_en text default null,
 p_specialty_ar text default null,p_specialty_en text default null
) returns boolean language sql security invoker set search_path=''
as $$ select na7n_private.medical_nominate(p_user_id,p_name_ar,p_name_en,p_specialty_ar,p_specialty_en); $$;
revoke all on function public.na7n_medical_nominate(uuid,text,text,text,text) from public,anon;
grant execute on function public.na7n_medical_nominate(uuid,text,text,text,text) to authenticated;

create function na7n_private.medical_application_decide(p_applicant_id uuid,p_outcome text)
returns boolean language plpgsql security definer set search_path=''
as $$ declare v_app public.na7n_medical_review_applications%rowtype;
begin
 if (select auth.uid()) is null or not (select public.na7n_medical_reviewer_manager()) then
  raise exception 'Reviewer administration permission required'; end if;
 if p_applicant_id is null or p_applicant_id=auth.uid() then
  raise exception 'Another administrator must decide this application'; end if;
 if p_outcome is null or p_outcome not in ('approved','declined') then
  raise exception 'Invalid decision'; end if;
 select * into v_app from public.na7n_medical_review_applications
 where user_id=p_applicant_id and status='pending' for update;
 if not found then raise exception 'No pending application'; end if;
 if p_outcome='approved' then
  perform na7n_private.medical_nominate(v_app.user_id,v_app.full_name_ar,v_app.full_name_en,
   v_app.specialty_ar,v_app.specialty_en);
  update public.na7n_medical_reviewers set consent_to_publish_name=v_app.consent_to_publish_name
  where user_id=p_applicant_id;
 else
  insert into public.na7n_medical_reviewer_approvals(reviewer_id,approved_by,outcome)
  values(p_applicant_id,auth.uid(),'declined');
 end if;
 update public.na7n_medical_review_applications set status=p_outcome,reviewed_at=now()
 where user_id=p_applicant_id;
 return true;
end; $$;
revoke all on function na7n_private.medical_application_decide(uuid,text) from public,anon;
grant execute on function na7n_private.medical_application_decide(uuid,text) to authenticated;
create function public.na7n_medical_approve_application(p_applicant_id uuid,p_outcome text)
returns boolean language sql security invoker set search_path=''
as $$ select na7n_private.medical_application_decide(p_applicant_id,p_outcome); $$;
revoke all on function public.na7n_medical_approve_application(uuid,text) from public,anon;
grant execute on function public.na7n_medical_approve_application(uuid,text) to authenticated;

-- Used only by the authenticated administrator's account-creation Edge Function.
create function na7n_private.medical_account_id(p_email text)
returns uuid language plpgsql security definer set search_path=''
as $$ begin
 if (select auth.role()) is distinct from 'service_role' then raise exception 'Service access required'; end if;
 return (select id from auth.users where lower(email)=lower(trim(p_email)) and deleted_at is null limit 1);
end; $$;
revoke all on function na7n_private.medical_account_id(text) from public,anon,authenticated;
grant execute on function na7n_private.medical_account_id(text) to service_role;
create function public.na7n_medical_account_id(p_email text)
returns uuid language sql security invoker set search_path=''
as $$ select na7n_private.medical_account_id(p_email); $$;
revoke all on function public.na7n_medical_account_id(text) from public,anon,authenticated;
grant execute on function public.na7n_medical_account_id(text) to service_role;

-- A newly added reviewer supplies their own publication consent, never the administrator.
create function na7n_private.medical_name_consent()
returns boolean language plpgsql security definer set search_path=''
as $$ begin
 if (select auth.uid()) is null or ((select auth.jwt())->>'aal') is distinct from 'aal2' then
  raise exception 'Reviewer sign-in and MFA required'; end if;
 update public.na7n_medical_reviewers set consent_to_publish_name=true
 where user_id=auth.uid() and is_active and nomination_approved_at is not null;
 if not found then raise exception 'Active staff-approved reviewer required'; end if;
 return true;
end; $$;
revoke all on function na7n_private.medical_name_consent() from public,anon;
grant execute on function na7n_private.medical_name_consent() to authenticated;
create function public.na7n_medical_name_consent()
returns boolean language sql security invoker set search_path=''
as $$ select na7n_private.medical_name_consent(); $$;
revoke all on function public.na7n_medical_name_consent() from public,anon;
grant execute on function public.na7n_medical_name_consent() to authenticated;

alter policy medical_decision_insert on public.na7n_medical_review_decisions
with check (
 ((select auth.jwt())->>'aal')='aal2' and exists (
  select 1 from public.na7n_medical_review_assignments a
  join public.na7n_medical_reviewers r on r.user_id=a.reviewer_id
  where a.id=assignment_id and a.is_active and a.reviewer_id=(select auth.uid())
   and r.is_active and r.nomination_approved_at is not null
   and (decision<>'approved' or r.consent_to_publish_name)
 )
);

-- Retire the previous activation endpoint; no new license-check records are created.
revoke execute on function public.na7n_medical_check_license(uuid,text,text,boolean)
from public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.na7n_medical_assign(p_page_path text, p_sha256 text, p_reviewer_id uuid, p_due_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
 if not (select public.na7n_medical_staff_ok(null)) then
   raise exception 'Coordinator access required';
 end if;
 if p_reviewer_id is null or p_reviewer_id=(select auth.uid()) then
   raise exception 'A coordinator must not assign themselves as physician reviewer';
 end if;
 if p_page_path !~ '^[a-z][a-z0-9-]*[.]html$' or p_sha256 !~ '^[0-9a-f]{64}$' then
   raise exception 'Invalid page version';
 end if;
 if not exists(select 1 from public.na7n_medical_reviewers r
   where r.user_id=p_reviewer_id and r.is_active and r.nomination_approved_at is not null)
 then raise exception 'Reviewer is not staff-approved and active'; end if;
 update public.na7n_medical_review_assignments set is_active=false
 where reviewer_id=p_reviewer_id and page_path=p_page_path and is_active;
 insert into public.na7n_medical_review_assignments
 (page_path,content_sha256,reviewer_id,assigned_by,due_at)
 values(p_page_path,p_sha256,p_reviewer_id,(select auth.uid()),p_due_at)
 returning id into v_id;
 return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.na7n_medical_review_ready(p_page_path text, p_sha256 text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 with active_reviews as (
 select a.id, a.reviewer_id, d.decision, r.is_active as doctor_active,
 (r.nomination_approved_at is not null) as nominated, r.consent_to_publish_name as name_consent
 from public.na7n_medical_review_assignments a
 join public.na7n_medical_reviewers r on r.user_id=a.reviewer_id
 left join public.na7n_medical_review_decisions d on d.assignment_id=a.id
 where a.is_active and a.page_path=p_page_path and a.content_sha256=p_sha256
 )
 select (count(*)>=2 and count(distinct reviewer_id)>=2
 and count(*) filter(where decision='approved' and doctor_active and nominated and name_consent)=count(*))
 from active_reviews;
$function$
;

CREATE OR REPLACE FUNCTION public.na7n_medical_publish(p_page_path text, p_sha256 text, p_qa_evidence_url text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin
 if not (select public.na7n_medical_staff_ok('publisher')) then raise exception 'Publisher permission required'; end if;
 if p_qa_evidence_url is null or p_qa_evidence_url !~ '^https://[^ ]+$' then raise exception 'QA evidence is required'; end if;
 if not (select public.na7n_medical_review_ready(p_page_path,p_sha256)) then
   raise exception 'Two staff-approved physician approvals for exactly this content version are required';
 end if;
 insert into public.na7n_medical_review_releases(page_path,content_sha256,qa_evidence_url,approved_by)
 values(p_page_path,p_sha256,p_qa_evidence_url,auth.uid())
 on conflict (page_path,content_sha256) do update set qa_evidence_url=excluded.qa_evidence_url,
 approved_by=excluded.approved_by, approved_at=now();
 return true;
end; $function$
;


