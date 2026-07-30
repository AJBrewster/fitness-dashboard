---
name: code-review
description: >-
  Review pending changes in fitness-dashboard before they're committed — new
  or modified components, stats.js logic, fixtures, or tests. Use before any
  commit in this repo, when asked to "review my changes" / "check this diff",
  or after drafting code that Alex will own. Checks both general
  correctness/security and this repo's specific conventions (testid
  discipline, chart scoping, fixture boundaries, docs-in-sync) so issues
  surface before they're baked into a commit Alex has to explain to an
  interviewer.
---

# Code review (fitness-dashboard)

This is Alex's SDET portfolio project: **Claude may draft, but Alex reviews,
modifies, and owns every line** (see `CLAUDE.md`'s working agreement). This
skill's job is to catch what a careful human reviewer would catch, before it
reaches Alex — not to rubber-stamp a diff.

## Scope

Get the actual diff first, don't review from memory of what you wrote:

```bash
cd /Users/alexbrewster/code/fitness-dashboard
git status
git diff              # unstaged
git diff --staged     # staged
```

Review only the changed lines and their immediate surroundings — this isn't a
full-repo audit. If a finding depends on code outside the diff, read that file
before flagging it, don't guess.

## General checks (any repo)

- **Correctness** — does the logic do what it claims for edge cases (empty
  arrays, `null`/missing fields, single-item lists), not just the happy path?
- **Security** — no injected HTML/`dangerouslySetInnerHTML` from untrusted
  data, no secrets committed, no `eval`/dynamic `require` of user input. Low
  surface area here (no backend, no auth, fixture-driven data) but check
  anyway.
- **Simplification** — no abstraction the diff doesn't need yet, no dead code
  left behind, no copy-pasted logic that belongs in `stats.js` instead.
- **Test coverage** — new `stats.js` functions get Vitest cases (happy path +
  the edge cases above); new UI surfaces get at least a smoke-test assertion.

## Repo-specific checks

Cross-reference against `CLAUDE.md`'s Architecture section — it documents the
*current* set of gotchas the hard way, so treat a diff that reintroduces one
of these as a real finding, not a style nit:

- **Fixture boundary.** Only `src/lib/data.js` may `import` a fixture JSON
  file. A component or another `lib/` module reaching into
  `src/data/*.json` (or `*.local.json`) directly is a layering violation —
  flag it. `*.local.json` files must never be what `data.js` points at in a
  committed change (gitignored, real-data-only, swap-back-safe by filename).
- **Presentational components stay presentational.** Components like
  `Summary.jsx`, `WeeklyDistanceChart.jsx`, `WellnessSummary.jsx` take data as
  props and don't call `getActivities`/`getWellness`/etc. themselves —
  `App.jsx` computes and passes down. A new component that fetches its own
  data via `lib/data.js` breaks the pattern (and breaks testing the component
  with fake props).
- **`stats.js` stays framework-free.** No React imports, no DOM access — pure
  functions only, so they're unit-testable without rendering.
- **Local vs UTC dates.** Use local-date accessors (`getFullYear`/
  `getMonth`/`getDate`, the `getDateKey` pattern) for anything day-boundary
  sensitive, not `toISOString()` — the latter shifts a day in timezones ahead
  of UTC. (`getWeekStart` is a known, accepted exception — don't copy it into
  new code.)
- **Chart selectors need a wrapper class.** Any new Recharts component needs
  its own `chart-<name>` wrapper class, and any Playwright assertion on its
  dots/bars must be scoped to that class (`.chart-<name> .recharts-line-dots
  circle`), not a bare `.recharts-line-dots circle`/`.recharts-bar-rectangle`
  — those match every chart on the page once there's more than one.
- **Stable test hooks, not positional/text selectors.** New stat values need
  a `data-testid`; Playwright assertions should use `getByTestId`, not
  `.summary-value:last-child` (breaks when a stat is added) or
  `page.getByText(...)` for numbers (can collide with chart SVG `<tspan>`
  text — this has happened for real in this repo).
- **Color conveys nothing alone.** Status-banded values (like Training
  Readiness) must pair color with a text label — the warning/serious steps
  are documented as failing 3:1 contrast on light surfaces by design, with
  the label as the accessibility mitigation. Also: color assignment for
  multi-series charts must be a fixed `type → color` lookup, never derived
  from array position/sort order (position changes when data/filters change;
  color must not silently follow it).
- **Vitest/Playwright file separation.** New test files must land in the
  right place — `src/**/*.test.js` (Vitest) vs `e2e/**/*.spec.js`
  (Playwright). `vite.config.js`'s `test.exclude` depends on `e2e/**` staying
  Playwright-only.
- **Scope discipline.** No auth, database, deployment, mobile, live Garmin
  sync, or multi-user code — these are explicitly deferred (see `PLAN.md`).
  Flag anything that adds them even if it looks like an "improvement." Also
  flag layout/color/typography rework outside a section explicitly scoped as
  the visual-redesign pass — new sections should match existing visual
  conventions, not restyle them.

## Docs-in-sync check

Per the working agreement, docs update *with* the commit, not after. If the
diff adds a component, fixture, gotcha, or milestone, check whether
`CLAUDE.md` (Architecture section), `PLAN.md` (milestone checkboxes), and
`README.md` need a matching update — and say so explicitly if they don't have
one yet.

## Before calling it done

Run the fast checks and report actual results, don't assume they pass:

```bash
npm run lint
npm test                  # Vitest — fast, run every time
npm run test:e2e:smoke    # only if the diff touches components/e2e — slower
```

## Reporting

For a structured finding list (used by `/code-review` and similar flows),
use `ReportFindings`. For an ad-hoc "review my changes" request, a short
prose list is fine — lead with anything that breaks a repo convention above
general style notes, and say plainly if nothing significant was found rather
than manufacturing a nitpick.
