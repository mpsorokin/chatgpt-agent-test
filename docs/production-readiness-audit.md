# Ship It — Production Readiness Review (23 October 2026)

**Assessment:** functional MVP; **not approved for unrestricted public SaaS launch**. This review is based on the actual GitHub \`mpsorokin/chatgpt-agent-test\` source and the live Supabase project \`nzoswtawxjjpnuygpska\`, not an idealized design.

## Executive decision

- **Internal demo / controlled beta:** acceptable once the current release passes CI and real-browser smoke tests.
- **Public release with important user data:** **NO-GO** until the P0/P1 exit criteria below are satisfied.
- **Multi-user collaborative product:** significant additional architecture required. Present storage is **one workspace per account**, not shared teams/workspaces.

## Findings matrix

| Severity | Area | Actual evidence | Remediation | Status |
|---|---|---|---|---|
| P0 | Data writes | Prior \`shipit_save_v7\` deleted and recreated **all** tasks, subtasks, sprints, projects, time entries on every save | Use id-preserving conditional UPSERT, delete only removed IDs, atomic optimistic locking | **Mitigated in v8**; full snapshot still sent |
| P0 | Unsaved edits | \`useCloudWorkspace\` delayed save by 850 ms; no unload guard | Track dirty state synchronously, warn on unload/signout and during request | **Mitigated**, not offline-durable |
| P0 | Account isolation | Auth sign-out left previous account state in React memory; another account could accidentally import it | Clear per-account state on switch/signout but preserve anonymous legacy import | **Fixed** |
| P1 | Concurrent auth loads | Boolean loading guard could suppress account B load while account A request pending | Use account-specific request IDs and ignore stale responses | **Fixed** |
| P1 | Failed writes | Unbounded retry every ~850 ms on network/validation failure | Exponential backoff capped, stop after 3 failures, backup/export UI | **Fixed** |
| P1 | Reproducible builds | \`package-lock.json\` absent; CI uses \`npm install\` | Generate/commit lockfile, \`npm ci\`, dependency update process | **Open** |
| P1 | Functional correctness | Vitest exercises domain functions, not real browser+Supabase auth flows | Playwright E2E + staged Supabase integration tests | **Open** |
| P1 | Hosting | \`output:'export'\` on GitHub Pages, client-only auth gate | Host with Next.js runtime + \`@supabase/ssr\` for request-time protection when server rendering is required | **Open** |
| P1 | Auth operations | Production SMTP and leaked-password checks not configured/available; delivery incident already observed | Configure SMTP, redirect URL allow-list, Auth logs, abuse protections | **Open** |
| P1 | Backups | Legacy JSONB snapshot is not a continuously updated backup; no documented tested restoration | Database backups + restore drill, user export on failure, RPO/RTO targets | **Open** |
| P2 | Performance | DB RPC serializes **entire** workspace as JSON and scans it each mutation | Per-entity CRUD commands and targeted reads; DB-side reports with pagination | **Open** |
| P2 | Historical reports | Burndown/velocity reconstructed from *current* tasks, not immutable past events | Add append-only task event history and sprint baseline snapshots | **Open** |
| P2 | Code structure | Large \`workspace-app.tsx\` client shell owns auth, tasks, projects, imports, navigation and timers | Split into domain feature modules, query/mutation layer, headless hooks | **Open** |
| P2 | Observability | No structured error traces, release health signals, SLOs or alerting | Sentry/OpenTelemetry, Web Vitals, backend log dashboards | **Open** |

### Verified evidence

- All seven relational tables have RLS enabled.
- The Supabase Security Advisor returned only the auth configuration warning: **leaked password protection disabled**. This feature's availability depends on the Supabase plan.
- Performance Advisor reported five **unused indexes**; this is expected in a database currently holding only a few records and **not** a reason to remove appropriate planned indexes prematurely.
- Data sampled: **4 projects, 4 tasks, 1 sprint, 3 time entries**, 0 subtasks. The historic \`shipit_workspaces\` record remains.
- \`shipit_save_v8\` was exercised as authenticated caller inside an explicit \`BEGIN ... ROLLBACK\` transaction. It incremented the trial revision, preserved unchanged task/time-entry row versions (\`xmin\`), and left production counts/revision unchanged after rollback.
- Anonymous role **cannot execute** the v8 save RPC. Its security mode is \`SECURITY INVOKER\`, not \`SECURITY DEFINER\`.
- Live browser signup/sync and multi-device E2E are **not** yet verified. Unit test and CI success must not be interpreted as evidence of them.

## Architecture target

\`\`\`text
Next.js App Router (Node hosting; request-time auth, SSR where useful)
   ├─ (auth): login / register / recovery / callback
   ├─ (workspace): server layout + authorized queries
   │    └─ feature modules: tasks, planning, sprints, time, reports
   ├─ domain: validation schemas, use cases, rules
   ├─ data access: server/client Supabase adapters + repositories
   └─ operations: logging, tracing, metrics, audit
Supabase Auth → Postgres (RLS per user; multi-tenant only with proper membership table)
   ├─ projects ── tasks ── subtasks
   ├─ sprints ──┘
   ├─ time_entries; active_timers
   ├─ task_events (append-only), sprint_baselines (new)
   └─ sync revision / outbox (only if needed)
\`\`\`

**Current static hosting is not inherently insecure**: Supabase JWT and RLS enforce data access. However static export cannot protect page HTML at request time, set server security headers itself, or run Server Actions. Do not add a service-role secret to browser code.

**Avoid speculative infrastructure:** no Redis/Kafka/microservices are needed for 4 tasks. Start with a modular monolith, observed data access patterns, then choose per-entity APIs and pagination when needed.

## Proposed feature-folder structure

\`\`\`text
src/
  app/(auth)/login/page.tsx
  app/(auth)/register/page.tsx
  app/(workspace)/layout.tsx
  app/(workspace)/tasks/page.tsx
  app/(workspace)/sprints/page.tsx
  features/
    auth/{api,ui,hooks}/
    tasks/{api,domain,ui,tests}/
    planning/{domain,ui,tests}/
    sprints/{api,domain,ui,tests}/
    time-tracking/{api,domain,ui,tests}/
    insights/{queries,ui,tests}/
  shared/{ui,lib,types,config}/
supabase/migrations/
supabase/tests/
e2e/
\`\`\`

Each feature owns its domain validation, data access and UI. Do not turn one 20K-character component into a "god context". Use schema validation (e.g. Zod) at the network boundary; TypeScript only validates at compile-time.

## Delivery plan and definition of done

### Release gate — P0 (before wider beta)
1. Validate v8 save against a **separate staging user/database**, including create/edit/delete and conflict (two concurrent sessions), and verify one-user RLS cannot read/write another user's data.
2. Test login, registration, confirmation, password reset and logout via Playwright against staging Supabase.
3. Test close/reload/offline during a pending write: UI must not claim "saved" before DB confirmation; users can recover their edits.
4. Provide user-visible safe backup export, server backup and a tested recovery procedure. Define RPO and RTO.
5. Enable custom SMTP and correct redirect URL allow-list for genuine production onboarding.

### Engineering guardrails — P1 (first public release)
1. Commit \`package-lock.json\`; replace \`npm install\` with \`npm ci\`. Establish Dependabot/Renovate and dependency/security checks.
2. GitHub branch protection: PR reviews, required typecheck, unit, integration, E2E checks. Separate preview/staging/prod, migration review, rollback.
3. Centralize error reporting and tag release SHA. Define operational SLOs (for example: successful save rate and p95 save latency) and alert thresholds from measured baseline.
4. Cross-account isolation tests; RLS tests for create/update/delete; rate-limit/auth abuse testing; enabled leak-password protection if available.
5. Add \`updated_at\` and optional version columns where per-record conflict resolution becomes necessary; do not over-index before \`EXPLAIN ANALYZE\` measurements.

### Product scalability — P2
1. Replace full-snapshot network payload with per-entity mutation endpoints and idempotency keys.
2. Introduce query-based data loading, pagination and TanStack Query key conventions. Keep timer updates isolated so they do not rerender the entire dashboard every second.
3. For reliable burndown, store \`task_status_events\`, \`sprint_commits\` or \`sprint_baselines\` rather than reverse-engineering history from current statuses.
4. Add time-entry immutability/audit semantics and explicit deletion/retention policy for billing-grade reporting.
5. Consider team/workspace memberships only after requirements for collaboration and invitation/access revocation are concrete.

## Acceptance tests

- **Security:** user A cannot access user B's projects/tasks/time (read or write), even with guessed IDs.
- **Durability:** after 100 repeated edits to the same task, DB has one task row and all associated subtask IDs persist.
- **Concurrency:** one of two updates based on the same revision fails with a surfaced conflict, never silently overwrites.
- **Reliability:** forced network failure produces a bounded retry/backup path and never displays "Synced" for unsaved state.
- **Integrity:** removing task A does not remove unrelated time logs; project and sprint FKs remain valid.
- **Ops:** release SHA traceable to CI, deployment, migration and monitoring dashboard; staging release tested before production promotion.

## Rollback

- Old \`shipit_save_v7\` and \`shipit_workspaces\` remain while the new RPC is evaluated.
- **Caution:** \`shipit_workspaces\` is a snapshot taken before the normalized migration, so restoring from it will discard any later edits. Do not use it as a point-in-time backup.
- If an incident occurs: stop new writes, export current relational data, compare revisions, decide whether to roll back application only or both app/data, and verify restore in staging first.

## Useful references

- https://nextjs.org/docs/app/guides/production-checklist
- https://nextjs.org/docs/app/guides/static-exports
- https://supabase.com/docs/guides/deployment/going-into-prod
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/password-security
