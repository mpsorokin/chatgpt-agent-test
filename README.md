# Ship It 🚀

A modern, responsive productivity dashboard built entirely through a ChatGPT conversation and committed directly to GitHub.

**[Open the live app](https://mpsorokin.github.io/chatgpt-agent-test/)** · [View the source](./index.html)

## What's new in v2

- **Dashboard:** summary cards for total, completed, and active tasks.
- **Task management:** add, edit, complete, delete, and restore deleted tasks (Undo).
- **Organize:** high/medium/low priorities, categories, optional due dates and notes.
- **Views:** Overview, Today (including overdue items), Upcoming, Completed.
- **Find tasks:** search by title, category, or notes; sort by priority, date, or title.
- **Focus mode:** a 25-minute timer with pause and reset.
- **Week at a glance:** chart of due tasks for the next seven days, based on your actual data.
- **Themes:** light and dark mode, with your choice saved.
- **Data portability:** export to JSON, import a JSON backup.
- **Keyboard shortcuts:** `N` creates a task; `/` focuses search (when you're not typing).
- **Responsive layout:** works on both desktop and mobile.

No backend, no account, no tracking, and no frontend build required.

## Run locally

Clone the project and open `index.html` in a browser.

```bash
git clone https://github.com/mpsorokin/chatgpt-agent-test.git
cd chatgpt-agent-test
```

## Where is data stored?

Tasks and the color theme are saved locally in your browser using `localStorage`. Data does **not** sync across devices. Use **Export your tasks** to back up your data or migrate it to another browser.

On first load, the app shows three editable example tasks. If you used the original v1 app, the v2 app will automatically migrate the existing tasks in that browser instead.

Importing a backup replaces your existing tasks after confirmation.

## Deployment

GitHub Pages is deployed automatically from the `main` branch by [the GitHub Actions workflow](./.github/workflows/deploy.yml).

## Why this repo exists

It's an experiment in building and deploying a working project using ChatGPT's GitHub integration directly, including commits and GitHub Actions — without a local coding agent.
