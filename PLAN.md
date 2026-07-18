# Project Plan — Fitness Dashboard

SDET portfolio project: a Garmin fitness dashboard that proves feature coding,
proper testing, and modern CI in one artifact. Deliberately small — milestone 6
finished beats milestone 12 half-done.

## Working agreement

Built pairing with Claude Code, with one hard rule: **nothing gets committed
until Alex can explain every line to an interviewer.** Claude may draft;
Alex reviews, modifies, and owns the result. Core logic (`lib/stats.js`) and
tests get written by Alex first, then reviewed — that's the code interviews
probe.

## Scope (v1)

- Load Garmin activity data (from a committed fixture — see data strategy)
- Summary: total distance, time, activity count, streak
- One chart: weekly distance over time
- One filter: activity type or date range

**Out of scope for v1:** auth, database, deployment, mobile, live Garmin sync,
multi-user.

## Data strategy

1. **Now:** committed `src/data/activities.json` fixture, converted once from a
   Garmin Connect CSV export. Deterministic data → deterministic tests in CI.
2. **Always:** components never import the fixture directly. All data flows
   through `src/lib/data.js`, even while it's three lines long.
3. **Post-v1:** live Garmin sync becomes a second implementation behind that
   same interface. We do not touch Garmin's API before v1 ships.

## Stack

React + Vite · Recharts · JavaScript · Vitest (unit) · Playwright (e2e) ·
GitHub Actions. Node v21 locally.

## Milestones

Each leaves the repo working and committable. Sessions are ~1–2 hours.

- [x] **0. Repo setup** — git init, plan, README skeleton, pushed public
- [ ] **1. Vite app + fixture** — blank app runs, `activities.json` committed, data loads via `lib/data.js`
- [ ] **2. `stats.js` + unit tests** — totals, weekly rollup, filters as pure functions; Vitest passing incl. edge cases (empty data, single activity, missing fields)
- [ ] **3. Summary component** — real numbers on screen
- [ ] **4. GitHub Actions CI** — unit tests + build on every push, green badge on README *(early on purpose)*
- [ ] **5. Chart** — weekly distance renders
- [ ] **6. Playwright smoke tests** — `@smoke`-tagged e2e passing in CI ← **minimum viable portfolio piece**
- [ ] **7. Filters + tests** — filtering updates summary and chart, covered at both levels
- [ ] **8. README polish** — screenshot, testing rationale, linkable in applications

## Test plan

- **Unit (Vitest):** the math in `stats.js` — totals, weekly bucketing, filter
  subsets, edge cases.
- **E2E (Playwright):** `@smoke` = loads, summary renders, chart renders; full
  set adds filter interactions and empty state. Smoke runs on every push, full
  set on demand — same layering as a real regression suite.

## Stretch (only after 1–8)

Live Garmin sync behind `lib/data.js` · deploy + link · visual regression
(Playwright screenshots) · axe accessibility checks in CI · pace/HR charts.

## Definition of done (v1)

- [ ] Public GitHub repo
- [ ] Dashboard renders real Garmin data
- [ ] Unit tests on data logic
- [ ] Playwright e2e, smoke-tagged
- [ ] CI running on push, badge green
- [ ] README with screenshot + testing rationale
- [ ] Link on LinkedIn profile

## Known failure modes (watch for these)

1. Fighting Garmin's API before the dashboard exists — banned until post-v1.
2. Building too much and abandoning it — ship milestone 6, then decide.
3. Using this project to postpone sending applications — it supports
   applications, it doesn't replace them.
