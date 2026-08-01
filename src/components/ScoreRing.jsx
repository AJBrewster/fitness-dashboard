import PropTypes from 'prop-types';

// Full-circle progress ring for a bounded 0-100 score (Training Readiness,
// Sleep Score, Body Battery) — only used where a ring's "how full" framing
// is actually meaningful. Purely presentational: the caller resolves the
// score into a status color and passes it in, same as color assignment
// elsewhere in this app (e.g. ActivityTypeBreakdown's COLOR_BY_TYPE).
function ScoreRing({ score, max = 100, colorVar, size = 84, strokeWidth = 9, testId }) {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(Math.max(score, 0), max) / max) * circumference;

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="score-ring-svg" aria-hidden="true">
        <circle className="score-ring-track" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} />
        <circle
          className="score-ring-value"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={colorVar}
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <span className="score-ring-number" data-testid={testId}>
        {score}
      </span>
    </div>
  );
}

ScoreRing.propTypes = {
  score: PropTypes.number.isRequired,
  max: PropTypes.number,
  colorVar: PropTypes.string.isRequired,
  size: PropTypes.number,
  strokeWidth: PropTypes.number,
  testId: PropTypes.string.isRequired,
};

export default ScoreRing;
