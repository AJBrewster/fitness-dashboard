import Sparkline from './Sparkline';

function formatDistance(meters) {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatStreak(days) {
  return `${days} day${days === 1 ? '' : 's'}`;
}

function Summary({ totals, weeklyDistance, weeklyDuration, weeklyActivityCount }) {
  const { totalDistanceMeters, totalDurationSeconds, activityCount, streak } = totals;

  return (
    <section className="summary">
      <div className="summary-stat">
        <div className="summary-stat-top">
          <span className="summary-value" data-testid="total-distance">
            {formatDistance(totalDistanceMeters)}
          </span>
          <svg className="summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />
          </svg>
        </div>
        <span className="summary-label">Total distance</span>
        <Sparkline values={weeklyDistance.map((week) => week.distanceMeters)} />
      </div>

      <div className="summary-stat">
        <div className="summary-stat-top">
          <span className="summary-value" data-testid="total-duration">
            {formatDuration(totalDurationSeconds)}
          </span>
          <svg className="summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
        </div>
        <span className="summary-label">Total time</span>
        <Sparkline values={weeklyDuration.map((week) => week.durationSeconds)} />
      </div>

      <div className="summary-stat">
        <div className="summary-stat-top">
          <span className="summary-value" data-testid="activity-count">
            {activityCount}
          </span>
          <svg className="summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M3 9h18M8 3v3M16 3v3" />
          </svg>
        </div>
        <span className="summary-label">Activities</span>
        <Sparkline values={weeklyActivityCount.map((week) => week.count)} />
      </div>

      <div className="summary-stat">
        <div className="summary-stat-top">
          <span className="summary-value" data-testid="streak">
            {formatStreak(streak)}
          </span>
          <svg className="summary-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-.5-2-1-2 1 3-1 4-1 4" />
            <path d="M7 15a5 5 0 0 0 10 0c0-3-2-4-2-7" />
          </svg>
        </div>
        <span className="summary-label">Longest streak</span>
      </div>
    </section>
  );
}

export default Summary;
