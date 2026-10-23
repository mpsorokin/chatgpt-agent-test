# Ship It 4.0 ✦

A fast, private productivity workspace built with **Next.js 16, React 19 and TypeScript**.

**Live:** https://mpsorokin.github.io/chatgpt-agent-test/

## Features

- Dashboard with live activity, priority queue, project progress and a seven-day task chart
- Kanban board with drag-and-drop and accessible status dropdowns
- Searchable and sortable list, monthly calendar, and analytics
- Tasks with projects, deadlines, priorities, notes and subtasks
- Focus timer (25/5/15 minutes), keyboard shortcuts and command menu
- Dark mode, responsive design, JSON backup and restore
- **Automatic migration** of v1, v2 and v3 localStorage data, preserving tasks, projects, descriptions and checklists
- No login, remote API, database, tracking, or required backend

## Stack and structure

- Next.js App Router with static export (`output: 'export'`)
- React 19 client components, TypeScript and CSS
- Pure, testable domain logic in `lib/`
- `components/` for views, task editor and focus timer
- `tests/` with Vitest unit tests for migrations and task state
- GitHub Actions for type checking, testing and GitHub Pages deployment

## Develop

```bash
npm install
NEXT_PUBLIC_BASE_PATH='' npm run dev
npm run typecheck
npm test
npm run build
```

By default the app is configured to deploy under `/chatgpt-agent-test` so that GitHub Pages keeps the original URL. To serve at `/` on a different host, set `NEXT_PUBLIC_BASE_PATH=''` for the build.

> `NEXT_PUBLIC_BASE_PATH` is embedded at build time. Set it consistently for development and production.

## Persistence and privacy

Everything is stored in browser `localStorage` under `ship-it:workspace:v4`. Earlier values under `chatgpt-agent-test:tasks:v1`, `v2` and `v3` are read on first load and migrated. Existing legacy keys are **not deleted**.

Data stays in the current browser, so different devices do not sync automatically. Use **Export backup** and **Import** to move data. Import replaces the workspace only after confirmation.

## Deployment

On every push to `main`, `.github/workflows/deploy.yml` installs dependencies, typechecks, runs tests, builds the static export, and publishes the `out/` directory through GitHub Pages.

This is a fully static Next.js application: features that require a Node server (API routes with runtime handlers, server actions, server-side auth, ISR) are intentionally excluded.
