# Ship It 7.0 — normalized Supabase PostgreSQL

Live: https://mpsorokin.github.io/chatgpt-agent-test/

The database now uses relational tables: `shipit_projects`, `shipit_tasks`, `shipit_subtasks`, `shipit_sprints`, `shipit_time_entries`, `shipit_active_timers`, `shipit_sync`. Composite owner-scoped keys, foreign keys, CHECK constraints, targeted indexes, and owner-only RLS are enforced. Existing user data is backfilled. The original `shipit_workspaces` JSONB table remains untouched as a rollback backup.

The browser uses `shipit_load_v7()` and `shipit_save_v7()` PostgreSQL RPCs, via Supabase Auth and its publishable key. JSON is only the RPC request/response transport; actual stored records are relational, not a JSONB snapshot. `shipit_save_v7` replaces workspace rows transactionally under an optimistic revision check; suitable for current small workspaces, not yet incremental per-entity API writes. Cross-device conflicting edits require user reconciliation. User-owned records remain isolated by RLS. **Do not remove the legacy backup until fully validated.**

Previous auth, routing, development and deployment details remain in Git history. Database migration: [`supabase/migrations/20261023_shipit_v7_normalized.sql`](supabase/migrations/20261023_shipit_v7_normalized.sql).
