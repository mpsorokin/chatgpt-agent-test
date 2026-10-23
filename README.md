# Ship It 6.0 — Supabase Cloud Workspace

**[Live app](https://mpsorokin.github.io/chatgpt-agent-test/)**

## Cloud account & sync

- Email/password registration and sign-in with Supabase Auth.
- Per-user private PostgreSQL workspace, protected with owner-only RLS.
- Autosave for tasks, projects, sprints, schedules, subtask checklists and time entries.
- First-time import from earlier browser-local data with explicit user choice.
- Optimistic revision checks to detect edits from another device. This is **not** real-time collaborative editing: simultaneous edits require manual conflict resolution.
- JSON backup import/export is retained.
- GitHub Pages deployment uses a public Supabase publishable key. No service role secrets are ever exposed.

## Required Supabase dashboard configuration

In **Authentication → URL Configuration**, set the Site URL to `https://mpsorokin.github.io/chatgpt-agent-test/` and add it to Redirect URLs. For local development add `http://localhost:3000/**` as well. Email confirmations may be required; enable Email in Authentication → Providers. Configure an SMTP provider for reliable production email delivery.

The database migration is stored in [`supabase/schema.sql`](./supabase/schema.sql) and was applied to project `nzoswtawxjjpnuygpska`.

## Local development

Run `npm install` then `NEXT_PUBLIC_BASE_PATH='' npm run dev`. The Supabase publishable key is not a secret and authorization is strictly enforced via database RLS. Never add a secret/service-role key to the client.

## Existing app capabilities

Dashboard, Kanban, task editor, project management, time tracking, reports, Gantt, calendar, planning, sprint management, burndown, insights, themes and exports.
