import { test, expect } from '@playwright/test';

// Values below match src/data/activities.json, the committed synthetic
// fixture — deterministic on purpose, see PLAN.md's Data strategy.

test('dashboard loads', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Fitness Dashboard' })).toBeVisible();
});

test('summary renders real numbers', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  const summary = page.locator('.summary');
  // Scoped to `.summary`, not page-wide getByText: a value can
  // coincidentally match text Recharts renders elsewhere in the SVG
  // (axis ticks, tooltip markup), which trips Playwright's strict-mode
  // "multiple elements" check — hit this for real in filters.spec.js.
  await expect(summary.getByText('73.6 km')).toBeVisible();
  await expect(summary.getByText('10h 7m')).toBeVisible();
  await expect(summary.getByText('Activities')).toBeVisible();
});

test('weekly distance chart renders', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');
  // Recharts animates the line drawing in on mount (see CLAUDE.md's
  // Test strategy gotcha) — assert on the dots rather than a
  // fixed-timeout screenshot, since dots are placed at final position
  // immediately while the connecting line animates in over ~1.5s.
  await expect(page.locator('.recharts-line-dots circle')).toHaveCount(5);
});
