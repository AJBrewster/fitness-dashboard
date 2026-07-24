import { getActivities } from './lib/data';
import { getTotals } from './lib/stats';
import Summary from './components/Summary';
import './App.css';

function App() {
  const activities = getActivities();
  const totals = getTotals(activities);

  return (
    <>
      <h1>Fitness Dashboard</h1>
      <Summary totals={totals} />
    </>
  );
}

export default App;
