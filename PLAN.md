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
5. **Long-term (post-v1, tracked, not decided):** a flat JSON fixture won't
   scale past v1 if this becomes a real ongoing tool — a DB (even SQLite)
   is the likely next step once live sync is in play. Out of scope for v1;
   revisit alongside the "Post-v1" live-sync item above rather than as its
   own separate effort.

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
- [ ] **Phase 3 — KPI tiles + weekly sparkline data.** Planned: extract
      `getWeeklyDistance`'s private week-bucketing into a shared helper, add
      `getWeeklyDuration`/`getWeeklyActivityCount` to `stats.js` (+ Vitest
      coverage), restyle `Summary.jsx` into icon + value + sparkline tiles.
      Streak stays sparkline-free (no natural weekly series without
      inventing one).
- [ ] **Phase 4 — Activity-type donut.** Planned: replace
      `ActivityTypeBreakdown.jsx`'s Recharts `BarChart` with a `Pie`/donut
      (same `COLOR_BY_TYPE` mapping) + an HTML legend.
- [ ] **Phase 5 — Wellness ring gauges.** Planned: hand-rolled SVG ring
      gauges for Training Readiness (hero)/Sleep Score/Body Battery in
      `WellnessSummary.jsx`; Avg Stress/Resting HR stay plain tiles.
- [ ] **Phase 6 — Final docs + screenshots + full-suite pass.**

Full implementation plan (test-migration details, Recharts-vs-hand-rolled
decisions, milestone rationale) lives at
`/Users/alexbrewster/.claude/plans/transient-kindling-dijkstra.md` if it's
still around — treat this PLAN.md section as the durable record either way.

## Known failure modes (watch for these)

1. Fighting Garmin's API before the dashboard exists — was banned until
   post-v1; superseded 2026-07-21 by a deliberate decision to prototype live
   access via MCP (see Data strategy). Still don't wire it into `lib/data.js`
   or the shipped v1 app without a separate decision.
2. Building too much and abandoning it — ship milestone 6, then decide.
3. Using this project to postpone sending applications — it supports
   applications, it doesn't replace them.
