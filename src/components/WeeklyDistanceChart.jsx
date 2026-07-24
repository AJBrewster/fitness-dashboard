import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function WeeklyDistanceChart({ weeklyDistance }) {
  const data = weeklyDistance.map((week) => ({
    weekStart: week.weekStart,
    distanceKm: Number((week.distanceMeters / 1000).toFixed(1)),
  }));

  return (
    <div className="chart">
      <h2>Weekly distance</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="weekStart" />
          <YAxis unit=" km" />
          <Tooltip formatter={(value) => [`${value} km`, 'Distance']} />
          <Line type="monotone" dataKey="distanceKm" stroke="#646cff" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WeeklyDistanceChart;
