import { useEffect, useState } from 'react';
import { getActivities, getWellness, getVo2MaxTrend, getWeighIns } from './lib/data';
import {
  getTotals,
  getWeeklyDistance,
  getWeeklyDuration,
  getWeeklyActivityCount,
  filterByDateRange,
  getActivityTypeBreakdown,
} from './lib/stats';
import Summary from './components/Summary';
import WeeklyDistanceChart from './components/WeeklyDistanceChart';
import DateRangeFilter from './components/DateRangeFilter';
import ActivityTypeBreakdown from './components/ActivityTypeBreakdown';
import WellnessSummary from './components/WellnessSummary';
import Vo2MaxChart from './components/Vo2MaxChart';
import WeightChart from './components/WeightChart';
import Sidebar, { SECTIONS } from './components/Sidebar';
import './App.css';

const THEME_STORAGE_KEY = 'fitness-dashboard-theme';

// Reads any stored preference synchronously (before first paint) so the
// page never flashes the wrong theme on load, then falls back to the OS
// preference the first time a visitor shows up with nothing stored yet.
function getInitialTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const theme =
    stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  document.documentElement.dataset.theme = theme;
  return theme;
}

function App() {
  const activities = getActivities();
  const wellness = getWellness();
  const vo2MaxTrend = getVo2MaxTrend();
  const weighIns = getWeighIns();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [theme, setTheme] = useState(getInitialTheme);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Highlights the sidebar nav item for whichever section is scrolled into
  // the middle band of the viewport, rather than requiring a click.
  useEffect(() => {
    const sections = SECTIONS.map((section) => document.getElementById(section.id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  // <input type="date"> gives a bare 'YYYY-MM-DD', which Date parses as
  // midnight — append end-of-day so the "To" date is inclusive of
  // activities that happened on that day.
  const filteredActivities =
    start && end ? filterByDateRange(activities, start, `${end}T23:59:59`) : activities;
  const totals = getTotals(filteredActivities);
  const weeklyDistance = getWeeklyDistance(filteredActivities);
  const weeklyDuration = getWeeklyDuration(filteredActivities);
  const weeklyActivityCount = getWeeklyActivityCount(filteredActivities);
  const typeBreakdown = getActivityTypeBreakdown(filteredActivities);
  const latestWellness = wellness[wellness.length - 1];
  const topbarTitle = SECTIONS.find((section) => section.id === activeSection)?.label;

  return (
    <div className="app-shell">
      <Sidebar
        activeSection={activeSection}
        onNavigate={scrollToSection}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      />

      <div className="main">
        <header className="topbar">
          <h2 className="topbar-title">{topbarTitle}</h2>
          <DateRangeFilter start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
        </header>

        <div className="content">
          <section id="section-activity" className="page-section">
            <h2 className="section-title">Activity</h2>
            <Summary
              totals={totals}
              weeklyDistance={weeklyDistance}
              weeklyDuration={weeklyDuration}
              weeklyActivityCount={weeklyActivityCount}
            />
            <WeeklyDistanceChart weeklyDistance={weeklyDistance} />
            <ActivityTypeBreakdown breakdown={typeBreakdown} />
          </section>

          <section id="section-wellness" className="page-section">
            <h2 className="section-title">Today's Wellness</h2>
            <WellnessSummary latest={latestWellness} />
          </section>

          <section id="section-trends" className="page-section">
            <h2 className="section-title">Trends</h2>
            <Vo2MaxChart vo2MaxTrend={vo2MaxTrend} />
            <WeightChart weighIns={weighIns} />
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
