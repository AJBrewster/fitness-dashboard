# Fitness Dashboard

<!-- TODO milestone 4: CI badge goes here once .github/workflows/ci.yml exists:
[![CI](https://github.com/AJBrewster/fitness-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/AJBrewster/fitness-dashboard/actions/workflows/ci.yml)
-->

A dashboard for Garmin activity data — summary stats, weekly distance trends,
and filtering — built as a testing-first portfolio project.

> 🚧 **In progress.** See [PLAN.md](PLAN.md) for milestones and current status.

<!-- TODO milestone 8: screenshot here -->

## Why fixture data instead of the Garmin API

The app reads from a committed `src/data/activities.json` fixture rather than
calling Garmin's (partner-gated) API. This is a deliberate design choice, not
a shortcut: deterministic data means the test suite can't flake on network
conditions or account state, so CI results are trustworthy. All data access
goes through a single interface (`src/lib/data.js`), so live sync can be
added later as a second implementation without touching the components or
the tests.

The committed fixture is a small set of synthetic activities, not real
Garmin data — kept that way so the repo is safe to publish and runs
identically for anyone who clones it. (A real, one-time Garmin data snapshot
exists locally for development but is gitignored and never shipped — see
`PLAN.md`'s Data strategy if you're curious about the full reasoning.)

## Testing approach

- **Unit tests (Vitest)** cover the calculation logic — totals, weekly
  rollups, filters — which lives in pure functions in `src/lib/stats.js`,
  deliberately separated from React components so the math is testable without
  rendering anything.
- **E2E tests (Playwright)** cover the UI, tagged in two layers: `@smoke`
  (loads, summary renders, chart renders) runs on every push; the full set
  (filter interactions, empty states) runs on demand. Same smoke/regression
  layering used in production test suites.
- **CI (GitHub Actions)** runs unit tests, the build, and the Playwright smoke
  set on every push, and uploads the Playwright HTML report as an artifact.

## Running locally

```bash
npm install
npm run dev        # dashboard at localhost:5173
npm test           # unit tests (Vitest)
```

*(`npm run test:e2e` lands with Playwright in milestone 6 — not wired up yet.)*

## Stack

React + Vite · Recharts · JavaScript · Vitest · Playwright · GitHub Actions
