import PropTypes from 'prop-types';

// A percentage rounded to one decimal, or an em dash when null — the rate had
// no opportunities to measure (e.g. no greens hit in regulation to convert),
// so a "0.0%" would claim a failure that never had a chance to happen. Same
// convention as PuttingPanel / GolfSummary.
function format(value) {
  return value === null ? '—' : value.toFixed(1);
}

// Run-of-play stats aggregated over the selected window of rounds (the same
// window the putting/distribution panels use), not the single selected round.
// Shares the putting panel's tile styling — it's the same labelled-percentage
// instrument — via grouped selectors in App.css, so the two read as one system.
function MomentumPanel({ momentum }) {
  const tiles = [
    { testId: 'bounce-back-rate', label: 'Bounce-back rate', value: format(momentum.bounceBackRate) },
    { testId: 'birdie-conversion-rate', label: 'Birdie conversion', value: format(momentum.birdieConversionRate) },
    { testId: 'blow-up-rate', label: 'Blow-up rate', value: format(momentum.blowUpRate) },
  ];

  return (
    <section className="chart momentum-panel">
      <h2>Momentum</h2>
      <div className="momentum-tiles">
        {tiles.map((tile) => (
          <div className="momentum-tile" key={tile.testId}>
            <span className="momentum-value">
              <span data-testid={tile.testId}>{tile.value}</span>
              {tile.value !== '—' && <span className="momentum-unit">%</span>}
            </span>
            <span className="momentum-label">{tile.label}</span>
          </div>
        ))}
      </div>
      <p className="momentum-note">
        Bounce-back is a birdie or better on the hole right after a dropped shot; blow-up is a double
        bogey or worse. Across the rounds in the selected window.
      </p>
    </section>
  );
}

MomentumPanel.propTypes = {
  momentum: PropTypes.shape({
    bounceBackRate: PropTypes.number,
    birdieConversionRate: PropTypes.number,
    blowUpRate: PropTypes.number,
  }).isRequired,
};

export default MomentumPanel;
