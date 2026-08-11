import PropTypes from 'prop-types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LABEL_BY_TYPE } from './ActivityTypeBreakdown';

// Average heart rate per activity type — the `avgHrBpm` field every activity
// carries but nothing surfaced before. Single-hue (`--accent`), not the
// `--series-*` palette: these bars compare one magnitude across categories,
// they aren't independent identities, so categorical hues would imply a
// relationship that isn't there (same reasoning as the golf bar charts).
//
// Laid out horizontally (Recharts `layout="vertical"`) rather than as
// upright bars: six activity-type labels ("Paddleboarding", "Treadmill Run")
// crowd and overlap on an x-axis, but sit cleanly down a y-axis.
function HrByTypeChart({ avgHrByType }) {
  const data = avgHrByType.map((entry) => ({
    label: LABEL_BY_TYPE[entry.type] ?? entry.type,
    avgHr: entry.avgHr,
  }));

  return (
    <div className="chart chart-hr-by-type">
      <h2>Average heart rate by activity</h2>
      <ResponsiveContainer width="100%" height={40 + data.length * 40}>
        <BarChart layout="vertical" data={data} margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" unit=" bpm" />
          <YAxis type="category" dataKey="label" width={110} />
          <Tooltip formatter={(value) => [`${value} bpm`, 'Avg HR']} />
          <Bar dataKey="avgHr" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

HrByTypeChart.propTypes = {
  avgHrByType: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      avgHr: PropTypes.number.isRequired,
    }),
  ).isRequired,
};

export default HrByTypeChart;
