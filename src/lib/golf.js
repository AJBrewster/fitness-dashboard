// Pure golf math, kept separate from stats.js: that module is activity and
// wellness math over Garmin data, this one is hole-by-hole scorecards. They
// share no inputs, so a single module would just be two domains in one file.
//
// Two definitions worth stating up front, because both are judgement calls
// rather than arithmetic:
//
// 1. SCRAMBLING is counted here as "missed the green in regulation, still
//    made par or better". That is the standard proxy when you only have
//    hole-by-hole data. It is NOT the same as tracking actual up-and-downs,
//    which needs to know where each shot finished.
// 2. There is deliberately NO STROKES GAINED. Real SG needs every shot's
//    starting lie and distance-to-hole, measured against a baseline table.
//    Hole-by-hole scorecards cannot produce it, and a number labelled
//    "strokes gained" that wasn't computed that way would be worse than
//    not having one. (Golf Pad does compute SG, but only for Premium
//    accounts and only in the Premium-tier Shots export — see PLAN.md.)
//
// A round comes in one of two fidelities, and every function here has to
// cope with both:
//
//   { date, course, tees, holes: [...] }    hand-entered, hole-by-hole
//   { date, course, tees, summary: {...} }  imported from Golf Pad's
//                                           round-level CSV export
//
// The round-level export is all the free Golf Pad tier provides — one row
// per round, no per-hole rows — so anything that needs to look at an
// individual hole simply cannot be answered for those rounds. The rule is
// that such fields come back `null` (meaning "not knowable from this
// round") rather than 0, and the aggregate functions skip summary-only
// rounds rather than throwing on a missing `holes` array.

const SCORE_LABELS = ['Eagle+', 'Birdie', 'Par', 'Bogey', 'Double+'];

const LABEL_BY_RESULT = {
  eagle: 'Eagle+',
  birdie: 'Birdie',
  par: 'Par',
  bogey: 'Bogey',
  double: 'Double+',
};

// A hole's score relative to par, bucketed the way a scorecard buckets it.
// Anything two or more under par folds into `eagle` (an albatross is real but
// vanishingly rare, and gets the same double ring nobody would misread);
// anything two or more over folds into `double`.
//
// This lives here rather than in Scorecard.jsx because it is a golf concept,
// not a rendering one — the same bucketing drives both the scorecard markers
// and the score-distribution chart, and having it in two places is how the
// two would eventually disagree.
export function getHoleResult(score, par) {
  const toPar = score - par;
  if (toPar <= -2) return 'eagle';
  if (toPar === -1) return 'birdie';
  if (toPar === 0) return 'par';
  if (toPar === 1) return 'bogey';
  return 'double';
}

function scoreLabel(hole) {
  return LABEL_BY_RESULT[getHoleResult(hole.score, hole.par)];
}

// Par 3s have no fairway to hit, so they carry `fairway: null` and must be
// excluded from the denominator rather than counted as a miss.
function hasFairway(hole) {
  return hole.fairway !== null && hole.fairway !== undefined;
}

// `putts` is null on holes where putts weren't recorded. Those holes are
// excluded from every putting figure rather than counted as zero, which
// would silently flatter the numbers.
function hasPutts(hole) {
  return typeof hole.putts === 'number';
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

// Percentage rounded to one decimal, or null when there's nothing to divide
// by — callers render null as an em dash rather than a misleading 0%.
// `!total` (not `total === 0`) is deliberate: `total` can be `null` for an
// imported round whose CSV never carried the denominator at all (Golf Pad's
// export has no fairway-attempts column — see import_golfpad.py), not just
// legitimately 0. `5 / null` is `Infinity` in JS, not a divide-by-zero
// error, so a strict `=== 0` check alone would let a null total slip
// through and render "Infinity%" instead of the honest "unknown".
function percentage(count, total) {
  if (!total) return null;
  return Math.round((count / total) * 1000) / 10;
}

function average(values) {
  if (values.length === 0) return null;
  return Math.round((sum(values) / values.length) * 100) / 100;
}

// One predicate for "is this round hole-by-hole?", used by both this module
// and the UI, so the question is answered in exactly one place.
export function hasHoleData(round) {
  return Array.isArray(round.holes) && round.holes.length > 0;
}

// Builds the same shape getRoundSummary returns for a hole-by-hole round,
// from the round-level totals the Golf Pad CSV carries. The three fields
// that genuinely need per-hole rows come back null.
function summaryOnlyRound(round) {
  const s = round.summary;
  return {
    date: round.date,
    course: round.course,
    holesPlayed: s.holesPlayed,
    score: s.score,
    par: s.par,
    toPar: s.score - s.par,
    putts: s.putts,
    girCount: s.girCount,
    girPct: percentage(s.girCount, s.holesPlayed),
    fairwaysHit: s.fairwaysHit,
    fairwayAttempts: s.fairwayAttempts,
    firPct: percentage(s.fairwaysHit, s.fairwayAttempts),
    penalties: s.penalties ?? 0,
    // Not knowable without per-hole putt counts and per-hole GIR flags.
    onePutts: null,
    threePutts: null,
    scramblingPct: null,
  };
}

export function getRoundSummary(round) {
  if (!hasHoleData(round)) return summaryOnlyRound(round);

  const { holes } = round;
  const fairwayHoles = holes.filter(hasFairway);
  const puttHoles = holes.filter(hasPutts);
  const girHoles = holes.filter((hole) => hole.gir);
  const missedGreens = holes.filter((hole) => !hole.gir);
  const scrambles = missedGreens.filter((hole) => hole.score <= hole.par);

  const score = sum(holes.map((hole) => hole.score));
  const par = sum(holes.map((hole) => hole.par));
  const fairwaysHit = fairwayHoles.filter((hole) => hole.fairway).length;

  return {
    date: round.date,
    course: round.course,
    holesPlayed: holes.length,
    score,
    par,
    toPar: score - par,
    putts: sum(puttHoles.map((hole) => hole.putts)),
    girCount: girHoles.length,
    girPct: percentage(girHoles.length, holes.length),
    fairwaysHit,
    fairwayAttempts: fairwayHoles.length,
    firPct: percentage(fairwaysHit, fairwayHoles.length),
    penalties: sum(holes.map((hole) => hole.penalties ?? 0)),
    onePutts: puttHoles.filter((hole) => hole.putts === 1).length,
    threePutts: puttHoles.filter((hole) => hole.putts >= 3).length,
    scramblingPct: percentage(scrambles.length, missedGreens.length),
  };
}

// The `?? []` is what makes every aggregate below tolerate a summary-only
// round: it contributes no holes rather than throwing on undefined.
function allHoles(rounds) {
  return rounds.flatMap((round) => round.holes ?? []);
}

// Every label is returned even at count 0, so the distribution chart keeps a
// stable set of bars as the selected round changes instead of reflowing.
export function getScoreDistribution(rounds) {
  const counts = new Map(SCORE_LABELS.map((label) => [label, 0]));
  for (const hole of allHoles(rounds)) {
    const label = scoreLabel(hole);
    counts.set(label, counts.get(label) + 1);
  }
  return SCORE_LABELS.map((label) => ({ label, count: counts.get(label) }));
}

// Average score relative to par, split by par 3 / 4 / 5 — the "where do the
// shots actually leak" view. Sorted by par so the chart's x-axis is stable.
export function getScoringByPar(rounds) {
  const holesByPar = new Map();
  for (const hole of allHoles(rounds)) {
    if (!holesByPar.has(hole.par)) holesByPar.set(hole.par, []);
    holesByPar.get(hole.par).push(hole.score - hole.par);
  }

  return [...holesByPar.keys()]
    .sort((a, b) => a - b)
    .map((par) => ({
      par,
      holes: holesByPar.get(par).length,
      avgToPar: average(holesByPar.get(par)),
    }));
}

export function getPuttingStats(rounds) {
  const puttHoles = allHoles(rounds).filter(hasPutts);
  const girPuttHoles = puttHoles.filter((hole) => hole.gir);

  return {
    // Normalised to 18 holes rather than divided by round count: a 9-hole
    // round or a round with unrecorded putts would otherwise drag the
    // average down for reasons that have nothing to do with putting.
    puttsPerRound:
      puttHoles.length === 0
        ? null
        : Math.round((sum(puttHoles.map((hole) => hole.putts)) / puttHoles.length) * 18 * 10) / 10,
    puttsPerGir: average(girPuttHoles.map((hole) => hole.putts)),
    onePuttRate: percentage(puttHoles.filter((hole) => hole.putts === 1).length, puttHoles.length),
    threePuttRate: percentage(puttHoles.filter((hole) => hole.putts >= 3).length, puttHoles.length),
    holesCounted: puttHoles.length,
  };
}

// Date-ascending, so the trend line reads left to right regardless of the
// order rounds happen to sit in the fixture.
export function getScoringTrend(rounds) {
  return rounds
    .map((round) => {
      const { date, score, par, toPar, holesPlayed } = getRoundSummary(round);
      return { date, score, par, toPar, holesPlayed };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ----- Momentum: how a round's good and bad holes cluster together -----
//
// Three run-of-play stats, all read off the same hole-by-hole rows, each
// stated precisely because each is a judgement call:
//
// - BOUNCE-BACK RATE: of the bogey-or-worse holes that have a following hole
//   in the SAME round, how often the very next hole was birdie-or-better.
//   This is computed per round, never over the flattened hole list: the last
//   hole of one round and the first hole of the next are not consecutive, and
//   flattening would invent bounce-back opportunities across a round boundary
//   that never existed. Each round's final hole is also excluded from the
//   denominator — there is no next hole to recover on.
// - BIRDIE CONVERSION RATE: of the greens hit in regulation, how often the
//   hole finished birdie-or-better. This is the standard "birdie-or-better
//   conversion" definition (GIR holes are the denominator) and the natural
//   complement to scrambling — scrambling recovers when the green is missed,
//   conversion capitalises when it's hit. A birdie made from off the green
//   (a chip-in on a non-GIR hole) is deliberately not counted: it wasn't a
//   converted green.
// - BLOW-UP RATE: how often a hole ran to double bogey or worse, over every
//   hole played. getHoleResult already folds everything two-or-more over par
//   into `double`, so this just surfaces that bucket as its own rate.
//
// All three return null (not 0) on an empty denominator, like the rest of
// this module, so the UI renders an em dash rather than a misleading 0%.

function isBirdieOrBetter(hole) {
  const result = getHoleResult(hole.score, hole.par);
  return result === 'birdie' || result === 'eagle';
}

function isBogeyOrWorse(hole) {
  const result = getHoleResult(hole.score, hole.par);
  return result === 'bogey' || result === 'double';
}

export function getBounceBackRate(rounds) {
  let opportunities = 0;
  let bounceBacks = 0;

  for (const round of rounds) {
    if (!hasHoleData(round)) continue;
    const { holes } = round;
    // Stop before the last hole: it has no next hole in this round to bounce
    // back on, and the next round's holes belong to a different round.
    for (let i = 0; i < holes.length - 1; i += 1) {
      if (!isBogeyOrWorse(holes[i])) continue;
      opportunities += 1;
      if (isBirdieOrBetter(holes[i + 1])) bounceBacks += 1;
    }
  }

  return percentage(bounceBacks, opportunities);
}

export function getBirdieConversionRate(rounds) {
  const girHoles = allHoles(rounds).filter((hole) => hole.gir);
  const converted = girHoles.filter(isBirdieOrBetter);
  return percentage(converted.length, girHoles.length);
}

export function getBlowUpRate(rounds) {
  const holes = allHoles(rounds);
  const blowUps = holes.filter((hole) => getHoleResult(hole.score, hole.par) === 'double');
  return percentage(blowUps.length, holes.length);
}

// Per-hole averages for a single course. Grouping by course is the whole
// point: averaging "hole 7" across two different courses describes nothing.
export function getHoleAverages(rounds, course) {
  const toParByHole = new Map();
  const parByHole = new Map();

  for (const round of rounds) {
    if (round.course !== course || !hasHoleData(round)) continue;
    for (const hole of round.holes) {
      if (!toParByHole.has(hole.hole)) toParByHole.set(hole.hole, []);
      toParByHole.get(hole.hole).push(hole.score - hole.par);
      parByHole.set(hole.hole, hole.par);
    }
  }

  return [...toParByHole.keys()]
    .sort((a, b) => a - b)
    .map((hole) => ({
      hole,
      par: parByHole.get(hole),
      played: toParByHole.get(hole).length,
      avgToPar: average(toParByHole.get(hole)),
    }));
}

// Front/back nine totals. `back` is null on a 9-hole round rather than a
// zeroed-out object, so the scorecard can omit the row entirely instead of
// rendering a meaningless "+0" — and the whole result is null for a
// summary-only round, which has no nines to split.
export function getNineSplit(round) {
  if (!hasHoleData(round)) return null;

  const nine = (holes) => {
    const score = sum(holes.map((hole) => hole.score));
    const par = sum(holes.map((hole) => hole.par));
    return { score, par, toPar: score - par };
  };

  const front = round.holes.slice(0, 9);
  const back = round.holes.slice(9);

  return { front: nine(front), back: back.length === 0 ? null : nine(back) };
}

export { SCORE_LABELS };
