import PropTypes from 'prop-types';

// Reuses the .summary / .summary-stat classes from the activity cluster on
// purpose: the oversized-numeral tile is the app's signature element, and a
// golf metric should read as the same instrument, not a lookalike.

// A percentage is null when there was nothing to divide by (e.g. every green
// hit in regulation leaves no scrambling opportunities). Render the em dash
// rather than a 0% that claims a failure that never had a chance to happen.
function formatPct(value) {
  return value === null ? '—' : String(value);
}

// Golf writes level par as "E", and over-par scores carry an explicit plus.
function formatToPar(toPar) {
  if (toPar === 0) return 'E';
  return toPar > 0 ? `+${toPar}` : String(toPar);
}

// A percentage stat, with its unit suppressed when the value is unknown —
// "— %" reads as a broken number rather than as an absent one.
function pctStat(testId, label, value) {
  return { testId, label, value: formatPct(value), unit: value === null ? null : '%' };
}

function GolfSummary({ summary }) {
  const stats = [
    { testId: 'golf-score', label: 'Score', value: String(summary.score), unit: formatToPar(summary.toPar) },
    { testId: 'golf-putts', label: 'Putts', value: String(summary.putts), unit: null },
    pctStat('golf-gir', 'Greens in reg', summary.girPct),
    pctStat('golf-scrambling', 'Scrambling', summary.scramblingPct),
  ];

  return (
    <section className="summary">
      {stats.map((stat) => (
        <div className="summary-stat" key={stat.testId}>
          <div className="summary-stat-top">
            <span className="summary-label">{stat.label}</span>
          </div>
          <span className="summary-value">
            <span data-testid={stat.testId}>{stat.value}</span>
            {stat.unit && <span className="summary-unit">{stat.unit}</span>}
          </span>
        </div>
      ))}
    </section>
  );
}

GolfSummary.propTypes = {
  summary: PropTypes.shape({
    score: PropTypes.number.isRequired,
    toPar: PropTypes.number.isRequired,
    putts: PropTypes.number.isRequired,
    girPct: PropTypes.number,
    scramblingPct: PropTypes.number,
  }).isRequired,
};

export default GolfSummary;
