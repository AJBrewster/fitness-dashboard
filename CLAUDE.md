# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repo is at **Milestone 1** (Vite + React app scaffolded, `activities.json` fixture committed, data loads through `src/lib/data.js` — see `PLAN.md`). `stats.js` and its Vitest suite (Milestone 2) don't exist yet.

```bash
npm install
npm run dev        # dashboard at localhost:5173
npm run build       # production build
```

`npm test` (Vitest) and `npm run test:e2e` (Playwright) aren't wired up yet — the packages are installed ahead of schedule, but no test files or scripts exist until Milestones 2 and 6.

Check milestone checkboxes in `PLAN.md` to see what's actually built before assuming a command exists.

## Working agreement (read this before writing code)

This is Alex's SDET portfolio project — the point is proving *Alex* can build application code, not just test it. That constrains how Claude should help:

- **Nothing gets committed until Alex can explain every line to an interviewer.** Claude may draft, but Alex reviews, modifies, and owns the result. This now includes `src/lib/stats.js` and its Vitest suite (updated 2026-07-22 — Claude used to be barred from drafting this file specifically, since it's the code interviewers are most likely to probe; that restriction is dropped, but the "explain every line" bar still applies to it).
- Work in milestone-sized increments (`PLAN.md`), each leaving the repo in a working, committable state.

## Architecture

**Data flow is fixture-first by deliberate design, not a shortcut:**

- `src/data/activities.json` — committed fixture, a one-time snapshot of 100 real activities pulled via the `garmin` MCP server (not a CSV export, but same effect: a static file, not a live call). Deterministic data means the test suite can't flake on network conditions, so CI results stay trustworthy. Activity names are genericized (real place names stripped, `owner_display_name` dropped) since this repo is public — see `PLAN.md`'s Data strategy for the exact rule.
- `src/lib/data.js` — the *only* module allowed to read the fixture. Components never import `activities.json` directly. This is the seam where live Garmin sync gets added post-v1 as a second implementation behind the same interface — don't touch Garmin's real API before v1 ships.
- `src/lib/stats.js` — pure functions only (totals, weekly rollup, filters), deliberately separate from React components so the math is testable without rendering anything.

## Scope discipline (v1)

In scope: load fixture data, summary stats (distance/time/count/streak), one weekly-distance chart (Recharts), one filter (activity type or date range).

Explicitly out of scope until v1 ships: auth, database, deployment, mobile, live Garmin sync, multi-user. Don't add these even if asked to "improve" the project — they're deferred on purpose (see "Known failure modes" in `PLAN.md`).

## Test strategy

- **Unit (Vitest):** all of `stats.js` — totals, weekly bucketing, filter subsets, edge cases (empty data, single activity, missing fields).
- **E2E (Playwright):** two tiers via tags. `@smoke` (loads, summary renders, chart renders) runs on every push in CI. The full set (filter interactions, empty states) runs on demand — mirrors smoke/regression layering in a production suite.
- CI (GitHub Actions, added milestone 4 deliberately early) runs unit tests + build + Playwright smoke on every push.

## Stack

React + Vite · Recharts · JavaScript (not TypeScript) · Vitest · Playwright · GitHub Actions · Node v21.
