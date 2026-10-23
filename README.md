# Ship It 6.1 — routed Next.js App Router

[Live application](https://mpsorokin.github.io/chatgpt-agent-test/) · [Supabase project](https://supabase.com/dashboard/project/nzoswtawxjjpnuygpska)

## Routes

```
app/
  layout.tsx                      # global metadata / styles
  page.tsx                        # signed-in redirect → /dashboard, else /login
  not-found.tsx
  (auth)/
    layout.tsx
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    auth/callback/page.tsx
  (workspace)/
    layout.tsx                    # shared client session / workspace shell
    dashboard/page.tsx
    board/page.tsx
    tasks/page.tsx
    calendar/page.tsx
    insights/page.tsx
    time-tracking/page.tsx
    planning/page.tsx
    sprints/page.tsx
components/
  auth/auth-form.tsx             # reusable auth screen
  auth/auth-redirect.tsx
  workspace-app.tsx              # persistent workspace layout / state
  workspace-context.tsx          # typed state shared by routed pages
  workspace-view.tsx             # route-to-feature composition
  use-cloud-workspace.ts         # optimistic revision-protected sync
lib/
  routes.ts                      # typed route mapping / email redirects
  supabase.ts
  workspace.ts
  planning.ts
  storage.ts                     # legacy read-only browser migration
```

## Authentication and account recovery

- Supabase Auth email/password sign-in and registration, email confirmations, reset-password emails and password updates.
- Signup email redirects to `/auth/callback/`; password recovery emails redirect to `/reset-password/`. The browser handles the Supabase session.
- Unauthenticated workspace visits redirect to `/login/`. Authenticated visitors entering `/login/` are redirected to `/dashboard/`.
- Shared workspace layout stays mounted during client-side route navigation; task state and active timers don't reset as the user moves between pages.
- Private data is always fetched through Supabase with **per-user RLS** on `public.shipit_workspaces`.
- Cloud state no longer mirrors all authenticated data to a common unscoped browser localStorage key. Old browser data is read *only* for explicit first-time import.
- Optimistic revision check and serialized writes prevent overlapping writes from silently overwriting previous updates. Same-workspace simultaneous edits are not yet merged automatically.

## Production Supabase configuration REQUIRED

In the [Auth URL Configuration](https://supabase.com/dashboard/project/nzoswtawxjjpnuygpska/auth/url-configuration) set:

**Site URL**:
`https://mpsorokin.github.io/chatgpt-agent-test/`

**Redirect allow-list**:
```
https://mpsorokin.github.io/chatgpt-agent-test/auth/callback/
https://mpsorokin.github.io/chatgpt-agent-test/reset-password/
http://localhost:3000/**
```

Confirm the Email provider is enabled and configure SMTP for reliable production mail.

## Deployment and hosting constraint

This project still deploys via **Next.js static export** to GitHub Pages with `basePath: '/chatgpt-agent-test'`. It has genuine App Router pages, but **does not run a Next.js server**. This means auth gating is client-side and the database, not middleware, enforces access control. This is safe for the current Supabase RLS-backed data model but is **not** equivalent to SSR session protection, server actions, or server route handlers.

For full server-side production auth / protected SSR, move the deployment to Vercel or another Next.js Node-capable host and adopt `@supabase/ssr` (server/client creators, cookie handling, request-time checks). Do not attempt to add middleware/route handlers to GitHub Pages static export.

The Supabase browser key in `lib/supabase.ts` is a **publishable** key; it is not a secret. Never include a service-role/secret key in client code.

## Development

```bash
npm install
NEXT_PUBLIC_BASE_PATH='' npm run dev
npm run typecheck
npm test
npm run build
```

The project retains the existing tasks, Kanban, Gantt, sprint planning, time tracking, analytics, and JSON backup support.

## Verification

CI checks TypeScript, Vitest and the production static output of every route. Complete real-email, cross-browser and password-reset E2E testing remains to be performed with a test account.

## Confirmation emails redirecting to localhost / expired OTPs

If Supabase emails redirect to `http://localhost:3000/#error=access_denied&error_code=otp_expired`, the application code cannot fix the project's hosted Auth settings. In Supabase Dashboard → Authentication → URL Configuration, set the production **Site URL** to:

```text
https://mpsorokin.github.io/chatgpt-agent-test/
```

Allow these exact **Redirect URLs** (trailing slashes are important):

```text
https://mpsorokin.github.io/chatgpt-agent-test/auth/callback/
https://mpsorokin.github.io/chatgpt-agent-test/reset-password/
```

If custom email templates use `{{ .SiteURL }}` for their direct app links, update them to use `{{ .RedirectTo }}` (or the default `{{ .ConfirmationURL }}` for Supabase-generated verification URLs).

Old single-use expired URLs cannot be repaired. Visit `/resend-confirmation/`, enter the original email address, then click the newest link only once. `/auth/callback/` now displays clear auth-token errors and a resend action instead of an indefinite loading state. Email-scanner link prefetching can also consume verification URLs: use OTP-based templates or a click-to-confirm landing page when necessary.
