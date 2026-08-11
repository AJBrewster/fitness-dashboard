import { test, expect } from '@playwright/test';

// Values below match src/data/golfRounds.json, the committed synthetic
// fixture — coupled on purpose, same as the rest of this suite. If the
// fixture changes, these change with it.
//
// The fixture is deliberately mixed-fidelity: six hand-entered hole-by-hole
// rounds plus one summary-only round (2026-08-02) in the shape Golf Pad's
// free-tier round-level export produces. Since the picker defaults to the
// most recent round, the view opens on that summary-only round — so the
// degraded state is the default here, and the tests that need a scorecard
// select a hole-bearing round explicitly.

const FULL_ROUND = '2026-07-19'; // hole-by-hole, 82 (+10) at Course A

async function goToGolf(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Golf', exact: true }).click();
}

async function selectRound(page, date) {
  await page.getByTestId('round-select').selectOption(date);
}

test('the KPI row reports the most recent round, even when it has no hole data', async ({ page }) => {
  await goToGolf(page);
  // 2026-08-02, imported: totals are known...
  await expect(page.getByTestId('golf-score')).toHaveText('87');
  await expect(page.getByTestId('golf-putts')).toHaveText('35');
  await expect(page.getByTestId('golf-gir')).toHaveText('27.8');
  // ...but scrambling needs per-hole GIR flags, so it reads as unknown
  // rather than as a zero the round never earned.
  await expect(page.getByTestId('golf-scrambling')).toHaveText('—');
});

test('a summary-only round replaces the scorecard with an explanation', async ({ page }) => {
  await goToGolf(page);
  await expect(page.getByTestId('scorecard')).toHaveCount(0);
  await expect(page.getByTestId('panel-unavailable').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Scorecard' })).toBeVisible();
});

test('selecting a hole-by-hole round brings the scorecard back', async ({ page }) => {
  await goToGolf(page);
  await selectRound(page, FULL_ROUND);

  await expect(page.getByTestId('golf-score')).toHaveText('82');
  await expect(page.getByTestId('golf-scrambling')).toHaveText('10');

  const scorecard = page.getByTestId('scorecard');
  await expect(scorecard.locator('.score-marker')).toHaveCount(18);
  await expect(scorecard.getByText('Out')).toBeVisible();
  await expect(scorecard.getByText('In')).toBeVisible();
});

test('the scorecard drops the back nine for a 9-hole round', async ({ page }) => {
  await goToGolf(page);
  await selectRound(page, '2026-07-05');

  const scorecard = page.getByTestId('scorecard');
  await expect(scorecard.locator('.score-marker')).toHaveCount(9);
  await expect(scorecard.getByText('Out')).toBeVisible();
  // Not merely empty — the whole back nine is absent, matching getNineSplit
  // returning a null back rather than a zeroed-out one.
  await expect(scorecard.getByText('In')).toHaveCount(0);
});

test('selecting a different round changes the KPI row', async ({ page }) => {
  await goToGolf(page);
  await selectRound(page, FULL_ROUND);
  await expect(page.getByTestId('golf-score')).toHaveText('82');

  // The opening round of the fixture: 92 (+20) at Course A.
  await selectRound(page, '2026-05-10');
  await expect(page.getByTestId('golf-score')).toHaveText('92');
  await expect(page.getByTestId('golf-putts')).toHaveText('39');
});

test('an eagle is marked on the scorecard and named in text', async ({ page }) => {
  await goToGolf(page);
  // 2026-06-21 is the round with the par-5 third played in 3.
  await selectRound(page, '2026-06-21');

  const scorecard = page.getByTestId('scorecard');
  await expect(scorecard.locator('.marker-eagle')).toHaveCount(1);
  // The shape is never the only encoding — the result is spoken too.
  await expect(scorecard.getByText('eagle or better')).toHaveCount(1);
});

test('the aggregate charts render, scoped to their own wrappers', async ({ page }) => {
  await goToGolf(page);
  // Scoped per chart: the page has two bar charts and a line chart, and an
  // unscoped .recharts-bar-rectangle would match both bar charts at once.
  await expect(page.locator('.chart-score-distribution .recharts-bar-rectangle')).toHaveCount(5);
  await expect(page.locator('.chart-scoring-by-par .recharts-bar-rectangle')).toHaveCount(3);
  // Seven rounds, including the summary-only one — the trend is the panel
  // that keeps working on round-level data.
  await expect(page.locator('.chart-scoring-trend .recharts-line-dots circle')).toHaveCount(7);
});

test('the per-hole aggregates ignore the summary-only round entirely', async ({ page }) => {
  await goToGolf(page);
  // 97 holes across the six hand-entered rounds; the imported round adds
  // none, so these are unchanged by its presence in the window.
  await expect(page.getByTestId('putts-per-round')).toHaveText('38.2');
  await expect(page.getByTestId('putts-per-gir')).toHaveText('2.22');
  await expect(page.getByTestId('three-putt-rate')).toHaveText('20.6');
});

test('the momentum panel reports bounce-back, birdie conversion, and blow-up rates', async ({ page }) => {
  await goToGolf(page);
  // Aggregated over the six hand-entered rounds in the default (all) window;
  // the summary-only round contributes no holes. Values match golfRounds.json:
  // bounce-backs 2/64, birdie conversions (on GIR) 3/32, blow-ups 17/99.
  // The window can't be narrowed to summary-only-only rounds through the
  // picker (the summary round is the most recent and every window keeps some
  // hole-bearing rounds), so the panel's stand-down path is covered by the
  // null-returning unit tests rather than here.
  await expect(page.getByTestId('bounce-back-rate')).toHaveText('3.1');
  await expect(page.getByTestId('birdie-conversion-rate')).toHaveText('9.4');
  await expect(page.getByTestId('blow-up-rate')).toHaveText('17.2');
});

test('narrowing the round window drops the oldest rounds from the aggregates', async ({ page }) => {
  await goToGolf(page);
  await expect(page.locator('.chart-scoring-trend .recharts-line-dots circle')).toHaveCount(7);

  await page.getByTestId('rounds-shown-select').selectOption('5');
  await expect(page.locator('.chart-scoring-trend .recharts-line-dots circle')).toHaveCount(5);

  // The selected round drives the KPI row, so narrowing the aggregate window
  // must not disturb it.
  await expect(page.getByTestId('golf-score')).toHaveText('87');
});
