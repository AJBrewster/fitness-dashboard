import PropTypes from 'prop-types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Vo2MaxChart({ vo2MaxTrend }) {
  return (
    <div className="chart chart-vo2-max">
      <h2>VO2 max trend</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={vo2MaxTrend}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
          <Tooltip formatter={(value) => [value, 'VO2 max']} />
          <Line type="monotone" dataKey="vo2Max" stroke="var(--accent)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

Vo2MaxChart.propTypes = {
  vo2MaxTrend: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      vo2Max: PropTypes.number,
    }),
  ).isRequired,
};

export default Vo2MaxChart;
