# Ship It release / rollback playbook

The pipeline now runs npm ci (committed package-lock), Vitest, Playwright Chromium on a **mock Supabase API**, TypeScript and static export validation. Pull requests run these checks without deployment. A separate security workflow runs a production dependency audit. Dependabot proposes updates.

## Operational procedures

**Before publishing**: review any database migration and test it in a dedicated staging Supabase project with distinct publishable key and URL. Include real-email auth, cross-account RLS and multi-tab optimistic concurrency scenarios. A mocked browser test is not a substitute for a real Supabase integration test.

**When writes fail**: The browser keeps an unsaved draft in per-user sessionStorage. On reload, choose Restore if revisions match; if cloud version changed, download JSON for manual reconciliation. This is intentionally not an offline-first synchronization engine, and sessionStorage might not survive complete browser shutdown.

**Backup**: Use in-app JSON Export before migration/maintenance. For disaster recovery configure automatic Supabase database backup / PITR (depending on paid plan), or encrypted pg_dump to an independently secured location. Never publish database dumps as GitHub Actions artifacts, and never store DB credentials in this repository. Verify restoration in staging and document expected RPO / RTO.

**Rollback**: GitHub Pages deployment can be reverted by redeploying an older commit. Database migrations should be backward-compatible and shipped before client changes. The legacy `shipit_workspaces` JSONB row is stale; it is *not* a live backup. Before rollback, confirm the old RPC and new schema are compatible and export relational data.

**Hosting limitation**: GitHub Pages runs static Next.js export only, so real server components/headers/server middleware require migration to Vercel or equivalent Node hosting. Supabase RLS protects data access in the present browser-centric architecture.

**External administrator actions**: Configure SMTP, email redirects, leaked-password protection if offered, auth CAPTCHA and MFA for administrator accounts, branch protection / required checks, staging project, and backup retention in their respective dashboards.

## SLO proposals (not yet instrumented)

- Acknowledged write success rate >= 99.9% over 30 days.
- p95 sync latency < 2 s in typical use.
- Auth sign-in success and email delivery monitored separately.
- No failed cross-tenant read/write tests in staging.
- Restore rehearsal quarterly.

Metrics above are proposed targets, **not measured or guaranteed**. Implement a hosted monitoring/alerting service before a public paid release.
