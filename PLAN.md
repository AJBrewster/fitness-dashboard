# Project Plan — Fitness Dashboard

SDET portfolio project: a Garmin fitness dashboard that proves feature coding,
proper testing, and modern CI in one artifact.

## Working agreement

Built pairing with Claude Code, with one hard rule: **nothing gets committed
until Alex can explain every line to an interviewer.** Claude may draft;
Alex reviews, modifies, and owns the result.

**Docs stay in sync with reality, every milestone.** Before each commit,
update PLAN.md (what's next, any new decisions), CLAUDE.md (project state,
architecture), and README.md (status, commands, anything milestone-gated)
to match what's actually true — not after the fact, not batched up. Stale
docs are worse than no docs, since they actively mislead whoever reads them
next (including Claude, next session).

**Self-improvement loop:** when Alex corrects an approach Claude took,
capture the reason in CLAUDE.md before moving on — not just fix the
immediate thing.

**No `console.log` in committed code** — enforced by `eslint`'s `no-console`
rule (`npm run lint` is wired into CI).

## Scope

**Shipped:** fixture-based activity summary/chart/filter (v1) · sleep, HR,
stress, body battery, training readiness/status, VO2 max, weight (post-v1
data expansion) · sidebar/topbar visual redesign with ring gauges and KPI
sparklines (post-v1 redesign) · local SQLite store + scheduled Garmin sync
(post-v1 sync). Full history of how each of these shipped is in git log —
this file tracks current state and what's next, not a phase-by-phase diary.

**Still out of scope, on purpose:** auth, multi-user, deployment. Don't add
these just because they'd be "nice" — see "What's next" below for the actual
current priorities, and don't self-assign new scope without flagging it
first (see "Known failure modes").

## Data strategy (current architecture)

- `src/data/*.json` — small, hand-written synthetic fixtures, committed.
  `lib/data.js` reads these by default. Deterministic on purpose: CI can't
  flake on network conditions or account state.
- `src/data/*.local.json` — gitignored, real data, kept current by
  `scripts/sync_garmin.py` on a daily schedule (macOS launchd — see
  `scripts/launchd/README.md` for install/status/uninstall). Only rendered
  when `VITE_USE_LOCAL_DATA=true` is set explicitly — see `lib/data.js` and
  CLAUDE.md's Architecture section for why presence-based switching was
  tried first and reverted (a scheduled sync landing mid-session silently
  broke fixture-pinned e2e assertions).
- Real data gets a privacy pass before it's ever written to disk: no owner
  name, activity names genericized to type + a small allow-list of generic
  descriptors ("Tempo", "Easy", etc.) — real place/route names never
  survive. Both this pass and the sync architecture are described in full
  in `scripts/sync_garmin.py`'s own docstring/comments — that's the current
  source of truth, not this file.
- Garmin auth reuses `~/.garminconnect` (same token cache the `garmin` MCP
  server uses). Tokens last ~6 months; re-auth command:
  `uvx --python 3.12 --from git+https://github.com/Taxuspt/garmin_mcp garmin-mcp-auth --force-reauth`
  (check by ~2027-01-21).

## Stack

React + Vite · Recharts · JavaScript (not TypeScript) · Vitest · Playwright
· GitHub Actions · Node v21 locally (CI runs Node 20).

Version-pin gotchas (`vitest`, `jsdom`) and the lint-in-CI setup are
documented in CLAUDE.md's Stack section — that's the live reference; don't
duplicate it here.

## Test plan

- **Unit (Vitest):** pure-function math in `stats.js`, plus component tests
  (`@testing-library/react`) where a component has real logic worth
  isolating (e.g. `ScoreRing`'s arc math).
- **E2E (Playwright):** `@smoke` runs on every push in CI; the full suite
  (adds the date-filter interaction tests) runs on demand only.
- Current counts and what each layer covers: CLAUDE.md's Test strategy
  section — kept current there, not duplicated here.

## Definition of done (v1)

- [x] Public GitHub repo
- [ ] Dashboard renders real Garmin data — **open product decision, not a
      coding task:** the committed fixture is synthetic by design; real
      data is local-only and gitignored for privacy. Decide: does the
      local-only synced snapshot satisfy this, or does it require the
      *public* app to show real (if genericized) data — which would mean
      deploying?
- [x] Unit tests on data logic
- [x] Playwright e2e, smoke-tagged, in CI
- [x] CI running on push, badge green
- [x] README with screenshot + testing rationale
- [ ] Link on LinkedIn profile (Alex's own task)

## What's next

Roughly in priority order:

1. **Decide the two open Definition-of-Done items above** — both are
   product/personal decisions, not coding tasks.
2. **Deployment** — the biggest lift, and the one item that would reopen the
   privacy question above (public app + real data = the genericization
   pass needs to be bulletproof, not just good-enough for a local file).
   Not started; don't begin this without deciding #1 first, since the
   answer changes what "done" looks like.
3. **Stretch, none started, pick based on what's most useful for
   interviews:**
   - Visual regression testing (Playwright screenshot diffing)
   - Accessibility checks in CI (axe)
   - Dedicated pace/HR charts and/or a per-activity detail view (HR data
     already exists in `wellness.json`, but there's no historical HR chart
     or drill-down yet)
4. **Known, minor, already-accepted rough edge:** dark-mode toggle scrolls
   off-screen in the collapsed mobile nav at ~390px width. Still functional,
   still tested, just not discoverable without scrolling. Not blocking
   anything — fix opportunistically if touching that area, not a standalone
   priority.

## Known failure modes (watch for these)

1. Fighting Garmin's API before there's a reason to — still a trap even
   post-sync: don't add new Garmin endpoints/data speculatively, add them
   when a specific feature needs them.
2. Building too much and abandoning it — the stretch list above is options,
   not a queue to clear. Ship one thing, then decide the next, same as v1's
   milestone discipline.
3. Using this project to postpone sending applications — it supports
   applications, it doesn't replace them.
