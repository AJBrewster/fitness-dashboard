export function getTotals(activities) {
  const totalDistanceMeters = activities.reduce((sum, a) => sum + (a.distanceMeters ?? 0), 0);
  const totalDurationSeconds = activities.reduce((sum, a) => sum + (a.durationSeconds ?? 0), 0);
  const activityCount = activities.length;
  const streak = getStreak(activities);
  return { totalDistanceMeters, totalDurationSeconds, activityCount, streak };
}

// Local (not UTC) calendar date, as 'YYYY-MM-DD' — avoids the day-shift
// bug you'd get from toISOString() in timezones ahead of UTC.
function getDateKey(startTime) {
  const date = new Date(startTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Longest run of consecutive calendar days containing at least one
// activity — not a "current streak as of today," since that would make
// this non-deterministic against the fixture (today's date shouldn't
// change what the tests assert).
function getStreak(activities) {
  const uniqueDates = [...new Set(activities.map((a) => getDateKey(a.startTime)))].sort();

  let longestStreak = 0;
  let currentStreak = 0;
  let previousDate = null;

  for (const dateStr of uniqueDates) {
    const date = new Date(dateStr);
    const dayDiff = previousDate ? Math.round((date - previousDate) / (1000 * 60 * 60 * 24)) : null;
    currentStreak = dayDiff === 1 ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    previousDate = date;
  }

  return longestStreak;
}

function getWeekStart(startTime) {
  const date = new Date(startTime);
  const dayOfWeek = date.getDay(); // 0 = Sunday .. 6 = Saturday
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

// Shared bucketing step behind getWeeklyDistance/getWeeklyDuration/
// getWeeklyActivityCount — each just reduces a different field over the
// same Monday-keyed groups, sorted the same way.
function groupByWeek(activities) {
  const byWeek = new Map();
  for (const activity of activities) {
    const weekStart = getWeekStart(activity.startTime);
    if (!byWeek.has(weekStart)) byWeek.set(weekStart, []);
    byWeek.get(weekStart).push(activity);
  }
  return byWeek;
}

function sortedWeekStarts(byWeek) {
  return [...byWeek.keys()].sort((a, b) => a.localeCompare(b));
}

export function getWeeklyDistance(activities) {
  const byWeek = groupByWeek(activities);
  return sortedWeekStarts(byWeek).map((weekStart) => ({
    weekStart,
    distanceMeters: byWeek.get(weekStart).reduce((sum, a) => sum + (a.distanceMeters ?? 0), 0),
  }));
}

export function getWeeklyDuration(activities) {
  const byWeek = groupByWeek(activities);
  return sortedWeekStarts(byWeek).map((weekStart) => ({
    weekStart,
    durationSeconds: byWeek.get(weekStart).reduce((sum, a) => sum + (a.durationSeconds ?? 0), 0),
  }));
}

export function getWeeklyActivityCount(activities) {
  const byWeek = groupByWeek(activities);
  return sortedWeekStarts(byWeek).map((weekStart) => ({
    weekStart,
    count: byWeek.get(weekStart).length,
  }));
}

export function filterByType(activities, type) {
  return activities.filter((a) => a.type === type);
}

// Counts per activity type, most common first — feeds the activity-type
// breakdown chart.
export function getActivityTypeBreakdown(activities) {
  const countsByType = new Map();
  for (const activity of activities) {
    countsByType.set(activity.type, (countsByType.get(activity.type) ?? 0) + 1);
  }

  return Array.from(countsByType, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
}

export function filterByDateRange(activities, start, end) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return activities.filter((a) => {
    const activityTime = new Date(a.startTime).getTime();
    return activityTime >= startTime && activityTime <= endTime;
  });
}

// Monday-start 'YYYY-MM-DD' bounds for the week containing `referenceDate`
// (defaults to now) — feeds DateRangeFilter's "This week" preset. Shares
// Monday-as-week-start with getWeekStart, but uses getDateKey's local-date
// math instead of toISOString(), avoiding the UTC day-shift risk that
// getWeekStart still carries (see its comment — not fixed there since it
// works for the existing fixture-pinned tests, but don't copy it into new
// code). Takes an explicit referenceDate so callers can unit test it
// deterministically instead of depending on the system clock.
export function getCurrentWeekRange(referenceDate = new Date()) {
  const dayOfWeek = referenceDate.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(referenceDate);
  monday.setDate(monday.getDate() - daysSinceMonday);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  return { start: getDateKey(monday), end: getDateKey(sunday) };
}
