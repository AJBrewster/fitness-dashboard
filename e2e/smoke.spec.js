import { test, expect } from '@playwright/test';

// Values below match the committed synthetic fixtures in src/data/ —
// deterministic on purpose, see PLAN.md's Data strategy.

// The app is view-switched, not one long scrolling page (changed 2026-08-05
// when Golf was added). Anything outside the default Activity view has to be
// navigated to first. Sidebar items are real <button>s, so getByRole is the
// natural locator — and note none of the view labels may contain "to" as a
// substring, or they collide with filters.spec.js's getByLabel('To').
async function goToView(page, name) {
  await page.goto('/');
  await page.getByRole('button', { name, exact: true }).click();
}

test('dashboard loads', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Fitness Dashboard' })).toBeVisible();
});

test('sidebar switches views instead of scrolling one long page', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  // Activity is the default view; wellness content is not merely off-screen,
  // it is not rendered at all until its view is selected.
  await expect(page.getByTestId('total-distance')).toBeVisible();
  await expect(page.getByTestId('sleep-score')).toHaveCount(0);

  await page.getByRole('button', { name: "Today's Wellness", exact: true }).click();
  await expect(page.getByTestId('sleep-score')).toBeVisible();
  await expect(page.getByTestId('total-distance')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: "Today's Wellness", level: 2 }).first()).toBeVisible();
});

test('summary renders real numbers', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  // Assert via data-testid, not getByText: a summary value can
  // coincidentally match text Recharts renders elsewhere in the SVG
  // (axis ticks, tooltip markup), which trips Playwright's strict-mode
  // "multiple elements" check — hit this for real before testids existed.
  // The testid sits on the numeral only — the unit is a sibling element so
  // it can be styled down beside an oversized figure (visual redesign,
  // 2026-08-05). Assert both, so demoting the unit visually didn't quietly
  // drop it from the page.
  await expect(page.getByTestId('total-distance')).toHaveText('73.6');
  await expect(page.getByTestId('total-duration')).toHaveText('10h 7m');
  await expect(page.getByTestId('activity-count')).toHaveText('14');
  await expect(page.getByTestId('streak')).toHaveText('3');
  await expect(page.locator('.summary-unit')).toHaveText(['km', 'days']);
});

test('weekly distance chart renders', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  // Recharts animates the line drawing in on mount (see CLAUDE.md's
  // Test strategy gotcha) — assert on the dots rather than a
  // fixed-timeout screenshot, since dots are placed at final position
  // immediately while the connecting line animates in over ~1.5s.
  // Scoped to .chart-weekly-distance: the page now has other line charts
  // too (VO2 max, weight trend), which share the same Recharts dot class.
  await expect(page.locator('.chart-weekly-distance .recharts-line-dots circle')).toHaveCount(5);
});

test('activity type breakdown renders one donut slice and one legend row per type', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  // Replaced the bar chart with a Recharts Pie/donut (visual-redesign
  // Phase 4) — .recharts-pie-sector is Recharts' own per-slice class, same
  // pattern as .recharts-line-dots/.recharts-bar-rectangle elsewhere in
  // this suite. The legend rows are a second, chart-implementation-agnostic
  // assertion covering the same 7 types.
  await expect(page.locator('.chart-activity-types .recharts-pie-sector')).toHaveCount(7);
  await expect(page.getByTestId('activity-type-row')).toHaveCount(7);
});

test('average HR by activity chart renders one bar per HR-bearing type', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  // 6 of the fixture's 7 activity types record HR; strength_training never
  // does, so it's omitted (no average to draw) — hence 6 bars, not 7.
  // Scoped to .chart-hr-by-type: the golf view has bar charts on the same
  // .recharts-bar-rectangle class, so an unscoped selector would over-match.
  await expect(page.locator('.chart-hr-by-type .recharts-bar-rectangle')).toHaveCount(6);
});

test('wellness summary renders real numbers', { tag: '@smoke' }, async ({ page }) => {
  await goToView(page, "Today's Wellness");
  await expect(page.getByTestId('training-readiness')).toHaveText('61');
  // Training Readiness split from one combined sentence into a heading plus
  // a separate status chip when it became a ring gauge (visual-redesign
  // Phase 5) — assert both, via a stable testid on the chip rather than
  // getByText, since chip copy is more likely to be tweaked later than a
  // data-testid is to move.
  await expect(page.getByText('Training readiness')).toBeVisible();
  await expect(page.getByTestId('readiness-status-chip')).toHaveText('Good · Maintaining');
  await expect(page.getByTestId('sleep-score')).toHaveText('70');
  await expect(page.getByTestId('body-battery')).toHaveText('58');
  await expect(page.getByTestId('stress-level')).toHaveText('26');
  await expect(page.getByTestId('resting-hr')).toHaveText('54');
  // Each ring and tile carries a trend sparkline from the full wellness
  // history (3 rings + 2 tiles = 5). Scoped to the wellness section so it
  // doesn't also match the Activity view's summary sparklines.
  await expect(page.locator('.wellness-summary .sparkline')).toHaveCount(5);
  // Hero ring shows a day-over-day delta (last two readiness values: 55 → 61).
  await expect(page.getByTestId('readiness-delta')).toHaveText('▲ 6');
});

test('trend charts render', { tag: '@smoke' }, async ({ page }) => {
  await goToView(page, 'Trends');
  await expect(page.locator('.chart-vo2-max .recharts-line-dots circle')).toHaveCount(4);
  await expect(page.locator('.chart-weight .recharts-line-dots circle')).toHaveCount(5);
});

test('sidebar "Reports" item is a disabled placeholder, not a live link', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  const reports = page.getByRole('button', { name: /reports/i });
  await expect(reports).toBeVisible();
  await expect(reports).toBeDisabled();
  await expect(reports).toContainText('Soon');
});

test('golf view renders the selected round', { tag: '@smoke' }, async ({ page }) => {
  await goToView(page, 'Golf');
  await expect(page.getByRole('heading', { name: 'Golf', level: 2 }).first()).toBeVisible();
  // Defaults to the most recent round in golfRounds.json, which is the
  // summary-only one — so the scorecard stands down and the scoring trend,
  // which works on round totals, does not. See e2e/golf.spec.js.
  await expect(page.getByTestId('golf-score')).toHaveText('87');
  await expect(page.locator('.chart-scoring-trend .recharts-line-dots circle')).toHaveCount(7);
});

test('date filter is hidden on views it cannot affect', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('From')).toBeVisible();
  await page.getByRole('button', { name: 'Golf', exact: true }).click();
  // The From/To inputs only ever filtered the activity summary and charts,
  // so rendering them beside golf would imply a link that isn't there.
  await expect(page.getByLabel('From')).toHaveCount(0);
});
