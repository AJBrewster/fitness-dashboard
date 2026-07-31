import { test, expect } from '@playwright/test';

// Values below match src/data/activities.json, the committed synthetic
// fixture — deterministic on purpose, see PLAN.md's Data strategy.

test('dashboard loads', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Fitness Dashboard' })).toBeVisible();
});

test('summary renders real numbers', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  // Assert via data-testid, not getByText: a summary value can
  // coincidentally match text Recharts renders elsewhere in the SVG
  // (axis ticks, tooltip markup), which trips Playwright's strict-mode
  // "multiple elements" check — hit this for real before testids existed.
  await expect(page.getByTestId('total-distance')).toHaveText('73.6 km');
  await expect(page.getByTestId('total-duration')).toHaveText('10h 7m');
  await expect(page.getByTestId('activity-count')).toHaveText('14');
  await expect(page.getByTestId('streak')).toHaveText('3 days');
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

test('wellness summary renders real numbers', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
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
});

test('trend charts render', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
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
