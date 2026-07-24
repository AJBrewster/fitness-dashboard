function formatDistance(meters) {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function Summary({ totals }) {
  const { totalDistanceMeters, totalDurationSeconds, activityCount } = totals;

  return (
    <section className="summary">
      <div className="summary-stat">
        <span className="summary-value">{formatDistance(totalDistanceMeters)}</span>
        <span className="summary-label">Total distance</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value">{formatDuration(totalDurationSeconds)}</span>
        <span className="summary-label">Total time</span>
      </div>
      <div className="summary-stat">
        <span className="summary-value">{activityCount}</span>
        <span className="summary-label">Activities</span>
      </div>
    </section>
  );
}

export default Summary;
