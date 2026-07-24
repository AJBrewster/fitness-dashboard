import { test, expect } from '@playwright/test';

// Values below match src/data/activities.json, the committed synthetic
// fixture — deterministic on purpose, see PLAN.md's Data strategy.

test('dashboard loads', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Fitness Dashboard' })).toBeVisible();
});

test('summary renders real numbers', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('73.6 km')).toBeVisible();
  await expect(page.getByText('10h 7m')).toBeVisible();
  await expect(page.getByText('Activities')).toBeVisible();
});

test('weekly distance chart renders', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  // Recharts animates the line drawing in on mount (see CLAUDE.md's
  // Test strategy gotcha) — assert on the dots rather than a
  // fixed-timeout screenshot, since dots are placed at final position
  // immediately while the connecting line animates in over ~1.5s.
  await expect(page.locator('.recharts-line-dots circle')).toHaveCount(5);
});
