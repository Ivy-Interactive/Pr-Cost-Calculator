# PR Cost Calculator

A static frontend app that estimates development and AI token costs per pull request.

## Features

- Submit any public GitHub repository
- Select a contributor and enter salary / token spend
- View charts of PR stats, denial rate, and cost per PR over the last 5 months
- 14-day rolling averages for all metrics
- Monthly breakdown table

## Getting Started

```bash
pnpm install
pnpm run dev
```

## Build & Deploy

The app deploys automatically to GitHub Pages on push to `main`.

```bash
pnpm run build   # Production build to dist/
```

## Tech Stack

- React + TypeScript (Vite)
- Chart.js + react-chartjs-2
- date-fns
- GitHub REST API (client-side, no backend)
