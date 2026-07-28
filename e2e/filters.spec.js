import { test, expect } from '@playwright/test';

// Values below match src/data/activities.json, the committed synthetic
// fixture — deterministic on purpose, see PLAN.md's Data strategy.
// 2026-06-08..2026-06-14 covers exactly 3 activities (8000m + 20000m +
// 2400m = 30400m; 2400s + 3000s + 3600s = 9000s), the same week bucket
// the weekly chart shows as 30.4km at weekStart 2026-06-08.

test('filtering by date range updates the summary and chart', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('From').fill('2026-06-08');
  await page.getByLabel('To').fill('2026-06-14');

  await expect(page.getByText('30.4 km')).toBeVisible();
  await expect(page.getByText('2h 30m')).toBeVisible();
  await expect(page.locator('.recharts-line-dots circle')).toHaveCount(1);
});

test('clearing the date range shows all activities again', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('From').fill('2026-06-08');
  await page.getByLabel('To').fill('2026-06-14');
  await expect(page.getByText('30.4 km')).toBeVisible();

  await page.getByLabel('From').fill('');
  await page.getByLabel('To').fill('');

  await expect(page.getByText('73.6 km')).toBeVisible();
  await expect(page.locator('.recharts-line-dots circle')).toHaveCount(5);
});
