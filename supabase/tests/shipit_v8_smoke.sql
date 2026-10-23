-- Run only in an isolated/staging Supabase project with a test auth user.
-- Requires elevated DB access. All attempted mutations are rolled back.
begin;
select pg_catalog.set_config('request.jwt.claim.sub',(
 select user_id::text from public.shipit_sync limit 1
),true);
set local role authenticated;

do $$
declare before_rows text; after_rows text; before_time text; after_time text;
  payload jsonb; revision_value bigint;
begin
 payload:=public.shipit_load_v7();
 if payload is null then raise exception 'A seeded test account is required'; end if;
 select pg_catalog.md5(pg_catalog.string_agg(id||':'||xmin::text,',' order by id))
 into before_rows from public.shipit_tasks where user_id=(select auth.uid());
 select pg_catalog.md5(pg_catalog.string_agg(id||':'||xmin::text,',' order by id))
 into before_time from public.shipit_time_entries where user_id=(select auth.uid());
 revision_value:=public.shipit_save_v8(
  payload->'workspace',payload->'time_tracking',(payload->>'revision')::bigint
 );
 if revision_value <> (payload->>'revision')::bigint+1 then
  raise exception 'Revision was not incremented';
 end if;
 select pg_catalog.md5(pg_catalog.string_agg(id||':'||xmin::text,',' order by id))
 into after_rows from public.shipit_tasks where user_id=(select auth.uid());
 select pg_catalog.md5(pg_catalog.string_agg(id||':'||xmin::text,',' order by id))
 into after_time from public.shipit_time_entries where user_id=(select auth.uid());
 if after_rows is distinct from before_rows then
  raise exception 'Unchanged tasks had a physical UPDATE/INSERT';
 end if;
 if after_time is distinct from before_time then
  raise exception 'Unchanged time entries had a physical UPDATE/INSERT';
 end if;
 -- An outdated revision must fail rather than overwrite a concurrent update.
 begin
  perform public.shipit_save_v8(
   payload->'workspace',payload->'time_tracking',(payload->>'revision')::bigint
  );
  raise exception 'Optimistic lock did not detect the conflict';
 exception when sqlstate '40001' then
  null; -- Expected serialization/revision conflict.
 end;
end $$;

rollback;
