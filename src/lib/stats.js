export function getTotals(activities) {
  const totalDistanceMeters = activities.reduce((sum, a) => sum + (a.distanceMeters ?? 0), 0);
  const totalDurationSeconds = activities.reduce((sum, a) => sum + (a.durationSeconds ?? 0), 0);
  const activityCount = activities.length;
  return { totalDistanceMeters, totalDurationSeconds, activityCount };
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
