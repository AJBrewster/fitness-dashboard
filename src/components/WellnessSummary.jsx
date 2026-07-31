import ScoreRing from './ScoreRing';

// Training status labels are Garmin enums like "PRODUCTIVE_6" / "RECOVERY_2" —
// strip the trailing tier number and title-case the rest for display.
function humanizeStatus(status) {
  const words = status.replace(/_\d+$/, '').split('_');
  return words.map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');
}

// Status color is a supporting accent only — the band name is always shown
// as text too, never color alone (see dataviz skill: status colors ship
// with an icon/label, not color-alone). Thresholds differ per metric, so
// each ring passes its own; the good/moderate/low banding logic itself is
// shared.
function scoreBand(score, thresholds) {
  if (score >= thresholds.good) return { label: 'Good', className: 'status-good' };
  if (score >= thresholds.moderate) return { label: 'Moderate', className: 'status-warning' };
  return { label: 'Low', className: 'status-serious' };
}

// Readiness thresholds match Garmin's own good/moderate/low bands; sleep
// and body battery don't have an equivalent published scale, so these are
// a simplification for consistent visual banding across the three rings,
// not an official Garmin cutoff.
const READINESS_THRESHOLDS = { good: 60, moderate: 40 };
const SLEEP_THRESHOLDS = { good: 70, moderate: 50 };
const BATTERY_THRESHOLDS = { good: 60, moderate: 40 };

const COLOR_VAR_BY_STATUS_CLASS = {
  'status-good': 'var(--status-good)',
  'status-warning': 'var(--status-warning)',
  'status-serious': 'var(--status-serious)',
};

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

  const readinessBand = scoreBand(trainingReadinessScore, READINESS_THRESHOLDS);
  const sleepBand = scoreBand(sleepScore, SLEEP_THRESHOLDS);
  const batteryBand = scoreBand(bodyBatteryCharged, BATTERY_THRESHOLDS);

  return (
    <section className="wellness-summary">
      <div className="wellness-rings">
        <div className="wellness-ring-card wellness-ring-hero">
          <ScoreRing
            score={trainingReadinessScore}
            colorVar={COLOR_VAR_BY_STATUS_CLASS[readinessBand.className]}
            size={104}
            strokeWidth={10}
            testId="training-readiness"
          />
          <div className="wellness-ring-copy">
            <span className={`status-chip ${readinessBand.className}`} data-testid="readiness-status-chip">
              {readinessBand.label} · {humanizeStatus(trainingStatus)}
            </span>
            <h3>Training readiness</h3>
          </div>
        </div>

        <div className="wellness-ring-card">
          <ScoreRing
            score={sleepScore}
            colorVar={COLOR_VAR_BY_STATUS_CLASS[sleepBand.className]}
            testId="sleep-score"
          />
          <h3>Sleep score</h3>
        </div>

        <div className="wellness-ring-card">
          <ScoreRing
            score={bodyBatteryCharged}
            colorVar={COLOR_VAR_BY_STATUS_CLASS[batteryBand.className]}
            testId="body-battery"
          />
          <h3>Body battery</h3>
        </div>
      </div>

      <div className="wellness-tiles">
        <div className="wellness-tile">
          <span className="wellness-value" data-testid="stress-level">
            {avgStressLevel}
          </span>
          <span className="wellness-label">Avg Stress</span>
        </div>
        <div className="wellness-tile">
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
