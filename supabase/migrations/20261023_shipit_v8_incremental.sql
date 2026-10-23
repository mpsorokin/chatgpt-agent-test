-- V8: preserve row identity and update ONLY changed entities.
-- JSON is a transport DTO, never a stored document; optimistic revision serializes writers.
create or replace function public.shipit_save_v8(
 p_workspace jsonb, p_time jsonb, p_expected_revision bigint
) returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare
 u uuid := (select auth.uid());
 next_revision bigint;
begin
 if u is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if pg_catalog.jsonb_typeof(p_workspace->'projects') <> 'array'
 or pg_catalog.jsonb_typeof(p_workspace->'sprints') <> 'array'
 or pg_catalog.jsonb_typeof(p_workspace->'tasks') <> 'array'
 or pg_catalog.jsonb_typeof(p_time->'entries') <> 'array'
 then raise exception 'Invalid workspace payload' using errcode='22023'; end if;
 if pg_catalog.jsonb_array_length(p_workspace->'projects')>120
 or pg_catalog.jsonb_array_length(p_workspace->'sprints')>100
 or pg_catalog.jsonb_array_length(p_workspace->'tasks')>5000
 or pg_catalog.jsonb_array_length(p_time->'entries')>10000
 then raise exception 'Workspace too large' using errcode='22023'; end if;

 insert into public.shipit_sync(user_id,revision) values(u,0) on conflict(user_id) do nothing;
 update public.shipit_sync set revision=revision+1,updated_at=pg_catalog.now()
 where user_id=u and revision=p_expected_revision returning revision into next_revision;
 if next_revision is null then
  raise exception 'Sync conflict: workspace revision changed' using errcode='40001';
 end if;

 insert into public.shipit_projects as current(user_id,id,color)
 select u,x->>'id',coalesce(nullif(x->>'color',''),'#816df2')
 from pg_catalog.jsonb_array_elements(p_workspace->'projects') x
 on conflict (user_id,id) do update set color=excluded.color
 where current.color is distinct from excluded.color;

 insert into public.shipit_sprints as current(user_id,id,name,goal,start_date,end_date,status)
 select u,x->>'id',x->>'name',coalesce(x->>'goal',''),
 (x->>'start')::date,(x->>'end')::date,coalesce(x->>'status','planned')
 from pg_catalog.jsonb_array_elements(p_workspace->'sprints') x
 on conflict (user_id,id) do update
 set name=excluded.name,goal=excluded.goal,start_date=excluded.start_date,
 end_date=excluded.end_date,status=excluded.status
 where (current.name,current.goal,current.start_date,current.end_date,current.status)
 is distinct from (excluded.name,excluded.goal,excluded.start_date,excluded.end_date,excluded.status);

 insert into public.shipit_tasks as current(
 user_id,id,text,description,project_id,sprint_id,priority,status,
 start_date,due_date,estimate_hours,created_at,completed_at
 )
 select u,x->>'id',x->>'text',coalesce(x->>'description',''),x->>'project',
 nullif(x->>'sprintId',''),coalesce(x->>'priority','medium'),coalesce(x->>'status','todo'),
 nullif(x->>'startDate','')::date,nullif(x->>'due','')::date,
 coalesce(nullif(x->>'estimateHours','')::numeric,0),
 pg_catalog.to_timestamp((x->>'created')::double precision/1000.0),
 case when nullif(x->>'completedAt','') is null then null
 else pg_catalog.to_timestamp((x->>'completedAt')::double precision/1000.0) end
 from pg_catalog.jsonb_array_elements(p_workspace->'tasks') x
 on conflict (user_id,id) do update set
 text=excluded.text,description=excluded.description,project_id=excluded.project_id,
 sprint_id=excluded.sprint_id,priority=excluded.priority,status=excluded.status,
 start_date=excluded.start_date,due_date=excluded.due_date,
 estimate_hours=excluded.estimate_hours,created_at=excluded.created_at,
 completed_at=excluded.completed_at
 where (current.text,current.description,current.project_id,current.sprint_id,
 current.priority,current.status,current.start_date,current.due_date,
 current.estimate_hours,current.created_at,current.completed_at)
 is distinct from (excluded.text,excluded.description,excluded.project_id,excluded.sprint_id,
 excluded.priority,excluded.status,excluded.start_date,excluded.due_date,
 excluded.estimate_hours,excluded.created_at,excluded.completed_at);

 insert into public.shipit_subtasks as current(user_id,id,task_id,text,done,sort_order)
 select u,st.value->>'id',task->>'id',st.value->>'text',
 coalesce((st.value->>'done')::boolean,false),st.ordinality::integer
 from pg_catalog.jsonb_array_elements(p_workspace->'tasks') task
 cross join lateral pg_catalog.jsonb_array_elements(coalesce(task->'subtasks','[]'::jsonb))
 with ordinality st
 on conflict (user_id,id) do update set
 task_id=excluded.task_id,text=excluded.text,done=excluded.done,sort_order=excluded.sort_order
 where (current.task_id,current.text,current.done,current.sort_order)
 is distinct from (excluded.task_id,excluded.text,excluded.done,excluded.sort_order);

 insert into public.shipit_time_entries as current(
 user_id,id,task_id,task_title,project_name,description,started_at,ended_at
 )
 select u,x->>'id',nullif(x->>'taskId',''),
 coalesce(x->>'taskTitle',''),coalesce(x->>'project',''),
 coalesce(x->>'description',''),
 pg_catalog.to_timestamp((x->>'startedAt')::double precision/1000.0),
 pg_catalog.to_timestamp((x->>'endedAt')::double precision/1000.0)
 from pg_catalog.jsonb_array_elements(p_time->'entries') x
 on conflict (user_id,id) do update set
 task_id=excluded.task_id,task_title=excluded.task_title,
 project_name=excluded.project_name,description=excluded.description,
 started_at=excluded.started_at,ended_at=excluded.ended_at
 where (current.task_id,current.task_title,current.project_name,current.description,
 current.started_at,current.ended_at)
 is distinct from (excluded.task_id,excluded.task_title,excluded.project_name,
 excluded.description,excluded.started_at,excluded.ended_at);

 if pg_catalog.jsonb_typeof(p_time->'active')='object' then
  insert into public.shipit_active_timers as current(
   user_id,task_id,task_title,project_name,description,started_at
  )
  select u,nullif(p_time->'active'->>'taskId',''),
  coalesce(p_time->'active'->>'taskTitle',''),
  coalesce(p_time->'active'->>'project',''),
  coalesce(p_time->'active'->>'description',''),
  pg_catalog.to_timestamp((p_time->'active'->>'startedAt')::double precision/1000.0)
  on conflict (user_id) do update set
   task_id=excluded.task_id,task_title=excluded.task_title,
   project_name=excluded.project_name,description=excluded.description,
   started_at=excluded.started_at
  where (current.task_id,current.task_title,current.project_name,
   current.description,current.started_at)
   is distinct from (excluded.task_id,excluded.task_title,excluded.project_name,
   excluded.description,excluded.started_at);
 else
  delete from public.shipit_active_timers where user_id=u;
 end if;

 -- Delete only missing IDs; kept parents and subtasks retain their physical rows.
 delete from public.shipit_subtasks old where old.user_id=u
 and not exists(
  select 1 from pg_catalog.jsonb_array_elements(p_workspace->'tasks') task
  cross join lateral pg_catalog.jsonb_array_elements(coalesce(task->'subtasks','[]'::jsonb)) st
  where st->>'id'=old.id and task->>'id'=old.task_id
 );
 delete from public.shipit_tasks old where old.user_id=u and not exists(
  select 1 from pg_catalog.jsonb_array_elements(p_workspace->'tasks') x
  where x->>'id'=old.id
 );
 delete from public.shipit_sprints old where old.user_id=u and not exists(
  select 1 from pg_catalog.jsonb_array_elements(p_workspace->'sprints') x
  where x->>'id'=old.id
 );
 delete from public.shipit_projects old where old.user_id=u and not exists(
  select 1 from pg_catalog.jsonb_array_elements(p_workspace->'projects') x
  where x->>'id'=old.id
 );
 delete from public.shipit_time_entries old where old.user_id=u and not exists(
  select 1 from pg_catalog.jsonb_array_elements(p_time->'entries') x
  where x->>'id'=old.id
 );
 return next_revision;
end $$;
revoke all on function public.shipit_save_v8(jsonb,jsonb,bigint) from public,anon;
grant execute on function public.shipit_save_v8(jsonb,jsonb,bigint) to authenticated;
