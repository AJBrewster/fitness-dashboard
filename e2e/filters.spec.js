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
//
// Chart-dot assertions are scoped to .chart-weekly-distance: the page
// also has other line charts (VO2 max, weight trend) sharing the same
// Recharts dot class, and those aren't affected by the activity filter.

test('filtering by date range updates the summary and chart', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('From').fill('2026-06-08');
  await page.getByLabel('To').fill('2026-06-14');

  await expect(page.getByTestId('total-distance')).toHaveText('30.4 km');
  await expect(page.getByTestId('total-duration')).toHaveText('2h 30m');
  await expect(page.getByTestId('activity-count')).toHaveText('3');
  await expect(page.getByTestId('streak')).toHaveText('3 days');
  await expect(page.locator('.chart-weekly-distance .recharts-line-dots circle')).toHaveCount(1);
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
  await expect(page.locator('.chart-weekly-distance .recharts-line-dots circle')).toHaveCount(5);
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
  await expect(page.locator('.chart-weekly-distance .recharts-line-dots circle')).toHaveCount(0);
});

test('only one end of the range filled leaves activities unfiltered', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('From').fill('2026-06-08');
  // "To" left empty on purpose — App.jsx only applies the filter once both
  // start and end are set.

  await expect(page.getByTestId('total-distance')).toHaveText('73.6 km');
  await expect(page.locator('.chart-weekly-distance .recharts-line-dots circle')).toHaveCount(5);
});

test('a single-day range narrows to exactly that day\'s activity', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('From').fill('2026-06-01');
  await page.getByLabel('To').fill('2026-06-01');

  await expect(page.getByTestId('total-distance')).toHaveText('3.2 km');
  await expect(page.getByTestId('total-duration')).toHaveText('0h 35m');
  await expect(page.getByTestId('activity-count')).toHaveText('1');
  await expect(page.getByTestId('streak')).toHaveText('1 day');
  await expect(page.locator('.chart-weekly-distance .recharts-line-dots circle')).toHaveCount(1);
});

test('the Lifetime preset is active by default and clears a manual range', async ({ page }) => {
  await page.goto('/');

  const lifetimeButton = page.getByRole('button', { name: 'Lifetime' });
  await expect(lifetimeButton).toHaveAttribute('aria-pressed', 'true');

  await page.getByLabel('From').fill('2026-06-08');
  await page.getByLabel('To').fill('2026-06-14');
  await expect(lifetimeButton).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('total-distance')).toHaveText('30.4 km');

  await lifetimeButton.click();

  await expect(lifetimeButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('From')).toHaveValue('');
  await expect(page.getByLabel('To')).toHaveValue('');
  await expect(page.getByTestId('total-distance')).toHaveText('73.6 km');
});

test('the This week preset fills in the current Monday..Sunday range', async ({ page }) => {
  await page.goto('/');

  // Mirrors getCurrentWeekRange's Monday-start math (src/lib/stats.js) so
  // this test stays correct regardless of which real day it runs on —
  // it isn't pinned to the fixture the way the other tests here are. Uses
  // local getFullYear/getMonth/getDate, not toISOString(), for the same
  // UTC-day-shift reason getCurrentWeekRange itself does (see its comment).
  const toDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(monday.getDate() - daysSinceMonday);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const thisWeekButton = page.getByRole('button', { name: 'This week' });
  await expect(thisWeekButton).toHaveAttribute('aria-pressed', 'false');

  await thisWeekButton.click();

  await expect(thisWeekButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('From')).toHaveValue(toDateInputValue(monday));
  await expect(page.getByLabel('To')).toHaveValue(toDateInputValue(sunday));
});
