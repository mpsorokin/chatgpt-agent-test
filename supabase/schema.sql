-- Ship It user workspace storage. Applied to Supabase project nzoswtawxjjpnuygpska.
create table if not exists public.shipit_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 workspace jsonb not null default '{"tasks":[],"projects":[],"sprints":[]}'::jsonb check (jsonb_typeof(workspace)='object'),
 time_tracking jsonb not null default '{"entries":[],"active":null}'::jsonb check (jsonb_typeof(time_tracking)='object'),
 revision bigint not null default 0 check (revision>=0),
 updated_at timestamptz not null default now()
);
alter table public.shipit_workspaces enable row level security;
revoke all on public.shipit_workspaces from public,anon;
grant select,insert,update,delete on public.shipit_workspaces to authenticated;
create policy "shipit_select_own" on public.shipit_workspaces for select to authenticated using ((select auth.uid())=user_id);
create policy "shipit_insert_own" on public.shipit_workspaces for insert to authenticated with check ((select auth.uid())=user_id);
create policy "shipit_update_own" on public.shipit_workspaces for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "shipit_delete_own" on public.shipit_workspaces for delete to authenticated using ((select auth.uid())=user_id);
