# Project Plan — Fitness Dashboard

SDET portfolio project: a Garmin fitness dashboard that proves feature coding,
proper testing, and modern CI in one artifact. Deliberately small — milestone 6
finished beats milestone 12 half-done.

## Working agreement

Built pairing with Claude Code, with one hard rule: **nothing gets committed
until Alex can explain every line to an interviewer.** Claude may draft;
Alex reviews, modifies, and owns the result.

**Docs stay in sync with reality, every milestone.** Before each commit,
update PLAN.md (checkbox + any scope/gap notes), CLAUDE.md (project state,
architecture), and README.md (status, commands, anything milestone-gated)
to match what's actually true — not after the fact, not batched up. Stale
docs are worse than no docs, since they actively mislead whoever reads them
next (including Claude, next session).

*(Updated 2026-07-22: dropped the earlier "Alex writes `lib/stats.js` and its
tests first" rule — Claude drafts that file too now. The "explain every line"
bar still applies to it same as anything else; walk through `stats.js` before
it ships if it's been a while since it was written, since that's still the
file most likely to get probed in an interview.)*

## Scope (v1)

- Load Garmin activity data (from a committed fixture — see data strategy)
- Summary: total distance, time, activity count, streak
- One chart: weekly distance over time
- One filter: activity type or date range

**Out of scope for v1:** auth, database, deployment, mobile, live Garmin sync,
multi-user.

## Data strategy

1. **Now — two files, one path committed:**
   - `src/data/activities.json` — the path `lib/data.js` actually reads, and
     the only one committed. 14 hand-written synthetic activities, enough
     variety (all 7 activity types, some `null` HR/calories) to exercise the
     app and tests without depending on real data.
   - `src/data/activities.local.json` — **gitignored, not committed.** A
     one-time snapshot of 100 real activities pulled 2026-07-22 via the
     `garmin` MCP server (see prototype note below), for optional richer
     local dev/testing. Kept at a different path than the tracked fixture on
     purpose: since `.gitignore` only blocks *untracked* files, committing
     real data at the same path `lib/data.js` reads would risk a later swap
     silently becoming a tracked change. Swap it in locally by pointing
     `lib/data.js` at it temporarily if you want to eyeball real numbers —
     don't commit that change.
   - **Privacy pass applied to the real snapshot before it ever touched
     git:** `owner_display_name` dropped from every record. Activity `name`
     fields genericized — real place names (home area, regular routes)
     stripped since this repo is public; only a small allow-list of known
     workout-descriptor words (e.g. "Tempo", "Easy", "Speed Repeats") is
     kept, so anything not on that list is discarded by default rather than
     requiring an ever-growing place denylist. Zwift ride names left as-is
     (virtual routes/events, not real-world locations).
   - Either way, both files are static/deterministic — no network call at
     app runtime, no CI flake risk.
2. **Always:** components never import the fixture directly. All data flows
   through `src/lib/data.js`, even while it's three lines long.
3. **Post-v1:** live Garmin sync becomes a second implementation behind that
   same interface.
4. **Prototype (started 2026-07-21):** exploring the live Garmin API directly
   via the `Taxuspt/garmin_mcp` MCP server (unofficial, wraps
   `python-garminconnect`) — for learning the API surface and sourcing real
   data, run through Claude Code tooling. As of 2026-07-22 this MCP connection
   is also how `activities.local.json` above was sourced (a one-time export,
   not a live wire-up, and not the file the app actually ships with).
   `lib/data.js` still only reads the static, committed fixture — no
   live/network call happens at app runtime. Don't wire live Garmin calls
   into the shipped app without a separate decision.
   - **Maintenance (local machine, not in this repo):** OAuth tokens live at
     `~/.garminconnect` and last ~6 months — re-run
     `uvx --python 3.12 --from git+https://github.com/Taxuspt/garmin_mcp garmin-mcp-auth --force-reauth`
     when they expire (check by ~2027-01-21). The wrapper itself is unofficial
     and can silently go stale against Garmin's API.
   - **Actual live setup, corrected 2026-07-29:** the `garmin` MCP server
     Claude actually connects to (configured in
     `~/Library/Application Support/Claude/claude_desktop_config.json`'s
     `mcpServers.garmin`) runs from a **local clone at `~/garmin_mcp`**, not
     directly from `git+https://github.com/Taxuspt/garmin_mcp` — that git
     URL is only useful for one-off CLI testing (`uvx --from git+...`),
     which spins up a separate ephemeral environment and does **not** affect
     the live connection. To pick up a fix in the live connection: update
     `~/garmin_mcp` (`git pull`, or hand-edit), then **reload/restart VS
     Code** (Cmd+Shift+P → "Developer: Reload Window", or fully quit and
     reopen) — that's what respawns the MCP server subprocess in this setup.
   - **Break #1, hit and fixed 2026-07-29:** every wellness/health endpoint
     (sleep, heart rate, stress, training readiness, body battery,
     weigh-ins — but *not* the activity-log endpoints used above) failed
     with `No module named 'rich.traceback'`. Root cause: `~/garmin_mcp`'s
     `pyproject.toml` declared `mcp>=1.28.1` with no upper bound; `mcp`
     2.0.0 landed on PyPI and renamed `mcp.server.fastmcp` →
     `mcp.server.mcpserver` (`FastMCP` → `MCPServer`), so any fresh
     dependency resolve silently picks up the breaking 2.x release. Matches
     [Taxuspt/garmin_mcp#227](https://github.com/Taxuspt/garmin_mcp/pull/227)
     exactly (open, approved, not yet merged as of 2026-07-29). Fix: cap
     `mcp>=1.28.1,<2` in `pyproject.toml` + re-resolve `uv.lock` — was
     already sitting uncommitted in `~/garmin_mcp` when discovered.
   - **Break #2, same day, different cause:** fixing `~/garmin_mcp` and
     reloading VS Code *still* didn't reconnect the tools. Turned out
     Claude Code (the VS Code extension) has its **own** MCP config,
     separate from `claude_desktop_config.json` — managed via `claude mcp`,
     stored in `~/.claude.json` (scope "user"). That config had `garmin`
     pointed at `--from git+https://github.com/Taxuspt/garmin_mcp` directly
     (the unfixed upstream repo), not the local clone — the exact "ephemeral
     env, doesn't see local fixes" trap, but baked into persistent config.
     Fixed via `claude mcp remove garmin -s user` then `claude mcp add
     garmin -s user -- /Users/alexbrewster/.local/bin/uvx --python 3.12
     --from /Users/alexbrewster/garmin_mcp garmin-mcp`. Confirmed via
     `claude mcp get garmin` ("✔ Connected"), and a **new session** (a
     mid-session config fix doesn't surface newly-available tools in the
     session that's already running). Full pull of sleep/HR/stress/VO2
     max/body battery/weigh-ins succeeded right after. If `garmin` tools
     ever go missing again: check `claude mcp get garmin` (which repo/path
     it's using) *before* assuming it's a `~/garmin_mcp` staleness issue.
5. **Decided 2026-08-01: local SQLite store + scheduled sync.** Stays a
   local-only tool — nothing gets deployed, the public repo keeps shipping
   the small synthetic fixture exactly as before, and real data never
   leaves Alex's laptop. SQLite over a hosted DB: no account, no cost, no
   network dependency, trivial to gitignore, and a natural fit for a
   local-only tool. See "Post-v1: local sync + SQLite" below for the full
   architecture and how it replaces the old one-time manual snapshot.

## Stack

React + Vite · Recharts · JavaScript · Vitest (unit) · Playwright (e2e) ·
GitHub Actions. Node v21 locally.

**Version gotcha (found milestone 2):** the local Node is v21.6.1, which
predates `node:util`'s `styleText` export. `vitest@4` (and latest
`create-vite`) depend on it via `rolldown` and fail at startup with
`SyntaxError: ... does not provide an export named 'styleText'`. Pinned
`vitest` to `^2.1.9` (matches Vite 5) to work around it. Watch for the same
issue when Playwright gets added in milestone 6 — check its Node requirement
before installing, or upgrade Node first.

**Second version gotcha (found 2026-07-31, visual-redesign Phase 5):** same
root cause, different dependency. `jsdom` had no upper bound and had drifted
to `29.1.1`; its `html-encoding-sniffer` dependency requires the ESM-only
`@exodus/bytes` via `require()`, which crashes any Vitest file that needs the
`jsdom` environment (surfaces as an "Unhandled Error" in the run, not a clean
per-file failure — still fails the overall run, just easy to misread). Pinned
`jsdom` to `^26.0.0`, which predates that dependency. Check this again before
bumping `jsdom`, same as the `vitest`/`styleText` note above.

**Lint gap (found and fixed 2026-08-01):** `npm run lint` had never been part
of `.github/workflows/ci.yml` (added in milestone 4 alongside `npm test`/
`npm run build`, but lint itself wasn't), and `eslint-plugin-react`'s
`react/prop-types` rule had been enabled since milestone 1 with no component
ever declaring PropTypes — so the repo had been lint-failing its entire
history (45 errors) without CI or anyone locally noticing. Fixed by adding
`prop-types` as a real dependency and PropTypes to the 10 components that
needed them, fixing two smaller pre-existing errors that surfaced once the
prop-types noise cleared (`process` undefined in `playwright.config.js` —
config files run under Node, not the browser, needing a `globals.node`
override in `eslint.config.js` — and an unescaped apostrophe in `App.jsx`'s
"Today's Wellness" heading), and adding `npm run lint` to CI right after
`npm ci` so a green run now actually means lint-clean, not just configured.

## Milestones

Each leaves the repo working and committable. Sessions are ~1–2 hours.

- [x] **0. Repo setup** — git init, plan, README skeleton, pushed public
- [x] **1. Vite app + fixture** — blank app runs, `activities.json` committed, data loads via `lib/data.js`
- [x] **2. `stats.js` + unit tests** — totals, weekly rollup, filters as pure functions; Vitest passing incl. edge cases (empty data, single activity, missing fields). `streak` added 2026-07-29 (after v1's other milestones were already done) as the longest run of consecutive calendar days with an activity — deliberately not "current streak as of today," since that would make assertions against the fixture depend on the system clock.
- [x] **3. Summary component** — real numbers on screen, including `streak` as a fourth stat (added 2026-07-29)
- [x] **4. GitHub Actions CI** — `.github/workflows/ci.yml` runs `npm ci`, `npm test`, `npm run build` on push/PR to `main`; badge added to README. **Note:** badge won't show green until this gets pushed and the workflow actually runs on GitHub — it'll read "no status"/unknown locally.
- [x] **5. Chart** — `WeeklyDistanceChart` (Recharts line chart) renders weekly distance from `getWeeklyDistance`; verified in a real headless-browser run (screenshot + zero console errors), not just a successful build
- [x] **6. Playwright smoke tests** — `@smoke`-tagged e2e (`e2e/smoke.spec.js`: loads, summary renders, chart renders) passing locally and wired into CI with an HTML report artifact ← **minimum viable portfolio piece**
- [x] **7. Filters + tests** — `DateRangeFilter` (date-range chosen over
      activity-type; v1 Scope only calls for one) wired into `App.jsx`,
      filtering updates `Summary` and the chart together. Unit-level
      coverage was already in place (`filterByDateRange` tests from
      milestone 2); `e2e/filters.spec.js` (5 tests, full suite not
      `@smoke`) covers the UI interaction: basic filter + clear, a
      no-match range (zeroed summary, 0 chart dots), a partial
      (one-sided) range (stays unfiltered), and a single-day range.
      Verified visually with screenshots too, not just assertions.
- [x] **8. README polish** — real screenshot (`docs/screenshot.png`, taken
      with Playwright/chromium against the actual dev server, not mocked up)
      and testing rationale updated with concrete test counts (15 unit, 8
      e2e). This is the last of the 8 milestones — see the note below on
      what's still open before calling v1 fully done.

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

- [x] Public GitHub repo — confirmed public via `gh repo view`
- [ ] Dashboard renders real Garmin data — **open tension, not yet resolved:** the
      committed fixture is synthetic (see Data strategy); the real Garmin
      pull is deliberately local-only/gitignored for privacy. Decide before
      calling v1 done: is "real Garmin data" satisfied by the local-only
      snapshot existing, or does this item require the public app itself to
      show real (if genericized) data?
- [x] Unit tests on data logic — 18 Vitest tests, `stats.js` (was 15; +3 for
      `streak`)
- [x] Playwright e2e, smoke-tagged — `e2e/smoke.spec.js`, 3 tests
- [x] CI running on push, badge green — confirmed via `gh run list`, last two
      pushes both succeeded
- [x] README with screenshot + testing rationale — `docs/screenshot.png`
      (retaken 2026-07-29 to include the `streak` stat), rationale updated
      with concrete test counts
- [ ] Link on LinkedIn profile

**v1 status:** all 8 milestones done. Two Definition-of-Done items remain
open: the real-Garmin-data tension above (a product decision, not a coding
task), and the LinkedIn link (Alex's own task, not something to do from
here).

## Post-v1: expanded data + UI (started 2026-07-29)

Before a full visual redesign, Alex wants sleep score, activity-type
breakdown, heart rate, VO2 max, body battery, weight, stress, and training
readiness/status available — and, as of 2026-07-30, actually on screen.
**Explicit scope call:** add sections in the *existing* visual style now;
a full visual redesign (layout/colors/typography rework) is a separate,
later pass — doing both at once risks redesigning around a layout that's
still shifting.

- **New fixture pairs, same real-local/synthetic-committed pattern as
  `activities.json`:**
  - `src/data/wellness.json` / `.local.json` — one record per day: sleep
    score, resting/avg/max heart rate, avg/max stress, body battery
    charged/drained, training readiness score, training status label, VO2
    max. Real data covers 2026-07-15..2026-07-21 (7 days — sleep, HR,
    stress, training readiness, and training status are all per-day-only
    endpoints, so a wider window means proportionally more MCP calls).
  - `src/data/vo2MaxTrend.json` / `.local.json` — sparser long-range trend
    (real: 8 points, 2026-05-01..2026-07-21) — VO2 max updates gradually,
    so a multi-month view is more meaningful than a daily one. Separate
    from the daily `vo2Max` field in `wellness.json` on purpose — different
    time granularity, different use.
  - `src/data/weighIns.json` / `.local.json` — date + weight in kg. Real
    data: 25 measurements, 2026-05-01..2026-07-21.
  - Same privacy posture as `activities.local.json`: the `.local.json`
    files are gitignored, real, and never committed. The committed
    non-`.local` files are small hand-written synthetic samples spanning
    the same June 2026 window as `activities.json`, for consistency if a
    future combined view lines them up.
- `src/lib/data.js` — added `getWellness()`, `getVo2MaxTrend()`,
  `getWeighIns()`, same pattern as `getActivities()`.
- `src/lib/stats.js` — added `getActivityTypeBreakdown(activities)`: counts
  per activity type, most common first. Uses the `type` field already on
  every activity — no new fixture needed for this one. 3 new Vitest cases.

**UI added 2026-07-30** — page restructured into three sections (`App.jsx`):
- **Activity** — existing Summary/chart/filter, plus a new
  `ActivityTypeBreakdown` bar chart.
- **Today's Wellness** — new `WellnessSummary`: Training Readiness as the
  highlighted stat (color-banded good/moderate/low against the score, always
  paired with a text label — never color-alone), plus sleep score, body
  battery charged, avg stress, resting HR from the most recent day in
  `wellness.json`.
- **Trends** — new `Vo2MaxChart` and `WeightChart`, both single-line charts
  reusing the app's existing accent color for visual consistency (no CVD
  concern with a single series).

Used the `dataviz` skill for the one place color assignment actually
mattered: `ActivityTypeBreakdown`'s 7 activity types get a **fixed**
type→color mapping (validated via `validate_palette.js` — all hard gates
pass in both light and dark against this app's surfaces), independent of
the count-sorted bar order. This matters because color must follow the
entity, not its rank — a bar chart correctly reorders by count on
refilter, but if color also came from sort position, the same activity
type could silently change color between renders. Verified with real
screenshots in both `prefers-color-scheme: dark` and `light`, not just a
build check.

3 new `@smoke` Playwright tests (activity-type bars, wellness numbers,
trend chart dots) — 11 e2e total now, up from 8. Also had to rescope the
pre-existing `.recharts-line-dots circle` assertions in `smoke.spec.js`/
`filters.spec.js` to `.chart-weekly-distance .recharts-line-dots circle`:
adding two more line charts (VO2 max, weight) to the page meant the old
unscoped selector started counting dots from all three charts combined.

## Post-v1: visual redesign (started 2026-07-30)

The data/UI expansion above deliberately used the existing visual style and
called the full redesign a separate, later pass. That pass is now underway,
planned phase-by-phase (each phase committable on its own, docs updated with
every phase rather than batched at the end):

- [x] **Phase 1 — Accent token + chart re-color.** Added `--accent` to
      `src/index.css` (`#35b8cc` dark / `#0e7c90` light), contrast-checked
      against this app's real surfaces via the `dataviz` skill's
      `validate_palette.js` (6.56:1 dark, 4.88:1 light). Swapped the
      hardcoded `stroke="#646cff"` in `WeeklyDistanceChart.jsx`,
      `Vo2MaxChart.jsx`, `WeightChart.jsx` to `stroke="var(--accent)"`. No
      test impact.
- [x] **Phase 2 — App shell: sidebar + topbar.** New `src/components/
      Sidebar.jsx` — nav links for Activity/Today's Wellness/Trends
      (scroll-linked via `IntersectionObserver` in `App.jsx`, active-state
      highlighted), a deliberately disabled "Reports" item with a "Soon"
      badge (a real, inert placeholder, not a dead link — signals room to
      grow without faking a feature), and a working dark-mode toggle
      persisted to `localStorage`. `App.jsx` now renders an `.app-shell` of
      sidebar + main (topbar with the active section's title + the
      relocated `DateRangeFilter`, then the three `<section>`s). The old
      standalone `<h1>Fitness Dashboard</h1>` moved into the sidebar brand
      mark — it's still the page's only `<h1>`, just relocated, so the
      existing smoke test needed no change. Removed the stock Vite
      `#root`/`body` centering rules (`max-width`/`margin:auto`/
      `text-align:center`/`display:flex; place-items:center`), which
      conflicted with the new full-bleed shell. One new `@smoke` test
      (Reports item visible/disabled/"Soon") — 12 e2e total now, up from
      11.
      **Two real bugs found and fixed during this phase, worth remembering:**
      a CSS comment containing the substring `--status-*/--sidebar-*`
      literally contained `*/`, silently truncating the stylesheet mid-parse
      during minification — `npm run build` reported success even though the
      whole `data-theme` override block vanished from the production
      output; only caught by grepping the actual built CSS, not by trusting
      a green build. And the toggle's `aria-label="Toggle dark mode"`
      collided with Playwright's `getByLabel('To')` (substring match: "**To**
      ggle"), breaking 4 of 5 `filters.spec.js` tests — renamed to
      `aria-label="Dark mode"`.
      **Known open tradeoff, not fixed:** `DateRangeFilter` now sits in a
      global topbar, which visually implies it filters every section, but it
      still only filters Activity (Wellness/Trends stay unfiltered), same as
      before — just more visually implied now. Left as an explicit, later
      decision rather than silently expanding scope.
- [x] **Phase 3 — KPI tiles + weekly sparkline data.** Extracted
      `getWeeklyDistance`'s private week-bucketing into a shared `groupByWeek`
      helper; `getWeeklyDuration`/`getWeeklyActivityCount` in `stats.js` are
      thin reducers over the same groups (+ 10 new Vitest cases: happy path,
      empty, single-activity, Sunday-bucketing, missing-field-as-zero per
      function, plus one consistency test asserting all three bucket into
      identical `weekStart` keys — 31 unit tests total, up from 21). New
      `src/components/Sparkline.jsx` (small hand-rolled SVG trend line,
      `aria-hidden` since the tile's own text value already carries the
      number). `Summary.jsx` restyled into bordered icon + value + sparkline
      tiles; streak stays sparkline-free as planned (no natural weekly
      series without inventing one). `data-testid`s stayed on the same leaf
      nodes, so no e2e changes were needed — all 12 e2e tests still pass
      unchanged.
- [x] **Phase 4 — Activity-type donut.** Replaced
      `ActivityTypeBreakdown.jsx`'s Recharts `BarChart` with a `Pie`/donut
      (same `COLOR_BY_TYPE` mapping, verified against the installed
      `recharts@3.10.0` source that it renders one `.recharts-pie-sector`
      per slice before committing to this over hand-rolled SVG), plus a real
      HTML `<ul>` legend (dot + name + count per row, `data-testid=
      "activity-type-row"`). The `<Pie>` itself is `aria-hidden` since the
      legend already carries the same info accessibly. Updated the smoke
      test to assert `.recharts-pie-sector` count = 7 (was
      `.recharts-bar-rectangle`) plus the legend-row count as a second,
      chart-agnostic check. **Found the same mount-animation gotcha
      documented for `<Line>`** — `<Pie>` also sweeps in on mount (~1.5–2s);
      a screenshot taken too early shows a half-open fan, not a bug.
- [x] **Phase 5 — Wellness ring gauges.** New reusable `ScoreRing.jsx`
      (hand-rolled SVG full-circle progress ring — confirmed not a Recharts
      fit, see the implementation plan), used three times in
      `WellnessSummary.jsx`: Training Readiness (hero, larger), Sleep Score,
      Body Battery. `readinessBand()` generalized into a `scoreBand(score,
      thresholds)` shared across all three (Sleep/Body Battery thresholds
      are a documented simplification, not an official Garmin scale — only
      Training Readiness's 60/40 bands match Garmin's own). Avg Stress/
      Resting HR stay plain tiles, no ring (no natural 0-100 "goal" for
      either). The old combined sentence ("Training Readiness — Good ·
      Maintaining") split into a heading + a separate `data-testid=
      "readiness-status-chip"` pill — updated the smoke test accordingly.
      **Also added:** 2 `@testing-library/react` unit tests on `ScoreRing`
      itself (arc math + clamping) — the first real use of
      `@testing-library/react`/`jsdom`, installed since early milestones but
      never exercised. Doing so surfaced a real environment gotcha: `jsdom`
      had drifted to `29.1.1` (no upper bound in `package.json`), whose
      `html-encoding-sniffer` dependency requires an ESM-only package
      (`@exodus/bytes`) via `require()`, silently crashing test *collection*
      for any file needing the `jsdom` environment (Vitest reported it as
      an "Unhandled Error," not a per-file failure — still fails the run,
      just confusingly). Same class of issue as the `vitest`/`styleText`
      pin below; fixed the same way — pinned `jsdom` to `^26.0.0` in
      `package.json`, which depends on an older `html-encoding-sniffer` that
      predates the `@exodus/bytes` migration.
- [x] **Phase 6 — Final integrated verification pass.** Docs/screenshots/
      tests were already kept current phase-by-phase (see above), so this
      phase was the one check those per-phase passes couldn't cover:
      everything together, not in isolation. Full-page screenshots (light +
      dark) confirmed the whole redesigned page reads as one coherent
      system end to end. A narrow-viewport (390px) pass confirmed the
      sidebar-to-topbar collapse (built in Phase 2, never actually
      re-verified since) still works, and caught one thing worth a second
      look before concluding it was a bug: at a 1000ms wait, the line
      charts showed dots with no connecting line and the donut looked
      blank — looked exactly like a broken layout, but a 3000ms wait showed
      everything rendering correctly. Same Recharts mount-animation gotcha
      as Phases 1/4, just slower to settle on a fresh narrow-viewport
      navigation; not a real defect. **One genuine, minor, unfixed rough
      edge found and left as a known follow-up:** the dark-mode toggle
      scrolls off-screen in the collapsed mobile nav bar at 390px width —
      still in the DOM and still found by `getByRole('switch', ...)`, so no
      test is affected, just not discoverable without scrolling the nav row
      horizontally. Full suite confirmed clean at the end: 33 unit tests,
      12 e2e tests, clean build.

All 5 redesign phases plus this verification pass are done. The visual
redesign that was called out as a deliberately separate, later pass back
in "Post-v1: expanded data + UI" is now complete.

Full implementation plan (test-migration details, Recharts-vs-hand-rolled
decisions, milestone rationale) lives at
`/Users/alexbrewster/.claude/plans/transient-kindling-dijkstra.md` if it's
still around — treat this PLAN.md section as the durable record either way.

## Post-v1: local sync + SQLite (2026-08-01)

Replaces the old one-time, hand-triggered snapshot (`*.local.json` pulled ad
hoc through the `garmin` MCP server and manually swapped into `lib/data.js`)
with a scheduled sync that keeps real data current on its own. **Stays a
local-only tool** — no deployment, no hosted DB, the public repo's shipped
fixture is unaffected (see Data strategy §5 above for the decision).

**Why a DB at all, if the app still just reads JSON:** the browser can't
open a SQLite file directly, and this is a static Vite SPA with no backend
— so SQLite was never going to be something the running dashboard queries
live. Instead:

1. `scripts/sync_garmin.py` — a self-contained `uv run` script (PEP 723
   inline dependency metadata: `garminconnect`, no `pyproject.toml`/venv
   setup needed) pulls a trailing window from Garmin (14 days of
   activities/wellness, 90 days of VO2 max/weigh-ins — wider than the sync
   interval on purpose, so a missed run just backfills next time) and
   **upserts** it into `scripts/garmin.local.db` by natural key (activity
   id, calendar date). This is the durable, cumulative store — history
   keeps growing across runs instead of each pull overwriting the last one,
   which was the old snapshot's real limitation.
2. The same script then **materializes** the full accumulated view straight
   back out to `src/data/*.local.json` — identical field names/shapes to
   the committed synthetic fixtures, so `lib/data.js` needs no knowledge
   that a DB exists at all.
3. Reuses the existing `~/.garminconnect` OAuth token cache (same one the
   `garmin` MCP server uses) — no new credential storage. Applies the same
   privacy pass already established for the original one-time snapshot
   (real place/route names dropped; only a small allow-list of generic
   workout descriptors like "Tempo"/"Easy"/"Speed Repeats" survives into the
   activity name), just automated now instead of manual.
4. Scheduled via macOS **launchd**, not cron — `scripts/launchd/
   com.alexbrewster.fitness-dashboard-sync.plist` (install/uninstall/status
   commands in `scripts/launchd/README.md`). launchd catches up on a run
   missed while the machine was asleep, which plain cron doesn't; combined
   with the trailing-window upsert, a skipped day is a non-event.
5. `lib/data.js`'s four fixture imports were replaced with a small
   `import.meta.glob('../data/*.local.json', { eager: true })` lookup, gated
   behind `VITE_USE_LOCAL_DATA=true` (default off) rather than switching
   purely on file presence. Presence-based was the original design — it
   removes the old "don't commit that change" foot-gun (no hand-edited
   import path) — but it doesn't compose with a *scheduled* sync: launchd
   can write fresh `.local.json` files in the background any time, so
   `npm run test:e2e`/`test:e2e:smoke` would silently start rendering real
   Garmin data and fail the fixture-pinned assertions in `e2e/smoke.spec.js`
   for reasons unrelated to any code change. **Caught the hard way** —
   verification when this landed only checked `npm test`/`npm run build`
   (both stayed green, since no unit test imports `lib/data.js` directly);
   a follow-up e2e run the same day, with that day's scheduled sync having
   already dropped `.local.json` files on disk, failed 5 of 7 smoke tests.
   Fixed same day by requiring the explicit env var — `.local.json`
   presence alone no longer changes what the app or its tests render.

**Not done as part of this pass, deliberately:** no `lib/data.js` unit test
was added for the glob fallback itself (verified manually instead, see
above) — the four `get*()` functions are still trivially thin, and the
interesting logic (upsert idempotency, the privacy pass) lives in
`scripts/sync_garmin.py`, which is Python and outside this repo's Vitest/
Playwright suites by design. Also not addressed: `import.meta.glob(...,
{ eager: true })` bundles whatever `.local.json` files exist at *build*
time regardless of the `VITE_USE_LOCAL_DATA` flag — the flag only gates
which data `pick()` returns at runtime. Not a problem today (this app isn't
deployed anywhere; `dist/` never leaves this machine), but worth knowing
before ever adding a deploy step: a `npm run build` run locally with
`.local.json` files present would ship real data in the JS bundle even with
the flag unset.

## Known failure modes (watch for these)

1. Fighting Garmin's API before the dashboard exists — was banned until
   post-v1; superseded 2026-07-21 by a deliberate decision to prototype live
   access via MCP (see Data strategy). Still don't wire it into `lib/data.js`
   or the shipped v1 app without a separate decision.
2. Building too much and abandoning it — ship milestone 6, then decide.
3. Using this project to postpone sending applications — it supports
   applications, it doesn't replace them.
