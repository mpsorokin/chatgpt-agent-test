# Ship It 5.0 ✦

A fast, private productivity workspace built with **Next.js 16, React 19.3.1 and TypeScript**.

**Live:** https://mpsorokin.github.io/chatgpt-agent-test/

## Features

- **React 19.3.1** (latest stable as of October 23, 2026)
- **Gantt & planning:** start/due dates, estimates, task scheduling, multi-week timeline and sprint assignments
- **Sprints:** iteration goals, start/close/reopen, backlog commitment, task completion metrics and ideal vs actual burndown
- **Delivery analytics:** historical completion throughput, sprint velocity, lead time, overdue tasks, estimates vs logged time by project
- **Backward-compatible storage:** tasks and time logs from previous releases are preserved through optional planning fields and sprint data


- Dashboard with live activity, priority queue, project progress and a seven-day task chart
- Kanban board with drag-and-drop and accessible status dropdowns
- Searchable and sortable list, monthly calendar, and analytics
- Tasks with projects, deadlines, priorities, notes and subtasks
- Focus timer (25/5/15 minutes), keyboard shortcuts and command menu
- **Toggl-inspired time tracking:** one-click task timers, independent general-work timers, automatic session recording and persistence across reloads
- **Time reports:** project/activity breakdown, seven-day activity chart, date-range filters, tracked-time KPIs, CSV export and manual time entries
- **Time data in JSON backup:** restore both tasks and completed sessions, with separate localStorage storage for time records
- Dark mode, responsive design, JSON backup and restore
- **Automatic migration** of v1, v2 and v3 localStorage data, preserving tasks, projects, descriptions and checklists
- No login, remote API, database, tracking, or required backend

## Stack and structure

- Next.js App Router with static export (`output: 'export'`)
- React 19 client components, TypeScript and CSS
- Pure, testable domain logic in `lib/`
- `components/` for views, task editor, focus timer, time tracking panel and persistence hook
- `tests/` with Vitest unit tests for migrations, task state, timers and reports
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

Everything is stored in browser `localStorage`: tasks and projects under `ship-it:workspace:v4`, timer and time entries under `ship-it:time:v1`. Earlier values under `chatgpt-agent-test:tasks:v1`, `v2` and `v3` are read on first load and migrated. Existing legacy keys are **not deleted**.

Data stays in the current browser, so different devices do not sync automatically. Use **Export backup** and **Import** to move data. Import replaces the workspace only after confirmation.

## Deployment

On every push to `main`, `.github/workflows/deploy.yml` installs dependencies, typechecks, runs tests, builds the static export, and publishes the `out/` directory through GitHub Pages.

This is a fully static Next.js application: features that require a Node server (API routes with runtime handlers, server actions, server-side auth, ISR) are intentionally excluded.

## Time tracking notes

- Clicking the play button next to a task starts a timer associated with that task. Starting a different timer automatically saves the earlier time entry.
- Active timers store an absolute start timestamp and continue to accrue elapsed time after a page reload. If the browser was closed while running, reopening it resumes the elapsed display until you stop the timer.
- Reports count **completed time entries**; running time is displayed separately until stopped.
- Time logs capture task and project names at recording time, so entries survive subsequent task deletion or renaming.
- The Pomodoro focus timer is separate and does not automatically count as tracked work. To log work, start the task timer.
- CSV exports respect the current report date range. Complete JSON workspace backups include time-tracking state.
- All information is local to this browser: no sync, server-side invoicing, background services, or account integration.

## Release 5.0: Planning model

The sprint and planning data is saved with tasks in the existing `ship-it:workspace:v4` browser storage key (schema is backward compatible). Existing tasks without schedules remain unscheduled and can be assigned through **Gantt & planning**. Sprint completion charts use currently retained task statuses and completion timestamps, rather than an event history. The Gantt is a scheduling visualization, not an automatic critical-path or dependency solver.
