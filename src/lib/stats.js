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

export function getWeeklyDistance(activities) {
  const distanceByWeek = new Map();
  for (const activity of activities) {
    const weekStart = getWeekStart(activity.startTime);
    const current = distanceByWeek.get(weekStart) ?? 0;
    distanceByWeek.set(weekStart, current + (activity.distanceMeters ?? 0));
  }

  return Array.from(distanceByWeek, ([weekStart, distanceMeters]) => ({ weekStart, distanceMeters }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export function filterByType(activities, type) {
  return activities.filter((a) => a.type === type);
}

export function filterByDateRange(activities, start, end) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return activities.filter((a) => {
    const activityTime = new Date(a.startTime).getTime();
    return activityTime >= startTime && activityTime <= endTime;
  });
}
