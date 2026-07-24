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
- [x] **2. `stats.js` + unit tests** — totals, weekly rollup, filters as pure functions; Vitest passing incl. edge cases (empty data, single activity, missing fields). **Note:** `getTotals` covers distance/duration/count only — `streak` (also called for in the v1 Scope section above) isn't implemented yet; needs its own pass.
- [x] **3. Summary component** — real numbers on screen. **Note:** shows distance/time/activity count only — no `streak` yet (still not implemented in `stats.js`, see milestone 2 note above)
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
