import PropTypes from 'prop-types';

function format(value, digits = 1) {
  return value === null ? '—' : value.toFixed(digits);
}

// Putting figures are aggregates over the selected window of rounds, not the
// single selected round — which is why the panel states how many holes they
// were computed from. Without that, "38.2 putts per round" over a window that
// happens to contain a 9-hole round looks wrong rather than normalised.
function PuttingPanel({ putting }) {
  const tiles = [
    { testId: 'putts-per-round', label: 'Putts per round', value: format(putting.puttsPerRound), unit: null },
    { testId: 'putts-per-gir', label: 'Putts per GIR', value: format(putting.puttsPerGir, 2), unit: null },
    { testId: 'one-putt-rate', label: 'One-putt rate', value: format(putting.onePuttRate), unit: '%' },
    { testId: 'three-putt-rate', label: 'Three-putt rate', value: format(putting.threePuttRate), unit: '%' },
  ];

  return (
    <section className="chart putting-panel">
      <h2>Putting</h2>
      <div className="putting-tiles">
        {tiles.map((tile) => (
          <div className="putting-tile" key={tile.testId}>
            <span className="putting-value">
              <span data-testid={tile.testId}>{tile.value}</span>
              {tile.unit && <span className="putting-unit">{tile.unit}</span>}
            </span>
            <span className="putting-label">{tile.label}</span>
          </div>
        ))}
      </div>
      <p className="putting-note">
        Across {putting.holesCounted} holes where putts were recorded. Putts per round is
        normalised to 18 holes.
      </p>
    </section>
  );
}

PuttingPanel.propTypes = {
  putting: PropTypes.shape({
    puttsPerRound: PropTypes.number,
    puttsPerGir: PropTypes.number,
    onePuttRate: PropTypes.number,
    threePuttRate: PropTypes.number,
    holesCounted: PropTypes.number.isRequired,
  }).isRequired,
};

export default PuttingPanel;
