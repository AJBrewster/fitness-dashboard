import PropTypes from 'prop-types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Fixed type -> color slot, independent of count/rank. Color must follow the
// entity, not its position in the (count-sorted) breakdown array — otherwise
// re-filtering activities could reassign a type's color between renders.
const COLOR_BY_TYPE = {
  running: 'var(--series-1)',
  walking: 'var(--series-2)',
  strength_training: 'var(--series-3)',
  virtual_ride: 'var(--series-4)',
  ultimate_disc: 'var(--series-5)',
  treadmill_running: 'var(--series-6)',
  stand_up_paddleboarding_v2: 'var(--series-7)',
};

// Exported so HrByTypeChart renders the same display names — one type->label
// map, not two that could drift apart.
export const LABEL_BY_TYPE = {
  running: 'Running',
  walking: 'Walking',
  strength_training: 'Strength Training',
  virtual_ride: 'Virtual Ride',
  ultimate_disc: 'Ultimate Disc',
  treadmill_running: 'Treadmill Run',
  stand_up_paddleboarding_v2: 'Paddleboarding',
};

function ActivityTypeBreakdown({ breakdown }) {
  const data = breakdown.map((entry) => ({
    type: entry.type,
    label: LABEL_BY_TYPE[entry.type] ?? entry.type,
    count: entry.count,
  }));

  return (
    <div className="chart chart-activity-types">
      <h2>Activity types</h2>
      {/* The donut is aria-hidden: the legend list below is real, accessible
          HTML carrying the same name+count per type, so the chart itself is
          a decorative visualization of information already available to a
          screen reader, not an independent data surface (same reasoning as
          Sparkline.jsx). */}
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="label" innerRadius={60} outerRadius={95} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.type} fill={COLOR_BY_TYPE[entry.type] ?? 'var(--series-1)'} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [value, name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="activity-type-legend">
        {data.map((entry) => (
          <li key={entry.type} className="activity-type-row" data-testid="activity-type-row">
            <span className="legend-dot" style={{ background: COLOR_BY_TYPE[entry.type] ?? 'var(--series-1)' }} />
            <span className="legend-name">{entry.label}</span>
            <span className="legend-count">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

ActivityTypeBreakdown.propTypes = {
  breakdown: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    }),
  ).isRequired,
};

export default ActivityTypeBreakdown;
