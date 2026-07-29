import { test, expect } from '@playwright/test';

// Values below match src/data/activities.json, the committed synthetic
// fixture — deterministic on purpose, see PLAN.md's Data strategy.
// 2026-06-08..2026-06-14 covers exactly 3 activities (8000m + 20000m +
// 2400m = 30400m; 2400s + 3000s + 3600s = 9000s), the same week bucket
// the weekly chart shows as 30.4km at weekStart 2026-06-08.
//
// Assertions on summary numbers use data-testid, not getByText: a
// filtered value can coincidentally match text Recharts renders
// elsewhere in the SVG (axis ticks, tooltip markup), which trips
// Playwright's strict-mode "multiple elements" check.

test('filtering by date range updates the summary and chart', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('From').fill('2026-06-08');
  await page.getByLabel('To').fill('2026-06-14');

  await expect(page.getByTestId('total-distance')).toHaveText('30.4 km');
  await expect(page.getByTestId('total-duration')).toHaveText('2h 30m');
  await expect(page.getByTestId('activity-count')).toHaveText('3');
  await expect(page.getByTestId('streak')).toHaveText('3 days');
  await expect(page.locator('.recharts-line-dots circle')).toHaveCount(1);
});

test('clearing the date range shows all activities again', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('From').fill('2026-06-08');
  await page.getByLabel('To').fill('2026-06-14');
  await expect(page.getByTestId('total-distance')).toHaveText('30.4 km');

  await page.getByLabel('From').fill('');
  await page.getByLabel('To').fill('');

  await expect(page.getByTestId('total-distance')).toHaveText('73.6 km');
  await expect(page.getByTestId('streak')).toHaveText('3 days');
  await expect(page.locator('.recharts-line-dots circle')).toHaveCount(5);
});

test('a range with no matching activities shows a zeroed-out summary', async ({ page }) => {
  await page.goto('/');

  // January has no activities in the fixture at all.
  await page.getByLabel('From').fill('2026-01-01');
  await page.getByLabel('To').fill('2026-01-31');

  await expect(page.getByTestId('total-distance')).toHaveText('0.0 km');
  await expect(page.getByTestId('total-duration')).toHaveText('0h 0m');
  await expect(page.getByTestId('activity-count')).toHaveText('0');
  await expect(page.getByTestId('streak')).toHaveText('0 days');
  await expect(page.locator('.recharts-line-dots circle')).toHaveCount(0);
});

test('only one end of the range filled leaves activities unfiltered', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('From').fill('2026-06-08');
  // "To" left empty on purpose — App.jsx only applies the filter once both
  // start and end are set.

  await expect(page.getByTestId('total-distance')).toHaveText('73.6 km');
  await expect(page.locator('.recharts-line-dots circle')).toHaveCount(5);
});

test('a single-day range narrows to exactly that day\'s activity', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('From').fill('2026-06-01');
  await page.getByLabel('To').fill('2026-06-01');

  await expect(page.getByTestId('total-distance')).toHaveText('3.2 km');
  await expect(page.getByTestId('total-duration')).toHaveText('0h 35m');
  await expect(page.getByTestId('activity-count')).toHaveText('1');
  await expect(page.getByTestId('streak')).toHaveText('1 day');
  await expect(page.locator('.recharts-line-dots circle')).toHaveCount(1);
});
