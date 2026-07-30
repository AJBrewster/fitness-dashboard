import { useState } from 'react';
import { getActivities, getWellness, getVo2MaxTrend, getWeighIns } from './lib/data';
import { getTotals, getWeeklyDistance, filterByDateRange, getActivityTypeBreakdown } from './lib/stats';
import Summary from './components/Summary';
import WeeklyDistanceChart from './components/WeeklyDistanceChart';
import DateRangeFilter from './components/DateRangeFilter';
import ActivityTypeBreakdown from './components/ActivityTypeBreakdown';
import WellnessSummary from './components/WellnessSummary';
import Vo2MaxChart from './components/Vo2MaxChart';
import WeightChart from './components/WeightChart';
import './App.css';

function App() {
  const activities = getActivities();
  const wellness = getWellness();
  const vo2MaxTrend = getVo2MaxTrend();
  const weighIns = getWeighIns();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // <input type="date"> gives a bare 'YYYY-MM-DD', which Date parses as
  // midnight — append end-of-day so the "To" date is inclusive of
  // activities that happened on that day.
  const filteredActivities =
    start && end ? filterByDateRange(activities, start, `${end}T23:59:59`) : activities;
  const totals = getTotals(filteredActivities);
  const weeklyDistance = getWeeklyDistance(filteredActivities);
  const typeBreakdown = getActivityTypeBreakdown(filteredActivities);
  const latestWellness = wellness[wellness.length - 1];

  return (
    <>
      <h1>Fitness Dashboard</h1>

      <section className="page-section">
        <h2 className="section-title">Activity</h2>
        <DateRangeFilter start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
        <Summary totals={totals} />
        <WeeklyDistanceChart weeklyDistance={weeklyDistance} />
        <ActivityTypeBreakdown breakdown={typeBreakdown} />
      </section>

      <section className="page-section">
        <h2 className="section-title">Today's Wellness</h2>
        <WellnessSummary latest={latestWellness} />
      </section>

      <section className="page-section">
        <h2 className="section-title">Trends</h2>
        <Vo2MaxChart vo2MaxTrend={vo2MaxTrend} />
        <WeightChart weighIns={weighIns} />
      </section>
    </>
  );
}

export default App;
