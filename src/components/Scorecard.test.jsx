// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Scorecard from './Scorecard';

// The per-file pragma above keeps stats.test.js and golf.test.js running under
// the faster default `node` environment — same pattern as ScoreRing.test.jsx.
//
// Auto-cleanup only runs when Vitest's `globals` option is on, and it isn't
// here — without this the previous test's DOM is still mounted and every
// getByText finds two matches.
afterEach(cleanup);

function round(holes) {
  return {
    date: '2026-07-01',
    course: 'Test Course',
    tees: 'White',
    holes: holes.map((hole, i) => ({
      hole: i + 1,
      par: 4,
      score: 4,
      putts: 2,
      fairway: true,
      gir: true,
      penalties: 0,
      ...hole,
    })),
  };
}

const nineHoles = () => Array.from({ length: 9 }, () => ({}));

describe('Scorecard', () => {
  it('renders a back nine for an 18-hole round', () => {
    render(<Scorecard round={round(Array.from({ length: 18 }, () => ({})))} />);
    expect(screen.getByText('Out')).toBeDefined();
    expect(screen.getByText('In')).toBeDefined();
  });

  it('omits the back nine entirely for a 9-hole round', () => {
    render(<Scorecard round={round(nineHoles())} />);
    expect(screen.getByText('Out')).toBeDefined();
    expect(screen.queryByText('In')).toBeNull();
  });

  it('marks each hole with the class its result maps to', () => {
    const holes = nineHoles();
    holes[0] = { par: 5, score: 3 }; // eagle
    holes[1] = { par: 4, score: 3 }; // birdie
    holes[2] = { par: 4, score: 5 }; // bogey
    holes[3] = { par: 4, score: 7 }; // worse than double, still `double`
    const { container } = render(<Scorecard round={round(holes)} />);

    expect(container.querySelectorAll('.marker-eagle')).toHaveLength(1);
    expect(container.querySelectorAll('.marker-birdie')).toHaveLength(1);
    expect(container.querySelectorAll('.marker-bogey')).toHaveLength(1);
    expect(container.querySelectorAll('.marker-double')).toHaveLength(1);
    expect(container.querySelectorAll('.marker-par')).toHaveLength(5);
  });

  it('names each result in text so the shape is never the only encoding', () => {
    const holes = nineHoles();
    holes[0] = { par: 4, score: 3 };
    render(<Scorecard round={round(holes)} />);
    expect(screen.getByText('birdie')).toBeDefined();
  });

  it('explains itself instead of rendering an empty table for a summary-only round', () => {
    const { container } = render(
      <Scorecard round={{ date: '2026-08-02', course: 'Imported', summary: { score: 87 } }} />,
    );
    expect(container.querySelector('table')).toBeNull();
    expect(screen.getByTestId('panel-unavailable')).toBeDefined();
  });

  it('shows a dash for a hole where putts were not recorded', () => {
    const holes = nineHoles();
    holes[0] = { putts: null };
    render(<Scorecard round={round(holes)} />);
    // A dash, not a 0 — "not recorded" is a different claim from "no putts".
    expect(screen.getByText('–')).toBeDefined();
  });
});
