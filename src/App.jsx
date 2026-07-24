import { getActivities } from './lib/data';
import { getTotals, getWeeklyDistance } from './lib/stats';
import Summary from './components/Summary';
import WeeklyDistanceChart from './components/WeeklyDistanceChart';
import './App.css';

function App() {
  const activities = getActivities();
  const totals = getTotals(activities);
  const weeklyDistance = getWeeklyDistance(activities);

  return (
    <>
      <h1>Fitness Dashboard</h1>
      <Summary totals={totals} />
      <WeeklyDistanceChart weeklyDistance={weeklyDistance} />
    </>
  );
}

export default App;
