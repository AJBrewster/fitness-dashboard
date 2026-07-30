// Training status labels are Garmin enums like "PRODUCTIVE_6" / "RECOVERY_2" —
// strip the trailing tier number and title-case the rest for display.
function humanizeStatus(status) {
  const words = status.replace(/_\d+$/, '').split('_');
  return words.map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');
}

// Status color is a supporting accent only — the band name is always shown
// as text too, never color alone (see dataviz skill: status colors ship
// with an icon/label, not color-alone).
function readinessBand(score) {
  if (score >= 60) return { label: 'Good', className: 'status-good' };
  if (score >= 40) return { label: 'Moderate', className: 'status-warning' };
  return { label: 'Low', className: 'status-serious' };
}

function WellnessSummary({ latest }) {
  const {
    date,
    sleepScore,
    restingHeartRateBpm,
    avgStressLevel,
    bodyBatteryCharged,
    trainingReadinessScore,
    trainingStatus,
  } = latest;

  const band = readinessBand(trainingReadinessScore);

  return (
    <section className="wellness-summary">
      <div className="wellness-stats">
        <div className="wellness-stat wellness-stat-highlight">
          <span className={`wellness-value ${band.className}`} data-testid="training-readiness">
            {trainingReadinessScore}
          </span>
          <span className="wellness-label">
            Training Readiness — {band.label} · {humanizeStatus(trainingStatus)}
          </span>
        </div>
        <div className="wellness-stat">
          <span className="wellness-value" data-testid="sleep-score">
            {sleepScore}
          </span>
          <span className="wellness-label">Sleep Score</span>
        </div>
        <div className="wellness-stat">
          <span className="wellness-value" data-testid="body-battery">
            {bodyBatteryCharged}
          </span>
          <span className="wellness-label">Body Battery Charged</span>
        </div>
        <div className="wellness-stat">
          <span className="wellness-value" data-testid="stress-level">
            {avgStressLevel}
          </span>
          <span className="wellness-label">Avg Stress</span>
        </div>
        <div className="wellness-stat">
          <span className="wellness-value" data-testid="resting-hr">
            {restingHeartRateBpm}
          </span>
          <span className="wellness-label">Resting HR (bpm)</span>
        </div>
      </div>
      <p className="wellness-date">As of {date}</p>
    </section>
  );
}

export default WellnessSummary;
