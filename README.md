# Ship It 3.0 🚀

An elegant, fully client-side productivity workspace created and deployed directly from a ChatGPT conversation.

**[Open the live app](https://mpsorokin.github.io/chatgpt-agent-test/)** · [Source code](./index.html)

## What's new in v3

- **Dashboard:** daily momentum, task statistics, a priority queue, and a seven-day due-date chart.
- **Kanban board:** drag and drop tasks between To do, In progress, and Done.
- **Projects:** create projects, filter tasks by project, and follow progress.
- **Task editor:** create, edit, complete, and delete tasks; add descriptions, priorities, deadlines, and subtasks.
- **All tasks:** searchable, sortable list of work across projects.
- **Calendar:** a monthly view of upcoming deadlines.
- **Insights:** completion rate, project breakdown, priority distribution, and a chart of recently completed tasks.
- **Focus mode:** a timer with 25-, 5-, and 15-minute sessions, pause, and reset.
- **Command menu:** press `Ctrl+K` or `⌘K` for actions and navigation. Press `N` to add a task and `/` to search.
- **Dark mode**, **responsive layouts**, and **JSON export/import**.

## Data and migration

Data is stored locally in your browser using `localStorage`. There are no accounts, analytics, remote servers, or synchronization. **Export a JSON backup** to move tasks to another device.

Existing tasks from v1 and v2 are automatically migrated on first use of v3 in the same browser. Your original browser data is not deleted.

> Note: imported completed tasks without historical completion timestamps count toward overall completion metrics, but are not retroactively included in the seven-day completion history.

## Run locally

Clone the repository and open `index.html` in a browser:

```bash
git clone https://github.com/mpsorokin/chatgpt-agent-test.git
cd chatgpt-agent-test
```

No frontend dependencies, build steps, or backend are needed. Web fonts are optional, with system font fallbacks.

## Deployment

GitHub Pages automatically publishes new commits to the `main` branch via [GitHub Actions](./.github/workflows/deploy.yml).

## About

This repository is an experiment in creating, updating, and deploying real code using ChatGPT's GitHub integration rather than a local coding agent.
