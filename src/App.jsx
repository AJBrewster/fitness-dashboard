import { useEffect, useState } from 'react';
import { getActivities, getWellness, getVo2MaxTrend, getWeighIns, getGolfRounds } from './lib/data';
import {
  hasHoleData,
  getRoundSummary,
  getScoreDistribution,
  getScoringByPar,
  getPuttingStats,
  getScoringTrend,
} from './lib/golf';
import {
  getTotals,
  getWeeklyDistance,
  getWeeklyDuration,
  getWeeklyActivityCount,
  filterByDateRange,
  getActivityTypeBreakdown,
  getCurrentWeekRange,
} from './lib/stats';
import Summary from './components/Summary';
import WeeklyDistanceChart from './components/WeeklyDistanceChart';
import DateRangeFilter from './components/DateRangeFilter';
import ActivityTypeBreakdown from './components/ActivityTypeBreakdown';
import WellnessSummary from './components/WellnessSummary';
import Vo2MaxChart from './components/Vo2MaxChart';
import WeightChart from './components/WeightChart';
import Sidebar, { VIEWS } from './components/Sidebar';
import RoundPicker from './components/RoundPicker';
import GolfSummary from './components/GolfSummary';
import Scorecard from './components/Scorecard';
import ScoreDistributionChart from './components/ScoreDistributionChart';
import ScoringByParChart from './components/ScoringByParChart';
import ScoringTrendChart from './components/ScoringTrendChart';
import PuttingPanel from './components/PuttingPanel';
import PanelUnavailable, { NO_HOLE_DATA_WINDOW } from './components/PanelUnavailable';
import './App.css';

// Newest round first — the order the picker lists them in, and the order the
// "last N rounds" window slices from.
const GOLF_ROUNDS = [...getGolfRounds()].sort((a, b) => b.date.localeCompare(a.date));

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
  // Which view is on screen. This replaced an IntersectionObserver scrollspy
  // over one long page: golf needs a screen of its own rather than a fourth
  // scroll section, and plain state is simpler to reason about and to test
  // than "whichever section is in the middle band of the viewport".
  const [activeView, setActiveView] = useState(VIEWS[0].id);
  // Golf keeps its own selection state rather than reading the topbar date
  // filter — see RoundPicker. `roundsShown` of 0 means every round.
  const [selectedRoundDate, setSelectedRoundDate] = useState(GOLF_ROUNDS[0].date);
  const [roundsShown, setRoundsShown] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const thisWeekRange = getCurrentWeekRange();

  function selectLifetime() {
    setStart('');
    setEnd('');
  }

  function selectThisWeek() {
    setStart(thisWeekRange.start);
    setEnd(thisWeekRange.end);
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
  const currentView = VIEWS.find((view) => view.id === activeView);

  // Falls back to the most recent round if the selected date somehow isn't in
  // the list — the picker can't produce that, but a swapped-in .local.json can.
  const selectedRound =
    GOLF_ROUNDS.find((round) => round.date === selectedRoundDate) ?? GOLF_ROUNDS[0];
  const windowedRounds = roundsShown === 0 ? GOLF_ROUNDS : GOLF_ROUNDS.slice(0, roundsShown);
  // The per-hole aggregates already skip summary-only rounds internally; this
  // is how the view knows whether there's anything left to draw at all.
  const holeBearingRounds = windowedRounds.filter(hasHoleData);

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      />

      <div className="main">
        <header className="topbar">
          <h2 className="topbar-title">{currentView.label}</h2>
          {currentView.hasDateFilter && (
            <DateRangeFilter
              start={start}
              end={end}
              onStartChange={setStart}
              onEndChange={setEnd}
              isLifetime={!start && !end}
              isThisWeek={start === thisWeekRange.start && end === thisWeekRange.end}
              onSelectLifetime={selectLifetime}
              onSelectThisWeek={selectThisWeek}
            />
          )}
        </header>

        <div className="content">
          {activeView === 'view-activity' && (
            <section id="view-activity" className="page-section">
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
          )}

          {activeView === 'view-wellness' && (
            <section id="view-wellness" className="page-section">
              <h2 className="section-title">Today&apos;s Wellness</h2>
              <WellnessSummary latest={latestWellness} />
            </section>
          )}

          {activeView === 'view-trends' && (
            <section id="view-trends" className="page-section">
              <h2 className="section-title">Trends</h2>
              <Vo2MaxChart vo2MaxTrend={vo2MaxTrend} />
              <WeightChart weighIns={weighIns} />
            </section>
          )}

          {activeView === 'view-golf' && (
            <section id="view-golf" className="page-section">
              <h2 className="section-title">Golf</h2>
              <RoundPicker
                rounds={GOLF_ROUNDS}
                selectedDate={selectedRound.date}
                onSelectDate={setSelectedRoundDate}
                roundsShown={roundsShown}
                onRoundsShownChange={setRoundsShown}
              />
              {/* Selected round: the KPI row and scorecard describe one round. */}
              <GolfSummary summary={getRoundSummary(selectedRound)} />
              <Scorecard round={selectedRound} />
              {/* Everything below aggregates the `roundsShown` window instead.
                  The three per-hole panels stand down when no round in the
                  window records individual holes; the scoring trend works on
                  round totals, so it always renders. */}
              {holeBearingRounds.length > 0 ? (
                <>
                  <ScoreDistributionChart distribution={getScoreDistribution(windowedRounds)} />
                  <ScoringByParChart scoringByPar={getScoringByPar(windowedRounds)} />
                  <PuttingPanel putting={getPuttingStats(windowedRounds)} />
                </>
              ) : (
                <PanelUnavailable title="Hole-by-hole analysis" reason={NO_HOLE_DATA_WINDOW} />
              )}
              <ScoringTrendChart trend={getScoringTrend(windowedRounds)} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
