import PropTypes from 'prop-types';
import Sparkline from './Sparkline';

// Each formatter returns the numeral and its unit separately so the unit can
// be demoted visually beside an oversized figure. The `data-testid` stays on
// the numeral alone — the same accessible-leaf-node pattern used everywhere
// else in this app, and it keeps a unit rename from breaking a value
// assertion.
function formatDistance(meters) {
  return { value: (meters / 1000).toFixed(1), unit: 'km' };
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  // The h/m are already inline units, so there's nothing left to demote.
  return { value: `${hours}h ${minutes}m`, unit: null };
}

function formatCount(count) {
  return { value: String(count), unit: null };
}

function formatStreak(days) {
  return { value: String(days), unit: days === 1 ? 'day' : 'days' };
}

function Stat({ label, icon, testId, metric, values }) {
  return (
    <div className="summary-stat">
      <div className="summary-stat-top">
        {icon}
        <span className="summary-label">{label}</span>
      </div>
      <span className="summary-value">
        <span data-testid={testId}>{metric.value}</span>
        {metric.unit && <span className="summary-unit">{metric.unit}</span>}
      </span>
      {values && <Sparkline values={values} />}
    </div>
  );
}

Stat.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  testId: PropTypes.string.isRequired,
  metric: PropTypes.shape({
    value: PropTypes.string.isRequired,
    unit: PropTypes.string,
  }).isRequired,
  values: PropTypes.arrayOf(PropTypes.number),
};

const iconProps = {
  className: 'summary-icon',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Summary({ totals, weeklyDistance, weeklyDuration, weeklyActivityCount }) {
  const { totalDistanceMeters, totalDurationSeconds, activityCount, streak } = totals;

  return (
    <section className="summary">
      <Stat
        label="Total distance"
        testId="total-distance"
        metric={formatDistance(totalDistanceMeters)}
        values={weeklyDistance.map((week) => week.distanceMeters)}
        icon={
          <svg {...iconProps}>
            <path d="M3 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />
          </svg>
        }
      />

      <Stat
        label="Total time"
        testId="total-duration"
        metric={formatDuration(totalDurationSeconds)}
        values={weeklyDuration.map((week) => week.durationSeconds)}
        icon={
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
        }
      />

      <Stat
        label="Activities"
        testId="activity-count"
        metric={formatCount(activityCount)}
        values={weeklyActivityCount.map((week) => week.count)}
        icon={
          <svg {...iconProps}>
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M3 9h18M8 3v3M16 3v3" />
          </svg>
        }
      />

      {/* No sparkline: there is no natural weekly series for "longest run of
          consecutive days" without inventing one, which would contradict why
          streak is defined the way it is (see stats.js). */}
      <Stat
        label="Longest streak"
        testId="streak"
        metric={formatStreak(streak)}
        icon={
          <svg {...iconProps}>
            <path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-.5-2-1-2 1 3-1 4-1 4" />
            <path d="M7 15a5 5 0 0 0 10 0c0-3-2-4-2-7" />
          </svg>
        }
      />
    </section>
  );
}

Summary.propTypes = {
  totals: PropTypes.shape({
    totalDistanceMeters: PropTypes.number.isRequired,
    totalDurationSeconds: PropTypes.number.isRequired,
    activityCount: PropTypes.number.isRequired,
    streak: PropTypes.number.isRequired,
  }).isRequired,
  weeklyDistance: PropTypes.arrayOf(
    PropTypes.shape({
      weekStart: PropTypes.string.isRequired,
      distanceMeters: PropTypes.number.isRequired,
    }),
  ).isRequired,
  weeklyDuration: PropTypes.arrayOf(
    PropTypes.shape({
      weekStart: PropTypes.string.isRequired,
      durationSeconds: PropTypes.number.isRequired,
    }),
  ).isRequired,
  weeklyActivityCount: PropTypes.arrayOf(
    PropTypes.shape({
      weekStart: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    }),
  ).isRequired,
};

export default Summary;
