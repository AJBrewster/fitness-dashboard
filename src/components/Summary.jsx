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

function Summary({ totals }) {
  const { totalDistanceMeters, totalDurationSeconds, activityCount, streak } = totals;

  return (
    <section className="summary">
      <div className="summary-stat">
        <span className="summary-value" data-testid="total-distance">
          {formatDistance(totalDistanceMeters)}
        </span>
        <span className="summary-label">Total distance</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value" data-testid="total-duration">
          {formatDuration(totalDurationSeconds)}
        </span>
        <span className="summary-label">Total time</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value" data-testid="activity-count">
          {activityCount}
        </span>
        <span className="summary-label">Activities</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value" data-testid="streak">
          {formatStreak(streak)}
        </span>
        <span className="summary-label">Longest streak</span>
      </div>
    </section>
  );
}

export default Summary;
