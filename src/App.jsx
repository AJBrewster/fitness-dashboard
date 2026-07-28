import { useState } from 'react';
import { getActivities } from './lib/data';
import { getTotals, getWeeklyDistance, filterByDateRange } from './lib/stats';
import Summary from './components/Summary';
import WeeklyDistanceChart from './components/WeeklyDistanceChart';
import DateRangeFilter from './components/DateRangeFilter';
import './App.css';

function App() {
  const activities = getActivities();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // <input type="date"> gives a bare 'YYYY-MM-DD', which Date parses as
  // midnight — append end-of-day so the "To" date is inclusive of
  // activities that happened on that day.
  const filteredActivities =
    start && end ? filterByDateRange(activities, start, `${end}T23:59:59`) : activities;
  const totals = getTotals(filteredActivities);
  const weeklyDistance = getWeeklyDistance(filteredActivities);

  return (
    <>
      <h1>Fitness Dashboard</h1>
      <DateRangeFilter start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
      <Summary totals={totals} />
      <WeeklyDistanceChart weeklyDistance={weeklyDistance} />
    </>
  );
}

export default App;
