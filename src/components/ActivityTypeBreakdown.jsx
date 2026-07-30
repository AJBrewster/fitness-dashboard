import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts';

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

const LABEL_BY_TYPE = {
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
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={140} />
          <Tooltip formatter={(value) => [value, 'Activities']} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={entry.type} fill={COLOR_BY_TYPE[entry.type] ?? 'var(--series-1)'} />
            ))}
            <LabelList dataKey="count" position="right" fill="var(--text-secondary)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ActivityTypeBreakdown;
