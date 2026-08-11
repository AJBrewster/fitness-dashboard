import PropTypes from 'prop-types';
import ScoreRing from './ScoreRing';
import Sparkline from './Sparkline';
import { getWellnessSeries, getWellnessDelta } from '../lib/stats';

// Training status labels are Garmin enums like "PRODUCTIVE_6" / "RECOVERY_2" —
// strip the trailing tier number and title-case the rest for display. null
// means Garmin hasn't computed a status yet (a partial-day sync).
function humanizeStatus(status) {
  if (status === null) return null;
  const words = status.replace(/_\d+$/, '').split('_');
  return words.map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');
}

// Status color is a supporting accent only — the band name is always shown
// as text too, never color alone (see dataviz skill: status colors ship
// with an icon/label, not color-alone). Thresholds differ per metric, so
// each ring passes its own; the good/moderate/low banding logic itself is
// shared. A null score (not computed yet, e.g. today's partial sync) is its
// own band rather than falling into "Low" — it isn't known to be low.
function scoreBand(score, thresholds) {
  if (score === null) return { label: 'No data', className: 'status-unknown' };
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
  'status-unknown': 'var(--text-secondary)',
};

// Day-over-day change on the hero ring. The arrow glyph carries the
// direction (not color alone), and the class only tints it. null means
// there weren't two recorded days to compare — render nothing rather than
// a "0" that would read as "no change".
function DeltaBadge({ delta }) {
  if (delta === null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      className={`wellness-delta ${up ? 'wellness-delta-up' : 'wellness-delta-down'}`}
      data-testid="readiness-delta"
    >
      {up ? '▲' : '▼'} {Math.abs(delta)}
    </span>
  );
}

DeltaBadge.propTypes = {
  delta: PropTypes.number,
};

function WellnessSummary({ wellness }) {
  const latest = wellness[wellness.length - 1];
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
          <div className="wellness-ring-main">
            <ScoreRing
              score={trainingReadinessScore}
              colorVar={COLOR_VAR_BY_STATUS_CLASS[readinessBand.className]}
              size={104}
              strokeWidth={10}
              testId="training-readiness"
            />
            <div className="wellness-ring-copy">
              <span className={`status-chip ${readinessBand.className}`} data-testid="readiness-status-chip">
                {readinessBand.label}
                {trainingStatus !== null && ` · ${humanizeStatus(trainingStatus)}`}
              </span>
              <h3>Training readiness</h3>
              <DeltaBadge delta={getWellnessDelta(wellness, 'trainingReadinessScore')} />
            </div>
          </div>
          <Sparkline values={getWellnessSeries(wellness, 'trainingReadinessScore')} />
        </div>

        <div className="wellness-ring-card">
          <div className="wellness-ring-main">
            <ScoreRing
              score={sleepScore}
              colorVar={COLOR_VAR_BY_STATUS_CLASS[sleepBand.className]}
              testId="sleep-score"
            />
            <h3>Sleep score</h3>
          </div>
          <Sparkline values={getWellnessSeries(wellness, 'sleepScore')} />
        </div>

        <div className="wellness-ring-card">
          <div className="wellness-ring-main">
            <ScoreRing
              score={bodyBatteryCharged}
              colorVar={COLOR_VAR_BY_STATUS_CLASS[batteryBand.className]}
              testId="body-battery"
            />
            <h3>Body battery</h3>
          </div>
          <Sparkline values={getWellnessSeries(wellness, 'bodyBatteryCharged')} />
        </div>
      </div>

      <div className="wellness-tiles">
        <div className="wellness-tile">
          <span className="wellness-value" data-testid="stress-level">
            {avgStressLevel === null ? '—' : avgStressLevel}
          </span>
          <span className="wellness-label">Avg Stress</span>
          <Sparkline values={getWellnessSeries(wellness, 'avgStressLevel')} />
        </div>
        <div className="wellness-tile">
          <span className="wellness-value" data-testid="resting-hr">
            {restingHeartRateBpm === null ? '—' : restingHeartRateBpm}
          </span>
          <span className="wellness-label">Resting HR (bpm)</span>
          <Sparkline values={getWellnessSeries(wellness, 'restingHeartRateBpm')} />
        </div>
      </div>

      <p className="wellness-date">As of {date}</p>
    </section>
  );
}

WellnessSummary.propTypes = {
  // The full day-by-day history, not just the latest record: the last entry
  // drives the rings/tiles as before, and the whole series feeds the
  // sparklines and the day-over-day delta. Ordered oldest-to-newest.
  wellness: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      // Any of these can be null — either the metric was never recorded for
      // the day, or (for a just-synced "today") Garmin hasn't computed it yet.
      sleepScore: PropTypes.number,
      restingHeartRateBpm: PropTypes.number,
      avgStressLevel: PropTypes.number,
      bodyBatteryCharged: PropTypes.number,
      trainingReadinessScore: PropTypes.number,
      trainingStatus: PropTypes.string,
    })
  ).isRequired,
};

export default WellnessSummary;
