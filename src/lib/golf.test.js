import { describe, it, expect } from 'vitest';
import {
  getHoleResult,
  hasHoleData,
  getRoundSummary,
  getScoreDistribution,
  getScoringByPar,
  getPuttingStats,
  getScoringTrend,
  getHoleAverages,
  getNineSplit,
} from './golf.js';

// Small hand-built rounds rather than the committed fixture: each test states
// exactly the shape it depends on, so a fixture edit can't quietly change what
// a unit test is asserting. The fixture-pinned assertions live in the e2e
// suite, which is where fixture coupling belongs.
function hole(overrides) {
  return { hole: 1, par: 4, score: 4, putts: 2, fairway: true, gir: true, penalties: 0, ...overrides };
}

function round(holes, overrides = {}) {
  return {
    date: '2026-07-01',
    course: 'Test Course',
    tees: 'White',
    holes: holes.map((h, i) => ({ ...h, hole: i + 1 })),
    ...overrides,
  };
}

// A round as the Golf Pad round-level CSV can express it: totals only, no
// per-hole rows. See the header comment in golf.js.
function summaryRound(overrides = {}, summaryOverrides = {}) {
  return {
    date: '2026-08-02',
    course: 'Imported Course',
    tees: 'White',
    source: 'golfpad',
    summary: {
      holesPlayed: 18,
      score: 88,
      par: 72,
      putts: 34,
      girCount: 6,
      fairwaysHit: 7,
      fairwayAttempts: 14,
      penalties: 3,
      sandShots: 2,
      ...summaryOverrides,
    },
    ...overrides,
  };
}

describe('hasHoleData', () => {
  it('is true only for a round carrying holes', () => {
    expect(hasHoleData(round([hole({})]))).toBe(true);
    expect(hasHoleData(summaryRound())).toBe(false);
  });

  it('treats an empty holes array as no hole data', () => {
    expect(hasHoleData({ date: '2026-01-01', course: 'X', holes: [] })).toBe(false);
  });
});

describe('getRoundSummary for a summary-only round', () => {
  it('passes the round-level totals straight through', () => {
    const summary = getRoundSummary(summaryRound());
    expect(summary.score).toBe(88);
    expect(summary.par).toBe(72);
    expect(summary.toPar).toBe(16);
    expect(summary.putts).toBe(34);
    expect(summary.holesPlayed).toBe(18);
  });

  it('derives the percentages it can from the totals', () => {
    const summary = getRoundSummary(summaryRound());
    expect(summary.girPct).toBe(33.3); // 6 of 18
    expect(summary.firPct).toBe(50); // 7 of 14
  });

  it('returns null — not zero — for anything needing per-hole rows', () => {
    const summary = getRoundSummary(summaryRound());
    // The Golf Pad round-level export carries no per-hole putts or GIR
    // flags, so these are unknown rather than absent.
    expect(summary.onePutts).toBeNull();
    expect(summary.threePutts).toBeNull();
    expect(summary.scramblingPct).toBeNull();
  });

  it('treats a missing penalties total as zero', () => {
    const summary = getRoundSummary(summaryRound({}, { penalties: undefined }));
    expect(summary.penalties).toBe(0);
  });

  it('returns null firPct — not Infinity — when the CSV never carried fairway attempts', () => {
    // Golf Pad's real round-level export has no fairway-attempts column at
    // all, so fairwayAttempts is `null`, not 0. `5 / null` is `Infinity` in
    // JS, so a percentage() guard that only checks `total === 0` lets this
    // slip through and render "Infinity%" — regression coverage for that.
    const summary = getRoundSummary(summaryRound({}, { fairwayAttempts: null }));
    expect(summary.firPct).toBeNull();
    expect(summary.firPct).not.toBe(Infinity);
  });

  it('returns the same field set as a hole-by-hole round', () => {
    // The two shapes must be interchangeable to callers — GolfSummary.jsx
    // reads one object either way.
    const fromHoles = Object.keys(getRoundSummary(round([hole({})]))).sort();
    const fromSummary = Object.keys(getRoundSummary(summaryRound())).sort();
    expect(fromSummary).toEqual(fromHoles);
  });
});

describe('aggregates over a mixed-fidelity list', () => {
  const mixed = [
    round([hole({ par: 4, score: 4 }), hole({ par: 4, score: 5 })]),
    summaryRound(),
  ];

  it('counts only holes that exist, without throwing on the summary round', () => {
    expect(getScoreDistribution(mixed)).toEqual([
      { label: 'Eagle+', count: 0 },
      { label: 'Birdie', count: 0 },
      { label: 'Par', count: 1 },
      { label: 'Bogey', count: 1 },
      { label: 'Double+', count: 0 },
    ]);
  });

  it('scopes scoring-by-par to the hole-bearing rounds', () => {
    expect(getScoringByPar(mixed)).toEqual([{ par: 4, holes: 2, avgToPar: 0.5 }]);
  });

  it('scopes putting stats to the hole-bearing rounds', () => {
    expect(getPuttingStats(mixed).holesCounted).toBe(2);
  });

  it('skips summary-only rounds in per-hole averages', () => {
    const rounds = [
      round([hole({ par: 4, score: 5 })], { course: 'Course A' }),
      summaryRound({ course: 'Course A' }),
    ];
    expect(getHoleAverages(rounds, 'Course A')).toEqual([
      { hole: 1, par: 4, played: 1, avgToPar: 1 },
    ]);
  });

  it('still plots every round on the scoring trend', () => {
    // This is the panel that keeps working on imported data — the whole
    // point of supporting the second shape.
    expect(getScoringTrend(mixed).map((r) => r.date)).toEqual(['2026-07-01', '2026-08-02']);
  });
});

describe('getHoleResult', () => {
  it('buckets a hole against its par', () => {
    expect(getHoleResult(3, 5)).toBe('eagle');
    expect(getHoleResult(3, 4)).toBe('birdie');
    expect(getHoleResult(4, 4)).toBe('par');
    expect(getHoleResult(5, 4)).toBe('bogey');
    expect(getHoleResult(6, 4)).toBe('double');
  });

  it('folds an albatross into eagle and anything past a double into double', () => {
    expect(getHoleResult(2, 5)).toBe('eagle');
    expect(getHoleResult(9, 4)).toBe('double');
  });
});

describe('getRoundSummary', () => {
  it('totals score, par, and to-par across the holes played', () => {
    const summary = getRoundSummary(
      round([hole({ par: 4, score: 5 }), hole({ par: 3, score: 3, fairway: null }), hole({ par: 5, score: 7 })]),
    );
    expect(summary.score).toBe(15);
    expect(summary.par).toBe(12);
    expect(summary.toPar).toBe(3);
    expect(summary.holesPlayed).toBe(3);
  });

  it('excludes par 3s from fairway attempts rather than counting them as misses', () => {
    const summary = getRoundSummary(
      round([
        hole({ par: 4, fairway: true }),
        hole({ par: 3, fairway: null }),
        hole({ par: 3, fairway: null }),
        hole({ par: 5, fairway: false }),
      ]),
    );
    expect(summary.fairwayAttempts).toBe(2);
    expect(summary.fairwaysHit).toBe(1);
    expect(summary.firPct).toBe(50);
  });

  it('counts scrambling as par-or-better on a missed green', () => {
    const summary = getRoundSummary(
      round([
        hole({ par: 4, score: 4, gir: false, putts: 1 }), // up and down — scramble
        hole({ par: 4, score: 5, gir: false }), // missed green, dropped a shot
        hole({ par: 4, score: 4, gir: true }), // green in regulation, not a scramble
      ]),
    );
    expect(summary.scramblingPct).toBe(50);
  });

  it('returns null scrambling when every green was hit in regulation', () => {
    const summary = getRoundSummary(round([hole({ gir: true }), hole({ gir: true })]));
    expect(summary.scramblingPct).toBeNull();
  });

  it('ignores holes where putts were not recorded', () => {
    const summary = getRoundSummary(
      round([hole({ putts: 2 }), hole({ putts: null }), hole({ putts: 3 })]),
    );
    expect(summary.putts).toBe(5);
    expect(summary.threePutts).toBe(1);
    expect(summary.onePutts).toBe(0);
  });

  it('treats a missing penalties field as zero', () => {
    const holes = [hole({ penalties: undefined }), hole({ penalties: 2 })];
    expect(getRoundSummary(round(holes)).penalties).toBe(2);
  });

  it('reports green-in-regulation percentage over all holes played', () => {
    const summary = getRoundSummary(round([hole({ gir: true }), hole({ gir: false }), hole({ gir: false })]));
    expect(summary.girCount).toBe(1);
    expect(summary.girPct).toBe(33.3);
  });
});

describe('getScoreDistribution', () => {
  it('buckets holes by score relative to par', () => {
    const rounds = [
      round([
        hole({ par: 5, score: 3 }), // eagle
        hole({ par: 4, score: 3 }), // birdie
        hole({ par: 4, score: 4 }), // par
        hole({ par: 4, score: 5 }), // bogey
        hole({ par: 4, score: 6 }), // double
        hole({ par: 4, score: 8 }), // worse than double, still Double+
      ]),
    ];
    expect(getScoreDistribution(rounds)).toEqual([
      { label: 'Eagle+', count: 1 },
      { label: 'Birdie', count: 1 },
      { label: 'Par', count: 1 },
      { label: 'Bogey', count: 1 },
      { label: 'Double+', count: 2 },
    ]);
  });

  it('returns every label at zero for no rounds, so the chart keeps its bars', () => {
    expect(getScoreDistribution([])).toEqual([
      { label: 'Eagle+', count: 0 },
      { label: 'Birdie', count: 0 },
      { label: 'Par', count: 0 },
      { label: 'Bogey', count: 0 },
      { label: 'Double+', count: 0 },
    ]);
  });

  it('combines holes across multiple rounds', () => {
    const rounds = [round([hole({ par: 4, score: 4 })]), round([hole({ par: 4, score: 4 })])];
    expect(getScoreDistribution(rounds).find((row) => row.label === 'Par').count).toBe(2);
  });
});

describe('getScoringByPar', () => {
  it('averages to-par within each par value, ordered by par', () => {
    const rounds = [
      round([
        hole({ par: 3, score: 3, fairway: null }),
        hole({ par: 3, score: 4, fairway: null }),
        hole({ par: 4, score: 6 }),
        hole({ par: 5, score: 5 }),
      ]),
    ];
    expect(getScoringByPar(rounds)).toEqual([
      { par: 3, holes: 2, avgToPar: 0.5 },
      { par: 4, holes: 1, avgToPar: 2 },
      { par: 5, holes: 1, avgToPar: 0 },
    ]);
  });

  it('returns an empty list when there are no rounds', () => {
    expect(getScoringByPar([])).toEqual([]);
  });
});

describe('getPuttingStats', () => {
  it('normalises putts per round to 18 holes', () => {
    // Nine holes at exactly 2 putts each is a 36-putt pace.
    const rounds = [round(Array.from({ length: 9 }, () => hole({ putts: 2 })))];
    expect(getPuttingStats(rounds).puttsPerRound).toBe(36);
  });

  it('averages putts per green in regulation over GIR holes only', () => {
    const rounds = [
      round([
        hole({ gir: true, putts: 2 }),
        hole({ gir: true, putts: 1 }),
        hole({ gir: false, putts: 3 }), // excluded from puttsPerGir
      ]),
    ];
    expect(getPuttingStats(rounds).puttsPerGir).toBe(1.5);
  });

  it('rates one- and three-putts over holes where putts were recorded', () => {
    const rounds = [
      round([hole({ putts: 1 }), hole({ putts: 2 }), hole({ putts: 3 }), hole({ putts: null })]),
    ];
    const stats = getPuttingStats(rounds);
    expect(stats.holesCounted).toBe(3);
    expect(stats.onePuttRate).toBe(33.3);
    expect(stats.threePuttRate).toBe(33.3);
  });

  it('counts four-putts toward the three-putt rate', () => {
    const rounds = [round([hole({ putts: 4 }), hole({ putts: 2 })])];
    expect(getPuttingStats(rounds).threePuttRate).toBe(50);
  });

  it('returns nulls rather than NaN when no putts were recorded at all', () => {
    const rounds = [round([hole({ putts: null })])];
    expect(getPuttingStats(rounds)).toEqual({
      puttsPerRound: null,
      puttsPerGir: null,
      onePuttRate: null,
      threePuttRate: null,
      holesCounted: 0,
    });
  });
});

describe('getScoringTrend', () => {
  it('sorts rounds by date ascending regardless of input order', () => {
    const rounds = [
      round([hole({ par: 4, score: 5 })], { date: '2026-07-10' }),
      round([hole({ par: 4, score: 4 })], { date: '2026-06-01' }),
      round([hole({ par: 4, score: 6 })], { date: '2026-08-02' }),
    ];
    expect(getScoringTrend(rounds).map((r) => r.date)).toEqual(['2026-06-01', '2026-07-10', '2026-08-02']);
  });

  it('carries holes played so a 9-hole round can be labelled as one', () => {
    const rounds = [round(Array.from({ length: 9 }, () => hole({})))];
    expect(getScoringTrend(rounds)[0].holesPlayed).toBe(9);
  });

  it('returns an empty list when there are no rounds', () => {
    expect(getScoringTrend([])).toEqual([]);
  });
});

describe('getHoleAverages', () => {
  it('averages each hole across rounds at the requested course only', () => {
    const rounds = [
      round([hole({ par: 4, score: 5 }), hole({ par: 3, score: 3, fairway: null })], { course: 'Course A' }),
      round([hole({ par: 4, score: 7 }), hole({ par: 3, score: 3, fairway: null })], { course: 'Course A' }),
      round([hole({ par: 4, score: 4 }), hole({ par: 3, score: 3, fairway: null })], { course: 'Course B' }),
    ];
    expect(getHoleAverages(rounds, 'Course A')).toEqual([
      { hole: 1, par: 4, played: 2, avgToPar: 2 }, // +1 then +3
      { hole: 2, par: 3, played: 2, avgToPar: 0 },
    ]);
  });

  it('returns an empty list for a course with no rounds', () => {
    const rounds = [round([hole({})], { course: 'Course A' })];
    expect(getHoleAverages(rounds, 'Course C')).toEqual([]);
  });

  it('counts only the rounds where a hole was actually played', () => {
    const rounds = [
      round([hole({ par: 4, score: 5 }), hole({ par: 4, score: 5 })], { course: 'Course A' }),
      round([hole({ par: 4, score: 5 })], { course: 'Course A' }), // 1-hole round
    ];
    const [first, second] = getHoleAverages(rounds, 'Course A');
    expect(first.played).toBe(2);
    expect(second.played).toBe(1);
  });
});

describe('getNineSplit', () => {
  it('splits an 18-hole round into front and back totals', () => {
    const holes = [
      ...Array.from({ length: 9 }, () => hole({ par: 4, score: 5 })),
      ...Array.from({ length: 9 }, () => hole({ par: 4, score: 4 })),
    ];
    expect(getNineSplit(round(holes))).toEqual({
      front: { score: 45, par: 36, toPar: 9 },
      back: { score: 36, par: 36, toPar: 0 },
    });
  });

  it('returns a null back nine for a 9-hole round', () => {
    const holes = Array.from({ length: 9 }, () => hole({ par: 4, score: 5 }));
    const split = getNineSplit(round(holes));
    expect(split.front).toEqual({ score: 45, par: 36, toPar: 9 });
    expect(split.back).toBeNull();
  });

  it('returns null entirely for a summary-only round', () => {
    // No holes means no nines to split — null rather than a pair of zeroed
    // objects that would render as a real "+0".
    expect(getNineSplit(summaryRound())).toBeNull();
  });
});
