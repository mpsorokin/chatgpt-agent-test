
-- Normalized v7 storage; legacy shipit_workspaces is kept unchanged as a rollback backup.
create table if not exists public.shipit_projects (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check(length(id) between 1 and 50),
 color text not null default '#816df2' check(color ~ '^#[0-9a-fA-F]{6}$'),
 primary key(user_id,id)
);
create table if not exists public.shipit_sprints (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check(length(id) between 1 and 100),
 name text not null check(length(name) between 1 and 90),
 goal text not null default '',
 start_date date not null,
 end_date date not null,
 status text not null default 'planned' check(status in ('planned','active','completed')),
 primary key(user_id,id),check(start_date<=end_date)
);
create table if not exists public.shipit_tasks (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check(length(id) between 1 and 100),
 text text not null check(length(text) between 1 and 180),
 description text not null default '',
 project_id text not null,
 sprint_id text,
 priority text not null default 'medium' check(priority in ('high','medium','low')),
 status text not null default 'todo' check(status in ('todo','doing','done')),
 start_date date,
 due_date date,
 estimate_hours numeric(9,2) not null default 0 check(estimate_hours between 0 and 10000),
 created_at timestamptz not null,
 completed_at timestamptz,
 primary key(user_id,id),
 foreign key(user_id,project_id) references public.shipit_projects(user_id,id) on update cascade,
 foreign key(user_id,sprint_id) references public.shipit_sprints(user_id,id) on delete set null (sprint_id),
 check(start_date is null or due_date is null or start_date<=due_date)
);
create table if not exists public.shipit_subtasks (
 user_id uuid not null,
 id text not null check(length(id) between 1 and 100),
 task_id text not null,
 text text not null check(length(text) between 1 and 140),
 done boolean not null default false,
 sort_order integer not null default 0,
 primary key(user_id,id),
 foreign key(user_id,task_id) references public.shipit_tasks(user_id,id) on delete cascade
);
create table if not exists public.shipit_time_entries (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check(length(id) between 1 and 100),
 task_id text,
 task_title text not null,
 project_name text not null,
 description text not null default '',
 started_at timestamptz not null,
 ended_at timestamptz not null,
 primary key(user_id,id),check(ended_at>started_at)
);
-- Optional task_id intentionally lacks an FK: historical time entries survive task deletion.
create table if not exists public.shipit_active_timers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 task_id text,task_title text not null,project_name text not null,
 description text not null default '',started_at timestamptz not null
);
create table if not exists public.shipit_sync (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0 check(revision>=0),
 updated_at timestamptz not null default now()
);
create index if not exists shipit_tasks_due_idx on public.shipit_tasks(user_id,due_date) where status<>'done';
create index if not exists shipit_tasks_project_idx on public.shipit_tasks(user_id,project_id,status);
create index if not exists shipit_tasks_sprint_idx on public.shipit_tasks(user_id,sprint_id) where sprint_id is not null;
create index if not exists shipit_subtasks_task_idx on public.shipit_subtasks(user_id,task_id,sort_order);
create index if not exists shipit_time_entries_start_idx on public.shipit_time_entries(user_id,started_at desc);
create index if not exists shipit_sprints_start_idx on public.shipit_sprints(user_id,start_date);
do $$
declare tbl text;
begin
 foreach tbl in array array['shipit_projects','shipit_sprints','shipit_tasks','shipit_subtasks','shipit_time_entries','shipit_active_timers','shipit_sync'] loop
  execute format('alter table public.%I enable row level security',tbl);
  execute format('revoke all on public.%I from public,anon',tbl);
  execute format('grant select,insert,update,delete on public.%I to authenticated',tbl);
  execute format('create policy %I on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',tbl||'_owner',tbl);
 end loop;
end $$;

-- Atomic replacement RPC: one Postgres transaction and optimistic revision check.
-- Called only by an authenticated user's own session (SECURITY INVOKER).
create or replace function public.shipit_save_v7(
 p_workspace jsonb,p_time jsonb,p_expected_revision bigint
) returns bigint language plpgsql security invoker set search_path = '' as $$
declare u uuid := (select auth.uid()); next_revision bigint;
begin
 if u is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if jsonb_typeof(p_workspace->'projects')<>'array'
 or jsonb_typeof(p_workspace->'tasks')<>'array'
 or jsonb_typeof(p_workspace->'sprints')<>'array'
 or jsonb_typeof(p_time->'entries')<>'array' then
  raise exception 'Invalid workspace payload' using errcode='22023';
 end if;
 insert into public.shipit_sync(user_id,revision) values(u,0) on conflict(user_id) do nothing;
 update public.shipit_sync set revision=revision+1,updated_at=now()
 where user_id=u and revision=p_expected_revision returning revision into next_revision;
 if next_revision is null then raise exception 'Sync conflict: workspace revision changed' using errcode='40001'; end if;

 -- Delete dependent rows first; rebuild state transactionally.
 delete from public.shipit_subtasks where user_id=u;
 delete from public.shipit_tasks where user_id=u;
 delete from public.shipit_sprints where user_id=u;
 delete from public.shipit_projects where user_id=u;
 delete from public.shipit_time_entries where user_id=u;
 delete from public.shipit_active_timers where user_id=u;

 insert into public.shipit_projects(user_id,id,color)
 select u,p->>'id',coalesce(nullif(p->>'color',''),'#816df2')
 from jsonb_array_elements(p_workspace->'projects') p;

 insert into public.shipit_sprints(user_id,id,name,goal,start_date,end_date,status)
 select u,s->>'id',s->>'name',coalesce(s->>'goal',''),(s->>'start')::date,(s->>'end')::date,coalesce(s->>'status','planned')
 from jsonb_array_elements(p_workspace->'sprints') s;

 insert into public.shipit_tasks(user_id,id,text,description,project_id,sprint_id,priority,status,start_date,due_date,estimate_hours,created_at,completed_at)
 select u,t->>'id',t->>'text',coalesce(t->>'description',''),t->>'project',nullif(t->>'sprintId',''),
 coalesce(t->>'priority','medium'),coalesce(t->>'status','todo'),nullif(t->>'startDate','')::date,
 nullif(t->>'due','')::date,coalesce(nullif(t->>'estimateHours','')::numeric,0),
 to_timestamp((t->>'created')::double precision/1000.0),
 case when nullif(t->>'completedAt','') is null or t->>'completedAt'='null' then null else to_timestamp((t->>'completedAt')::double precision/1000.0) end
 from jsonb_array_elements(p_workspace->'tasks') t;

 insert into public.shipit_subtasks(user_id,id,task_id,text,done,sort_order)
 select u,st.value->>'id', t->>'id',st.value->>'text',coalesce((st.value->>'done')::boolean,false),st.ordinality::integer
 from jsonb_array_elements(p_workspace->'tasks') t
 cross join lateral jsonb_array_elements(coalesce(t->'subtasks','[]'::jsonb)) with ordinality st;

 insert into public.shipit_time_entries(user_id,id,task_id,task_title,project_name,description,started_at,ended_at)
 select u,e->>'id',nullif(e->>'taskId',''),coalesce(e->>'taskTitle',''),coalesce(e->>'project',''),coalesce(e->>'description',''),
 to_timestamp((e->>'startedAt')::double precision/1000.0),to_timestamp((e->>'endedAt')::double precision/1000.0)
 from jsonb_array_elements(p_time->'entries') e;

 if jsonb_typeof(p_time->'active')='object' then
  insert into public.shipit_active_timers(user_id,task_id,task_title,project_name,description,started_at)
  select u,nullif(p_time->'active'->>'taskId',''),coalesce(p_time->'active'->>'taskTitle',''),
  coalesce(p_time->'active'->>'project',''),coalesce(p_time->'active'->>'description',''),
  to_timestamp((p_time->'active'->>'startedAt')::double precision/1000.0);
 end if;
 return next_revision;
end $$;
revoke all on function public.shipit_save_v7(jsonb,jsonb,bigint) from public,anon;
grant execute on function public.shipit_save_v7(jsonb,jsonb,bigint) to authenticated;

-- Read as typed JSON DTO for the existing React state model. Persistent source is relational.
create or replace function public.shipit_load_v7() returns jsonb language sql stable security invoker set search_path = '' as $$
 select case when s.user_id is null then null else jsonb_build_object(
 'revision',s.revision,
 'workspace',jsonb_build_object(
  'projects',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'color',p.color) order by p.id)
    from public.shipit_projects p where p.user_id=s.user_id),'[]'::jsonb),
  'sprints',coalesce((select jsonb_agg(jsonb_build_object('id',sp.id,'name',sp.name,'goal',sp.goal,'start',sp.start_date::text,'end',sp.end_date::text,'status',sp.status) order by sp.start_date)
    from public.shipit_sprints sp where sp.user_id=s.user_id),'[]'::jsonb),
  'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'text',t.text,'description',t.description,'project',t.project_id,
    'priority',t.priority,'status',t.status,'startDate',coalesce(t.start_date::text,''),'due',coalesce(t.due_date::text,''),
    'estimateHours',t.estimate_hours,'sprintId',coalesce(t.sprint_id,''),
    'created',floor(extract(epoch from t.created_at)*1000)::bigint,
    'completedAt',case when t.completed_at is null then null else floor(extract(epoch from t.completed_at)*1000)::bigint end,
    'subtasks',coalesce((select jsonb_agg(jsonb_build_object('id',st.id,'text',st.text,'done',st.done) order by st.sort_order) from public.shipit_subtasks st where st.user_id=t.user_id and st.task_id=t.id),'[]'::jsonb)) order by t.created_at desc)
    from public.shipit_tasks t where t.user_id=s.user_id),'[]'::jsonb)),
 'time_tracking',jsonb_build_object(
  'entries',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'taskId',e.task_id,'taskTitle',e.task_title,
    'project',e.project_name,'description',e.description,'startedAt',floor(extract(epoch from e.started_at)*1000)::bigint,
    'endedAt',floor(extract(epoch from e.ended_at)*1000)::bigint,'durationMs',floor(extract(epoch from (e.ended_at-e.started_at))*1000)::bigint) order by e.started_at desc)
   from public.shipit_time_entries e where e.user_id=s.user_id),'[]'::jsonb),
  'active',(select jsonb_build_object('taskId',a.task_id,'taskTitle',a.task_title,'project',a.project_name,
     'description',a.description,'startedAt',floor(extract(epoch from a.started_at)*1000)::bigint)
    from public.shipit_active_timers a where a.user_id=s.user_id)))
 end
 from (select user_id,revision from public.shipit_sync where user_id=(select auth.uid())) s
$$;
revoke all on function public.shipit_load_v7() from public,anon;
grant execute on function public.shipit_load_v7() to authenticated;

-- Backfill accounts from the preserved JSON snapshots using the same normalizer RPC semantics.
-- Each user has their own transaction and is never deleted from shipit_workspaces.
do $$
declare r record; w jsonb; tm jsonb;
begin
 for r in select user_id,workspace,time_tracking from public.shipit_workspaces loop
  -- The migration runs as DB owner. Populate via relational statements to avoid auth.uid() reliance.
  w:=r.workspace;tm:=r.time_tracking;
  insert into public.shipit_sync(user_id,revision) values(r.user_id,1) on conflict do nothing;
  insert into public.shipit_projects(user_id,id,color)
  select r.user_id,p->>'id',coalesce(p->>'color','#816df2')
  from jsonb_array_elements(coalesce(w->'projects','[]'::jsonb)) p on conflict do nothing;
  insert into public.shipit_sprints(user_id,id,name,goal,start_date,end_date,status)
  select r.user_id,s->>'id',s->>'name',coalesce(s->>'goal',''),(s->>'start')::date,(s->>'end')::date,coalesce(s->>'status','planned')
  from jsonb_array_elements(coalesce(w->'sprints','[]'::jsonb)) s on conflict do nothing;
  insert into public.shipit_tasks(user_id,id,text,description,project_id,sprint_id,priority,status,start_date,due_date,estimate_hours,created_at,completed_at)
  select r.user_id,t->>'id',t->>'text',coalesce(t->>'description',''),t->>'project',nullif(t->>'sprintId',''),coalesce(t->>'priority','medium'),
  coalesce(t->>'status','todo'),nullif(t->>'startDate','')::date,nullif(t->>'due','')::date,
  coalesce(nullif(t->>'estimateHours','')::numeric,0),to_timestamp((t->>'created')::double precision/1000.0),
  case when nullif(t->>'completedAt','') is null or t->>'completedAt'='null' then null else to_timestamp((t->>'completedAt')::double precision/1000.0) end
  from jsonb_array_elements(coalesce(w->'tasks','[]'::jsonb)) t on conflict do nothing;
  insert into public.shipit_subtasks(user_id,id,task_id,text,done,sort_order)
  select r.user_id,st.value->>'id',t->>'id',st.value->>'text',coalesce((st.value->>'done')::boolean,false),st.ordinality::integer
  from jsonb_array_elements(coalesce(w->'tasks','[]'::jsonb)) t
  cross join lateral jsonb_array_elements(coalesce(t->'subtasks','[]'::jsonb)) with ordinality st on conflict do nothing;
  insert into public.shipit_time_entries(user_id,id,task_id,task_title,project_name,description,started_at,ended_at)
  select r.user_id,e->>'id',nullif(e->>'taskId',''),coalesce(e->>'taskTitle',''),coalesce(e->>'project',''),coalesce(e->>'description',''),
  to_timestamp((e->>'startedAt')::double precision/1000.0),to_timestamp((e->>'endedAt')::double precision/1000.0)
  from jsonb_array_elements(coalesce(tm->'entries','[]'::jsonb)) e on conflict do nothing;
  if jsonb_typeof(tm->'active')='object' then
   insert into public.shipit_active_timers(user_id,task_id,task_title,project_name,description,started_at)
   select r.user_id,nullif(tm->'active'->>'taskId',''),coalesce(tm->'active'->>'taskTitle',''),coalesce(tm->'active'->>'project',''),
   coalesce(tm->'active'->>'description',''),to_timestamp((tm->'active'->>'startedAt')::double precision/1000.0)
   on conflict do nothing;
  end if;
 end loop;
end $$;
