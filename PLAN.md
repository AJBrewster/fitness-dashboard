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

1. **Now:** committed `src/data/activities.json` fixture — 100 real activities,
   one-time snapshot pulled 2026-07-22 via the `garmin` MCP server (see
   prototype note below) rather than a CSV export as originally planned. Same
   effect either way: a static, deterministic file checked into the repo, so
   CI can't flake on network conditions or account state.
   - **Privacy pass before committing:** `owner_display_name` dropped from
     every record. Activity `name` fields are genericized — real place names
     (home area, regular routes) stripped since this repo is public; only a
     small allow-list of known workout-descriptor words (e.g. "Tempo",
     "Easy", "Speed Repeats") is kept, so anything not on that list is
     discarded by default rather than requiring an ever-growing place
     denylist. Zwift ride names are left as-is (virtual routes/events, not
     real-world locations).
2. **Always:** components never import the fixture directly. All data flows
   through `src/lib/data.js`, even while it's three lines long.
3. **Post-v1:** live Garmin sync becomes a second implementation behind that
   same interface.
4. **Prototype (started 2026-07-21):** exploring the live Garmin API directly
   via the `Taxuspt/garmin_mcp` MCP server (unofficial, wraps
   `python-garminconnect`) — for learning the API surface and sourcing real
   data, run through Claude Code tooling. As of 2026-07-22 this MCP connection
   is also how the milestone-1 fixture snapshot above was sourced (a one-time
   export, not a live wire-up). `lib/data.js` still only reads the static
   fixture — no live/network call happens at app runtime. Don't wire live
   Garmin calls into the shipped app without a separate decision.
   - **Maintenance (local machine, not in this repo):** OAuth tokens live at
     `~/.garminconnect` and last ~6 months — re-run
     `uvx --python 3.12 --from git+https://github.com/Taxuspt/garmin_mcp garmin-mcp-auth --force-reauth`
     when they expire (check by ~2027-01-21). The wrapper itself is unofficial
     and can silently go stale against Garmin's API — periodically pull the
     latest with
     `uvx --refresh --python 3.12 --from git+https://github.com/Taxuspt/garmin_mcp garmin-mcp`
     rather than assuming the cached build still works.
5. **Long-term (post-v1, tracked, not decided):** a flat JSON fixture won't
   scale past v1 if this becomes a real ongoing tool — a DB (even SQLite)
   is the likely next step once live sync is in play. Out of scope for v1;
   revisit alongside the "Post-v1" live-sync item above rather than as its
   own separate effort.

## Stack

React + Vite · Recharts · JavaScript · Vitest (unit) · Playwright (e2e) ·
GitHub Actions. Node v21 locally.

## Milestones

Each leaves the repo working and committable. Sessions are ~1–2 hours.

- [x] **0. Repo setup** — git init, plan, README skeleton, pushed public
- [x] **1. Vite app + fixture** — blank app runs, `activities.json` committed, data loads via `lib/data.js`
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

1. Fighting Garmin's API before the dashboard exists — was banned until
   post-v1; superseded 2026-07-21 by a deliberate decision to prototype live
   access via MCP (see Data strategy). Still don't wire it into `lib/data.js`
   or the shipped v1 app without a separate decision.
2. Building too much and abandoning it — ship milestone 6, then decide.
3. Using this project to postpone sending applications — it supports
   applications, it doesn't replace them.
