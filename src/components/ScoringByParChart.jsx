import PropTypes from 'prop-types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Average strokes over par, split by par 3 / 4 / 5 — the "where do the shots
// actually leak" view. Same single-hue reasoning as ScoreDistributionChart.
function ScoringByParChart({ scoringByPar }) {
  const data = scoringByPar.map((row) => ({ ...row, parLabel: `Par ${row.par}` }));

  return (
    <div className="chart chart-scoring-by-par">
      <h2>Average score by par</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="parLabel" />
          <YAxis />
          <Tooltip formatter={(value) => [`+${value}`, 'Avg to par']} />
          <Bar dataKey="avgToPar" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

ScoringByParChart.propTypes = {
  scoringByPar: PropTypes.arrayOf(
    PropTypes.shape({
      par: PropTypes.number.isRequired,
      holes: PropTypes.number.isRequired,
      avgToPar: PropTypes.number,
    }),
  ).isRequired,
};

export default ScoringByParChart;
