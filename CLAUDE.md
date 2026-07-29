# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**All 8 v1 milestones are done** (see `PLAN.md` for the full history). Two Definition-of-Done items remain genuinely open, not coding tasks: whether the synthetic committed fixture satisfies "renders real Garmin data," and the LinkedIn link (Alex's own task).

**Now in a post-v1 phase (started 2026-07-29): expanding the data layer ahead of a redesign.** Sleep score, activity-type breakdown, heart rate, VO2 max, body battery, weight, stress, and training readiness/status were added to `lib/data.js`/`stats.js` — **data + tests only, deliberately no new UI yet** (that's the redesign's job). See Architecture below for the new fixtures and functions.

```bash
npm install
npm run dev             # dashboard at localhost:5173
npm run build            # production build
npm test                 # unit tests (Vitest)
npm run test:e2e         # full Playwright suite
npm run test:e2e:smoke   # just the @smoke-tagged tests (what CI runs)
```

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
- `src/data/wellness.json` / `.local.json` — added 2026-07-29, same real-local/synthetic-committed pattern as `activities.json`. One record per day: sleep score, resting/avg/max heart rate, avg/max stress, body battery charged/drained, training readiness score, training status label, VO2 max. Real data (`.local.json`) covers 2026-07-15..2026-07-21 only (7 days) — the underlying Garmin endpoints for sleep/HR/stress/training-readiness/training-status are all per-day-only (no date-range param), so a wider window means proportionally more MCP calls.
- `src/data/vo2MaxTrend.json` / `.local.json` — added 2026-07-29. Sparser, longer-range VO2 max trend (real: 8 points spanning 2026-05-01..2026-07-21) — deliberately separate from `wellness.json`'s daily `vo2Max` field, since VO2 max updates gradually and a multi-month view is the more meaningful one; this endpoint does take a date range directly.
- `src/data/weighIns.json` / `.local.json` — added 2026-07-29. Date + weight in kg; real data has 25 measurements. Also takes a date range directly.
- `src/lib/data.js` — the *only* module allowed to read any fixture. Components never import a fixture JSON file directly. `getActivities()`/`getWellness()`/`getVo2MaxTrend()`/`getWeighIns()` all follow the same shape. This is the seam where live Garmin sync gets added post-v1 as a second implementation behind the same interface — don't touch Garmin's real API before that's a separate decision.
- `src/lib/stats.js` — pure functions only (totals, weekly rollup, filters), deliberately separate from React components so the math is testable without rendering anything.
  - `getTotals`'s `streak` field is the **longest run of consecutive calendar days with an activity in the given list** — not "current streak as of today." A "today"-relative streak would make assertions against the static fixture depend on the system clock, breaking the project's deterministic-testing design. Computed via a private `getDateKey`/`getStreak` pair (same file-private-helper pattern as `getWeekStart`); `getDateKey` uses local `getFullYear`/`getMonth`/`getDate` rather than `toISOString()`, deliberately avoiding the UTC day-shift risk that method carries in timezones ahead of UTC (see `getWeekStart`, which does use `toISOString()` — not fixed, since it works for the existing tests, but don't copy that pattern into new code).
  - `getActivityTypeBreakdown(activities)` — added 2026-07-29. Counts per activity `type`, sorted most-common-first. No new fixture needed — every activity already has a `type` field. Feeds the activity-type breakdown chart the redesign will add.
- `src/components/Summary.jsx` — presentational only: takes a `totals` prop (the object `getTotals()` returns) and formats/renders it. Doesn't call `getActivities`/`getTotals` itself — `App.jsx` computes `totals` and passes it down, keeping the component testable with fake props later without needing the fixture. Each stat's value span has a `data-testid` (`total-distance`, `total-duration`, `activity-count`, `streak`) — use those in Playwright, not positional selectors like `.summary-value:last-child`, which silently points at the wrong stat if another one gets added later (happened here when `streak` was added as a 4th stat).
- `src/components/WeeklyDistanceChart.jsx` — same pattern: presentational, takes a `weeklyDistance` prop (the array `getWeeklyDistance()` returns), converts meters to km for display, renders a Recharts `LineChart`. `App.jsx` computes and passes it down, same as `Summary`.
- `src/components/DateRangeFilter.jsx` — same pattern again: presentational, controlled by `start`/`end` state owned in `App.jsx` (`useState`, both `''` by default = unfiltered). `App.jsx` calls `filterByDateRange(activities, start, end)` before computing `totals`/`weeklyDistance`, so filtering flows through the same `stats.js` functions rather than duplicating logic in the component.
  - **Gotcha:** `<input type="date">` gives a bare `'YYYY-MM-DD'`, which `Date` parses as midnight. `App.jsx` appends `T23:59:59` to the "To" value before calling `filterByDateRange` so that day's activities aren't excluded — `filterByDateRange` itself is unchanged (its own tests already expected callers to pass an explicit end-of-day time for an inclusive boundary).
- `e2e/smoke.spec.js` — Playwright, tagged `@smoke` via the `{ tag: '@smoke' }` test option. Asserts against the exact values the committed synthetic fixture produces (e.g. "73.6 km", "3 days" streak, 5 weekly chart dots) via `page.getByTestId(...)` — coupled to `activities.json` on purpose, consistent with the project's fixture-first/deterministic-testing design. If the fixture changes, these assertions need updating too.
- `e2e/filters.spec.js` — Playwright, untagged (full suite only, not CI's `@smoke` run). Covers the date-range filter interaction: narrows to one week, clearing restores all 14, a no-match range zeroes out the summary and shows 0 chart dots, a partial (one-sided) range leaves activities unfiltered, and a single-day range narrows to exactly that day's one activity. Same fixture-coupling caveat as `smoke.spec.js`.
  - **Gotcha found here (now fixed via `data-testid`, see `Summary.jsx` above):** don't assert summary numbers via a page-wide `page.getByText(...)`. A filtered value can coincidentally match text Recharts renders elsewhere in the SVG (axis ticks, tooltip markup) and trip Playwright's strict-mode "multiple elements" error — hit this for real with "3.2 km" matching both the summary and a chart `<tspan>`. Also don't use positional selectors (`.summary-value.last()`) for the same reason `data-testid` was added — see the `streak`-as-4th-stat note above.
- `vite.config.js`'s `test.exclude` includes `e2e/**` — without it, Vitest's default glob picks up Playwright's `.spec.js` files and fails trying to run them with the wrong `test()`/`expect()` API. Found the hard way; keep this if either test file naming convention changes.

## Scope discipline (v1)

In scope: load fixture data, summary stats (distance/time/count/streak), one weekly-distance chart (Recharts), one filter (activity type or date range).

Explicitly out of scope until v1 ships: auth, database, deployment, mobile, live Garmin sync, multi-user. Don't add these even if asked to "improve" the project — they're deferred on purpose (see "Known failure modes" in `PLAN.md`).

v1 is done; the current post-v1 phase (see `PLAN.md`'s "Post-v1: expanded data" section) is scoped to **data + tests only, no UI** — don't add components/wire the new data into `App.jsx` unless explicitly asked, since that's meant to happen as part of the redesign, not before it.

## Test strategy

- **Unit (Vitest, 21 tests):** all of `stats.js` — totals, weekly bucketing, filter subsets, streak (longest-run logic, same-day dedup, unsorted input), activity-type breakdown, edge cases (empty data, single activity, missing fields).
- **E2E (Playwright):** two tiers via tags. `@smoke` (`e2e/smoke.spec.js`: loads, summary renders, chart renders — 3 tests) runs on every push in CI. The full set adds `e2e/filters.spec.js` (5 tests: basic filter, clear, empty-range/no-match, partial-range, single-day) — runs on demand only (`npm run test:e2e`), not in CI yet.
  - **Gotcha found while building the chart (Milestone 5), applied in the smoke test:** Recharts animates the line being drawn in on mount (~1.5s default). A screenshot/assertion taken too early sees only a partial path — looks exactly like a rendering bug (points 2+ appear disconnected) but isn't. The "chart renders" smoke test asserts `.recharts-line-dots circle` count instead of the line path, since dots are placed at final position immediately rather than animating in.
- **CI (GitHub Actions, `.github/workflows/ci.yml`, added milestone 4 deliberately early):** `npm ci` → `npm test` → `npm run build` → install Playwright's chromium → `npm run test:e2e:smoke` → upload the HTML report as an artifact (`if: always()`, so it uploads even on failure), on push/PR to `main`. Runs on Node 20 in the runner (not the local Node v21.6.1 — sidesteps the `styleText`/`rolldown` gotcha below entirely, though `vitest` is pinned regardless). Confirmed actually green on GitHub via `gh run list`, not just locally.

## Stack

React + Vite · Recharts · JavaScript (not TypeScript) · Vitest · Playwright · GitHub Actions · Node v21.

**Gotcha:** the local Node (v21.6.1) predates `node:util`'s `styleText` export, which `vitest@4`/latest `create-vite` depend on via `rolldown` — both fail at startup on this machine. `vitest` is pinned to `^2.1.9`. (`@playwright/test` had no such issue — `engines` just needs Node `>=18`.)
