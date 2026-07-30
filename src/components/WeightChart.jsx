import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function WeightChart({ weighIns }) {
  return (
    <div className="chart chart-weight">
      <h2>Weight trend</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={weighIns}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} unit=" kg" />
          <Tooltip formatter={(value) => [`${value} kg`, 'Weight']} />
          <Line type="monotone" dataKey="weightKg" stroke="#646cff" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WeightChart;
