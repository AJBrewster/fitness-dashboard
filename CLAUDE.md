# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repo is at **Milestone 4** (Vite + React app scaffolded, fixture wired through `src/lib/data.js`, `src/lib/stats.js` + Vitest suite passing, `Summary` component rendering real distance/time/activity-count numbers, GitHub Actions CI running unit tests + build on push — see `PLAN.md`). `getTotals` still doesn't include `streak` even though it's in the v1 Scope, so `Summary` doesn't show one — flagged as a known gap, not silently done. No chart yet (Milestone 5), no Playwright yet (Milestone 6, not in CI yet either).

```bash
npm install
npm run dev        # dashboard at localhost:5173
npm run build       # production build
npm test            # unit tests (Vitest)
```

`npm run test:e2e` (Playwright) isn't wired up yet — that lands in Milestone 6.

Check milestone checkboxes in `PLAN.md` to see what's actually built before assuming a command exists.

## Working agreement (read this before writing code)

This is Alex's SDET portfolio project — the point is proving *Alex* can build application code, not just test it. That constrains how Claude should help:

- **Nothing gets committed until Alex can explain every line to an interviewer.** Claude may draft, but Alex reviews, modifies, and owns the result. This now includes `src/lib/stats.js` and its Vitest suite (updated 2026-07-22 — Claude used to be barred from drafting this file specifically, since it's the code interviewers are most likely to probe; that restriction is dropped, but the "explain every line" bar still applies to it).
- **Docs stay in sync every milestone.** Before each commit, update this file, `PLAN.md`, and `README.md` to match what's actually built — not batched up later. A stale doc actively misleads the next session (including Claude).
- Work in milestone-sized increments (`PLAN.md`), each leaving the repo in a working, committable state.

## Architecture

**Data flow is fixture-first by deliberate design, not a shortcut:**

- `src/data/activities.json` — the committed fixture `lib/data.js` actually reads: 14 small, hand-written synthetic activities covering all activity types plus some `null` HR/calories fields. Deterministic and safe to publish.
- `src/data/activities.local.json` — **gitignored, not committed.** A one-time snapshot of 100 real activities pulled via the `garmin` MCP server, kept at a different filename on purpose so a local swap can't accidentally get committed as a change to the tracked fixture path. Optional richer dataset for local dev only — don't point `lib/data.js` at it in a commit. See `PLAN.md`'s Data strategy for the full reasoning and the name-genericization rule applied to it.
- `src/lib/data.js` — the *only* module allowed to read the fixture. Components never import `activities.json` directly. This is the seam where live Garmin sync gets added post-v1 as a second implementation behind the same interface — don't touch Garmin's real API before v1 ships.
- `src/lib/stats.js` — pure functions only (totals, weekly rollup, filters), deliberately separate from React components so the math is testable without rendering anything.
- `src/components/Summary.jsx` — presentational only: takes a `totals` prop (the object `getTotals()` returns) and formats/renders it. Doesn't call `getActivities`/`getTotals` itself — `App.jsx` computes `totals` and passes it down, keeping the component testable with fake props later without needing the fixture.

## Scope discipline (v1)

In scope: load fixture data, summary stats (distance/time/count/streak), one weekly-distance chart (Recharts), one filter (activity type or date range).

Explicitly out of scope until v1 ships: auth, database, deployment, mobile, live Garmin sync, multi-user. Don't add these even if asked to "improve" the project — they're deferred on purpose (see "Known failure modes" in `PLAN.md`).

## Test strategy

- **Unit (Vitest):** all of `stats.js` — totals, weekly bucketing, filter subsets, edge cases (empty data, single activity, missing fields).
- **E2E (Playwright):** two tiers via tags. `@smoke` (loads, summary renders, chart renders) runs on every push in CI. The full set (filter interactions, empty states) runs on demand — mirrors smoke/regression layering in a production suite. Not implemented yet (Milestone 6).
- **CI (GitHub Actions, `.github/workflows/ci.yml`, added milestone 4 deliberately early):** currently `npm ci` + `npm test` + `npm run build` on push/PR to `main`, using Node 20 in the runner (not the local Node v21.6.1 — sidesteps the `styleText`/`rolldown` gotcha below entirely, though `vitest` is pinned regardless). Playwright smoke joins this pipeline in Milestone 6.

## Stack

React + Vite · Recharts · JavaScript (not TypeScript) · Vitest · Playwright · GitHub Actions · Node v21.

**Gotcha:** the local Node (v21.6.1) predates `node:util`'s `styleText` export, which `vitest@4`/latest `create-vite` depend on via `rolldown` — both fail at startup on this machine. `vitest` is pinned to `^2.1.9`. Check Playwright's Node requirement before installing it in Milestone 6.
