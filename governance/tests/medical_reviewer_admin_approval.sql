begin;
create temporary table review_test_ids(actor uuid,candidate uuid,candidate2 uuid) on commit drop;
insert into review_test_ids select s.user_id,gen_random_uuid(),gen_random_uuid()
from public.na7n_medical_review_staff s join auth.users u on u.id=s.user_id
where s.is_active and s.role='coordinator' limit 1;
insert into auth.users(id,email,aud,role,email_confirmed_at)
select candidate,'review-test-'||candidate::text||'@example.invalid','authenticated','authenticated',now() from review_test_ids
union all select candidate2,'review-test-'||candidate2::text||'@example.invalid','authenticated','authenticated',now() from review_test_ids;
grant select on review_test_ids to authenticated;
select set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true) from review_test_ids;
set local role authenticated;
select public.na7n_medical_nominate(candidate,'مراجع اختبار','Test Reviewer',null,null) from review_test_ids;
select public.na7n_medical_nominate(candidate2,'مراجع اختبار ثان','Test Reviewer Two',null,null) from review_test_ids;
do $$ declare v record; begin
 select * into v from review_test_ids;
 if not exists(select 1 from public.na7n_medical_reviewers where user_id=v.candidate
  and is_active and nomination_approved_at is not null and license_verified_at is null
  and license_reference is null and not consent_to_publish_name) then raise exception 'Nomination failed'; end if;
 begin
  perform public.na7n_medical_nominate(v.actor,'Self Test',null,null,null);
  raise exception 'TEST_SELF_WAS_ALLOWED';
 exception when others then if sqlerrm='TEST_SELF_WAS_ALLOWED' then raise; end if; end;
 begin
  perform public.na7n_medical_nominate(v.candidate,'Overwrite Test',null,null,null);
  raise exception 'TEST_DUPLICATE_WAS_ALLOWED';
 exception when others then if sqlerrm='TEST_DUPLICATE_WAS_ALLOWED' then raise; end if; end;
 if not exists(select 1 from public.na7n_medical_reviewers where user_id=v.candidate and display_name_en='Test Reviewer')
  then raise exception 'Duplicate changed existing reviewer'; end if;
end; $$;
-- Ordinary reviewers cannot nominate anyone or give consent without MFA.
select set_config('request.jwt.claims',json_build_object('sub',candidate,'role','authenticated','aal','aal1')::text,true) from review_test_ids;
do $$ declare v record; begin
 select * into v from review_test_ids;
 if (select count(*) from public.na7n_medical_reviewers)<>1 then raise exception 'Cross-reviewer read permitted'; end if;
 begin
  perform public.na7n_medical_nominate(v.candidate2,'Unauthorized Test',null,null,null);
  raise exception 'TEST_UNAUTHORIZED_WAS_ALLOWED';
 exception when others then if sqlerrm='TEST_UNAUTHORIZED_WAS_ALLOWED' then raise; end if; end;
 begin
  perform public.na7n_medical_name_consent();
  raise exception 'TEST_MFA_BYPASS';
 exception when others then if sqlerrm='TEST_MFA_BYPASS' then raise; end if; end;
 begin
  update public.na7n_medical_reviewers set is_active=true,nomination_approved_at=now() where user_id=v.candidate;
  raise exception 'TEST_DIRECT_WRITE_WAS_ALLOWED';
 exception when insufficient_privilege then null; end;
end; $$;
select set_config('request.jwt.claims',json_build_object('sub',candidate,'role','authenticated','aal','aal2')::text,true) from review_test_ids;
select public.na7n_medical_name_consent();
reset role;
-- Isolated fixture approvals verify that two approvals and exact versions are still required.
insert into public.na7n_medical_review_assignments(page_path,content_sha256,reviewer_id,assigned_by)
select 'review-test.html',repeat('a',64),candidate,actor from review_test_ids
union all select 'review-test.html',repeat('a',64),candidate2,actor from review_test_ids;
do $$ begin
 if public.na7n_medical_review_ready('review-test.html',repeat('a',64)) then raise exception 'Empty decisions accepted'; end if;
end; $$;
update public.na7n_medical_reviewers set consent_to_publish_name=true where user_id=(select candidate2 from review_test_ids);
insert into public.na7n_medical_review_decisions(assignment_id,decision,statement)
select id,'approved','Synthetic test decision, rolled back' from public.na7n_medical_review_assignments
where page_path='review-test.html';
do $$ begin
 if not public.na7n_medical_review_ready('review-test.html',repeat('a',64)) then raise exception 'Two approvals not accepted'; end if;
 if public.na7n_medical_review_ready('review-test.html',repeat('b',64)) then raise exception 'Changed version accepted'; end if;
 if (public.na7n_medical_public_status('review-test.html',repeat('a',64))->>'approved')::boolean then
  raise exception 'Green badge without publisher release'; end if;
 if has_function_privilege('anon','public.na7n_medical_nominate(uuid,text,text,text,text)','EXECUTE') then raise exception 'Anonymous activation allowed'; end if;
 if has_function_privilege('authenticated','public.na7n_medical_account_id(text)','EXECUTE') then raise exception 'Account enumeration allowed'; end if;
 if has_function_privilege('authenticated','public.na7n_medical_check_license(uuid,text,text,boolean)','EXECUTE') then raise exception 'Legacy activation still enabled'; end if;
end; $$;
select 'PASS: owner activation, no license evidence, own-row access, no self approval, no overwrite, no unprivileged activation, MFA, exact-version approvals, publisher gate' as verification;
rollback;
