---
name: playwright
description: >-
  Browser automation and e2e testing for fitness-dashboard. Use when asked to
  verify a change in the browser, reproduce a UI bug, screenshot a page, or
  author/update a Playwright spec — anything that means "drive the app and
  tell me what happened." This repo has no browser-automation MCP server, so
  this skill drives the CLI directly and mirrors the existing spec style
  rather than exploring the DOM live.
---

# Playwright (fitness-dashboard)

There's no `playwright-test` MCP server wired into this repo (check `.mcp.json`
— none exists) and no Playwright browser agent. Drive the browser by
**writing/running a spec via the CLI** and reading back only the result.

## Running

The config (`playwright.config.js`) auto-starts the dev server on **:5173**
(`reuseExistingServer: !process.env.CI` — reuses one you already have running
locally, always fresh in CI). You don't need to start `npm run dev` yourself.

```bash
cd /Users/alexbrewster/code/fitness-dashboard
npx playwright test e2e/smoke.spec.js              # one file
npx playwright test --grep @smoke                  # smoke tier only (what CI runs)
npx playwright test -g "weekly distance chart"      # by title
npx playwright test e2e/filters.spec.js --trace on  # capture a trace on pass+fail
npm run report                                      # open the last HTML report
```

Report back pass/fail and, on failure, the assertion error plus the
`test-results/.../trace.zip` or screenshot path — don't paste the full runner
log.

## Read the source, don't discover it in the browser

The app is fixture-driven and entirely in this repo — derive locators and
expected values from source rather than poking around live:

- **Page structure / headings / testids** → the component itself
  (`src/components/*.jsx`). `App.jsx` wires everything together and is the
  place to check what's actually rendered on `/`.
- **Expected values to assert on** → the committed fixture, `src/data/*.json`
  (not `*.local.json` — that's gitignored and not what the dev/test server
  reads). `src/lib/stats.js` is the pure-function source of truth for
  anything derived (totals, streak, weekly buckets, activity-type counts) —
  read it (or its Vitest suite) rather than eyeballing a screenshot to get a
  number right.
- **Formatting** (so text assertions match exactly) → `stats.js`/component
  render code for units (km, "Xh Ym", "N days" vs "1 day" singular).

## Fixture is deterministic — exploit that

Assertions are pinned to `src/data/activities.json` / `wellness.json` /
`vo2MaxTrend.json` / `weighIns.json`, the small hand-written synthetic
fixtures — not the real `.local.json` data. That's why existing specs assert
exact values like `'73.6 km'` or `'61'` for training readiness. If a fixture
changes, the specs asserting against it need updating too — check `git diff`
on `src/data/*.json` before trusting an existing assertion still holds.

## Writing specs — match the existing suite

Read `e2e/smoke.spec.js` and `e2e/filters.spec.js` before writing; mirror
them; add a comment when an assertion's expected value comes from a
non-obvious fixture calculation (both existing files do this).

- `import { test, expect } from '@playwright/test';` — no custom fixtures or
  setup helpers exist here (no DB, nothing to reset between tests).
- `fullyParallel: true` — tests don't share mutable state, so don't add any
  (no global date-range persistence across tests, etc.).
- Tag tests that should run in CI's fast path with `{ tag: '@smoke' }` as the
  second argument to `test(...)`; leave broader/slower coverage untagged (it
  still runs via `npm run test:e2e`, just not in CI yet — see
  `.github/workflows/ci.yml`).
- **`data-testid` for numeric/text values, not `getByText`.** A summary value
  can coincidentally match text Recharts renders elsewhere in the SVG (axis
  ticks, tooltip markup) and trip Playwright's strict-mode "multiple
  elements" error — hit for real in this repo. Use `getByTestId` for stats,
  `getByRole`/`getByLabel` for interactive elements (headings, buttons,
  `<input type="date">` via their `<label>` text).
- **Scope every chart-dot/bar assertion to that chart's wrapper class**
  (`.chart-weekly-distance .recharts-line-dots circle`, `.chart-activity-types
  .recharts-bar-rectangle`, etc.) — a bare `.recharts-line-dots circle` or
  `.recharts-bar-rectangle` matches every chart on the page once there's more
  than one. Adding a new chart component means giving it its own
  `chart-<name>` class and using it here, same as `CLAUDE.md`'s Architecture
  section documents.
- **Recharts animates the line draw-in on mount** (~1.5s). Assert on
  `.recharts-line-dots circle` counts, not a screenshot or the path itself —
  dots are placed at final position immediately; the connecting line isn't.
  Don't add a fixed `waitForTimeout` to work around this — assert on dots
  instead, like the existing specs do.
- File goes in `e2e/`, named `<feature>.spec.js`. `vite.config.js` excludes
  `e2e/**` from Vitest's glob — don't rename in a way that breaks that
  boundary (see its comment).

## Throwaway visual check

When you only need to *see* a page, not keep a test:

```js
// e2e/_scratch.spec.js — delete after use
import { test } from '@playwright/test';
test('scratch', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'test-results/scratch.png', fullPage: true });
});
```

Run it, `Read` `test-results/scratch.png`, then delete the scratch file.

## Before calling a change done

```bash
npm run test:e2e:smoke   # fast tier, mirrors CI
npm run test:e2e         # full suite, run when filters.spec.js territory is touched
```
