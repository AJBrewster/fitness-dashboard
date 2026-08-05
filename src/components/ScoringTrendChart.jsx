import PropTypes from 'prop-types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Plots to-par rather than raw score: the fixture mixes an 18-hole round with
// a 9-hole one, and a raw-score line would show that 9-hole round as a huge
// improvement instead of a shorter round. To-par is comparable across both.
function ScoringTrendChart({ trend }) {
  return (
    <div className="chart chart-scoring-trend">
      <h2>Scoring trend (to par)</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={trend}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            formatter={(value, name, entry) => [
              `+${value} over ${entry.payload.holesPlayed} holes`,
              'To par',
            ]}
          />
          <Line type="monotone" dataKey="toPar" stroke="var(--accent)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

ScoringTrendChart.propTypes = {
  trend: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      toPar: PropTypes.number.isRequired,
      holesPlayed: PropTypes.number.isRequired,
    }),
  ).isRequired,
};

export default ScoringTrendChart;
