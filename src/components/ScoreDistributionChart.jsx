import PropTypes from 'prop-types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// One series, one hue. The bars are an ordered scale (eagle through double+),
// not seven independent identities, so painting them from the categorical
// --series-* palette would claim a relationship between the buckets that
// isn't there. The axis labels carry the meaning; the accent carries the
// magnitude. A single series also needs no legend — the title names it.
function ScoreDistributionChart({ distribution }) {
  return (
    <div className="chart chart-score-distribution">
      <h2>Score distribution</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={distribution}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value) => [value, 'Holes']} />
          {/* Capped width: unconstrained, five bars across a 1100px content
              column render as slabs that outweigh everything else on the
              view. The mark should carry the value, not the layout. */}
          <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

ScoreDistributionChart.propTypes = {
  distribution: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    }),
  ).isRequired,
};

export default ScoreDistributionChart;
