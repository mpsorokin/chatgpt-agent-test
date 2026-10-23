-- OWNER-ONLY RLS smoke test, requires at least one preexisting test account.
-- Intended for staging. All probes run in one rolled-back transaction.
begin;
select pg_catalog.set_config('app.expected_owner',(select user_id::text from public.shipit_sync limit 1),true);
select pg_catalog.set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000123',true);
set local role authenticated;

do $$
begin
 if exists(select 1 from public.shipit_projects)
 or exists(select 1 from public.shipit_tasks)
 or exists(select 1 from public.shipit_time_entries)
 or public.shipit_load_v7() is not null then
  raise exception 'FAILED: another account can see private records';
 end if;
 begin
  insert into public.shipit_projects(user_id,id,color)
  values(current_setting('app.expected_owner')::uuid,'rls-never-persist','#000000');
  raise exception 'FAILED: another account can insert into the owner workspace';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;
