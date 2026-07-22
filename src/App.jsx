import { getActivities } from './lib/data';
import './App.css';

function App() {
  const activities = getActivities();

  return (
    <>
      <h1>Fitness Dashboard</h1>
      <p>{activities.length} activities loaded.</p>
    </>
  );
}

export default App;
