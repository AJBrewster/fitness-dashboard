# Fitness Dashboard Revamp: Data + Golf + Visual Hierarchy Pass

_Drafted 2026-08-10. Not yet started — this is a proposal, not a milestone log. Merge relevant pieces into `PLAN.md` when work actually begins._

## Context

Alex asked for a full review/revamp of the fitness-dashboard portfolio project: fresh research into what a good dashboard should show, a reconsideration of what data this app surfaces, a substantial expansion of the golf section, and a second visual-design pass — all as one combined effort rather than sequenced work.

Two items from the original request ("get rid of the boat," "revamp to not include job search") were investigated exhaustively — grepped across all source, assets, `public/`, `index.html`, README/PLAN/CLAUDE docs, and full git history on all branches — and confirmed to have **zero trace anywhere in this repo**. Alex confirmed this was a cross-project mix-up with a different repo also framed as a portfolio project. Neither is part of this plan.

The golf section is not being built from scratch — it already shipped in full (2026-08-05: round picker, scorecard, KPI tiles, 4 charts/panels, graceful degradation for summary-only rounds, 41 unit + 8 e2e tests). Alex confirmed the ask is to substantially expand its stats, informed by research into what's missing, not to redo the existing UI.

CLAUDE.md is explicit that any further layout/color/typography change is **new scope**, not a continuation of the 2026-08-05 restyle — this plan treats it that way deliberately, and keeps the visual change narrow (information hierarchy, not a re-skin) rather than re-litigating the just-validated color/token system.

Two research-backed additions were proposed and explicitly **declined by Alex** after follow-up: a golf Handicap Index / WHS Score Differential (would require looking up `courseRating`/`slope` from a course's rating card for every future hand-entered round — real recurring burden, not worth it right now), and Garmin HRV (live-verified via the `garmin` MCP server — `get_hrv_trend` returns no data for the account at all, and `get_hrv_data` 401s consistently while unrelated endpoints work fine, indicating the paired device doesn't support Garmin's HRV Status feature; a fixture-only field with no real sync path undermines the project's fixture-first-but-real-data-capable design). Sleep-stage breakdown (deep/light/REM/awake) was also identified as a legitimate addition but deferred to a future pass to keep this batch shippable.

## Research findings driving the plan

- **General dashboard practice:** one clear hero metric per view with everything else visually subordinate; progressive disclosure (summary first, detail on demand); comparison context (trend/delta) beats a bare snapshot number.
- **Biggest existing gap:** `WellnessSummary.jsx` (verified by reading the file) only ever receives `latest` — `App.jsx` computes and discards the other 6 days already sitting in `wellness.json`. This is the single highest-confidence fix: no new data collection needed, just stop throwing away what's already fetched.
- **Fitness-app pattern (Whoop/Oura/Garmin):** the readiness/recovery screen is built around trend-in-context ("up from yesterday" matters more than the absolute number), which the existing `Sparkline.jsx` component already gives this app for free.
- **`avgHrBpm` gap:** `activities.json` collects this field per activity and it is displayed **nowhere** in the app today — an easy, real gap to close with existing data.
- **Golf stats gap:** three meaningful additions are computable from the existing `{hole, par, score, putts, fairway, gir, penalties}` shape with **zero new hand-entry**: bounce-back rate (bogey-or-worse immediately followed by birdie-or-better), birdie-or-better conversion rate (the natural complement to the existing scrambling stat — capitalizing when GIR is hit, vs. recovering when it's missed), and blow-up rate (double-or-worse ÷ holes played, a bucket `getScoreDistribution` already computes internally but never surfaces as its own number).

## Milestones

Each is independently committable, follows this project's existing conventions (pure math in `stats.js`/`golf.js`, tested independently of fixtures, `PropTypes`, `data-testid` discipline, docs updated same-milestone), and the docs sync happens before each milestone's commit, not batched.

### M1 — Wellness in context (sparkline + delta on every ring/tile) — ✅ SHIPPED 2026-08-11
Done: `getWellnessSeries`/`getWellnessDelta` in `stats.js` (9 new unit tests), `WellnessSummary` now takes the full `wellness` array and renders a sparkline under each ring/tile plus a day-over-day delta badge on the hero ring, `App.jsx` passes `wellness`, styling in `App.css`. Fixture kept at 7 rows (decided against growing it — a 7-point sparkline reads fine and matches the real `.local.json` scale). Smoke test gained a scoped `.sparkline` count + delta assertion; all existing wellness values unchanged. Docs synced (CLAUDE.md, PLAN.md, README.md). **M2–M4 below remain an open proposal — not auto-continued; reassess before starting.**

No fixture schema change — this only stops discarding data `wellness.json` already has.

- `src/lib/stats.js`: add `getWellnessSeries(wellness, field)` (date-sorted, null-filtered array of `{date, value}`) and a delta helper comparing the latest two non-null values. Follow `golf.js`'s null-not-zero convention (return `null`, not `0`, when there's nothing to compare).
- `src/components/WellnessSummary.jsx`: change its prop from `latest` alone to the full `wellness` array; derive `latest` internally as the last record. Render a `Sparkline` under each ring (readiness/sleep/battery) and under the two flat tiles (stress/resting HR), plus a small delta badge on the hero ring.
- `src/App.jsx`: pass `wellness` (already loaded via `getWellness()`) instead of only the last record.
- `src/index.css`: delta-badge styling; confirm the sparkline fits inside the existing ring-card layout without breaking the ~390px mobile treatment.
- Consider growing `wellness.json`'s real-data-shaped synthetic fixture from 7 to ~14 rows (more rows only, no new fields) so the sparkline isn't literally the whole dataset.
- Tests: `stats.test.js` — normal series, all-null field, single-day input (below `Sparkline`'s own <2-point guard), unsorted input. Update `WellnessSummary`'s existing PropTypes/tests for the new `wellness` array prop. `e2e/smoke.spec.js`: confirm existing wellness assertions still pass unchanged (values shouldn't move) and add a light presence check for the new sparklines.
- Docs: CLAUDE.md's `WellnessSummary.jsx` entry, PLAN.md, README.md.

### M2 — Avg HR by activity type (Activity view) — ✅ SHIPPED 2026-08-11
Done: `getAvgHrByType` in `stats.js` (5 new unit tests), new `HrByTypeChart.jsx` (single-hue horizontal bar chart, `.chart-hr-by-type` wrapper), wired into the Activity view from `filteredActivities` so it respects the date filter, reusing the now-exported `LABEL_BY_TYPE` from `ActivityTypeBreakdown.jsx`. A type with no HR readings (strength training in the fixture) is omitted rather than shown as a zero bar → 6 bars, not 7; smoke test asserts that scoped count. Docs synced. **M3–M4 below remain an open proposal — not auto-continued.**

No fixture change — closes an existing, already-collected-but-unshown gap.

- `src/lib/stats.js`: `getAvgHrByType(activities)` — group by `type`, average `avgHrBpm` excluding nulls per type, return `null` (not `0`/`NaN`) for a type with zero HR-bearing activities.
- New `src/components/HrByTypeChart.jsx` — single-hue (`--accent`) bar chart (magnitude comparison across categories, same reasoning the golf bar charts already use for choosing `--accent` over `--series-*`). Own wrapper class `.chart-hr-by-type` per the standing Recharts e2e-scoping gotcha.
- `src/App.jsx`: wire into the Activity view using `filteredActivities`, so it respects the existing date-range filter like the other Activity-view charts.
- Tests: `stats.test.js` — mixed null/non-null HR per type, an all-null type, empty activities. `e2e/smoke.spec.js`: new scoped chart assertion pinned to fixture values.
- Docs.

### M3 — Golf Momentum panel (bounce-back / birdie conversion / blow-up rate)
Pure math, no fixture change.

- `src/lib/golf.js`, same header-comment discipline as the existing scrambling/no-SG notes:
  - `getBounceBackRate(rounds)` — **must iterate per-round**, not over the flattened `allHoles()` list: the last hole of one round and the first hole of the next are not consecutive, and flattening would silently treat them as if they were (caught during plan review by reading `allHoles()`'s implementation). Exclude each round's final hole from the opportunity denominator (no next hole to bounce back on). Skip summary-only rounds (no `holes`).
  - `getBirdieConversionRate(rounds)` — birdie-or-better count ÷ GIR-hole count, via the existing `percentage()` helper.
  - `getBlowUpRate(rounds)` — double-or-worse count ÷ holes played, reusing the existing `getHoleResult()`.
- New `src/components/MomentumPanel.jsx` — same tile pattern as `PuttingPanel.jsx`, em-dash for `null`.
- `src/App.jsx`: wire in behind the same `holeBearingRounds.length > 0` gate as the existing distribution/by-par/putting trio, with the same `PanelUnavailable` fallback on a summary-only-only window.
- Tests: `golf.test.js` — bounce-back's last-hole exclusion (including the 9-hole round), a round with only one hole (→ null), a summary-only round contributing nothing; birdie-conversion with zero GIR holes (→ null); blow-up rate over a mixed window. `e2e/golf.spec.js` (untagged, matches existing golf-detail test placement): panel values against fixture, and standing down on a summary-only-only window.
- Docs.

### M4 — Golf KPI hero tile (visual hierarchy, no new math)
The one visual-hierarchy change scoped into this pass, applied where the plan is already touching Golf's KPI row rather than as a separate re-skin milestone. Handicap/Score Differential math is explicitly **out** per Alex's call — this is presentation only.

- `src/components/GolfSummary.jsx`: promote the Score/to-par tile to a hero treatment (larger numeral, first position) — mirrors the pattern `WellnessSummary.jsx` already uses for its Training Readiness ring.
- `src/index.css`: new `.summary-stat--hero` modifier, reused by both `GolfSummary` and (optionally) `Summary.jsx` if it reads well there too — confirm visually before extending it beyond golf.
- Tests: update `e2e/golf.spec.js`'s existing KPI-row assertions if the hero tile's markup/testid changes; no new logic to unit test.
- Docs.

## Explicitly not in this batch

- **Golf Handicap Index / WHS Score Differential** — declined by Alex (recurring `courseRating`/`slope` hand-entry burden). The unused `courseRating`/`slope` fields already carried by summary-only rounds stay unused; if this changes later, `PLAN.md`'s existing "carried but unused" note is the right place to pick it back up.
- **HRV** — declined after live verification via `mcp__garmin__get_hrv_trend`/`get_hrv_data` showed no data is available for Alex's Garmin account/device at all (not just an unknown field shape). Don't re-attempt without first checking `mcp__garmin__get_devices` to see whether this is a paired-device limitation or something else.
- **Sleep-stage breakdown** — legitimate, deferred to its own future pass to keep this batch shippable, per Alex's choice.
- Nutrition, gear, route/GPS, strength sets/reps — all considered and declined for the same reasons already documented in this project's existing scope-discipline pattern (no real logging habit for nutrition, no established data source for gear/GPS/sets — see CLAUDE.md's Scope discipline section for the standing bar these get held to).

## Verification (once implementation starts)

- `npm test` after each milestone (unit coverage for every new pure function, including every `null`/edge case named above).
- `npm run lint` — this repo enforces `no-console` and `react/prop-types` in CI; new components need PropTypes from the start.
- `npm run build` — and grep the built CSS for any new selectors if `index.css` changes, per this project's standing `*/`-in-comments gotcha.
- `npm run test:e2e:smoke` for the milestones that touch smoke-covered surfaces (M1, M2); `npm run test:e2e` (full suite, includes `golf.spec.js`) for M3/M4.
- Manual check in the browser (`npm run dev`) for each milestone: M1's sparklines/deltas render correctly for both a normal and a null-heavy wellness fixture; M2's chart respects the date filter; M3's Momentum panel correctly stands down via `PanelUnavailable` when the round window is summary-only-only; M4's hero tile reads correctly at the ~390px mobile breakpoint alongside the existing sidebar toggle fix.
- Update CLAUDE.md, PLAN.md, and README.md before each milestone's commit, matching this project's existing "docs stay in sync every milestone" rule — not batched at the end.

## Critical files

- `src/lib/stats.js` / `src/lib/stats.test.js`
- `src/lib/golf.js` / `src/lib/golf.test.js`
- `src/components/WellnessSummary.jsx`
- `src/components/GolfSummary.jsx`
- `src/components/PuttingPanel.jsx` (pattern to mirror for `MomentumPanel.jsx`)
- New: `src/components/HrByTypeChart.jsx`, `src/components/MomentumPanel.jsx`
- `src/App.jsx`
- `src/index.css`
- `e2e/smoke.spec.js`, `e2e/golf.spec.js`
- `CLAUDE.md`, `PLAN.md`, `README.md`
