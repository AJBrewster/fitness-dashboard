import { describe, it, expect } from 'vitest';
import { getTotals, getWeeklyDistance, filterByType, filterByDateRange } from './stats.js';

describe('getTotals', () => {
  it('sums distance, duration, and counts activities', () => {
    const activities = [
      { distanceMeters: 1000, durationSeconds: 300 },
      { distanceMeters: 2000, durationSeconds: 600 },
    ];
    expect(getTotals(activities)).toEqual({
      totalDistanceMeters: 3000,
      totalDurationSeconds: 900,
      activityCount: 2,
    });
  });

  it('returns zeros for an empty list', () => {
    expect(getTotals([])).toEqual({
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      activityCount: 0,
    });
  });

  it('handles a single activity', () => {
    const activities = [{ distanceMeters: 500, durationSeconds: 120 }];
    expect(getTotals(activities)).toEqual({
      totalDistanceMeters: 500,
      totalDurationSeconds: 120,
      activityCount: 1,
    });
  });

  it('treats missing distance/duration fields as zero', () => {
    const activities = [
      { distanceMeters: 1000, durationSeconds: 300 },
      { type: 'strength_training' }, // no distanceMeters/durationSeconds at all
    ];
    expect(getTotals(activities)).toEqual({
      totalDistanceMeters: 1000,
      totalDurationSeconds: 300,
      activityCount: 2,
    });
  });
});

describe('getWeeklyDistance', () => {
  it('buckets activities into the Monday of their week and sums distance', () => {
    const activities = [
      { startTime: '2026-07-13T09:00:00', distanceMeters: 1000 }, // Monday
      { startTime: '2026-07-15T09:00:00', distanceMeters: 2000 }, // Wednesday, same week
      { startTime: '2026-07-20T09:00:00', distanceMeters: 500 }, // next Monday
    ];
    expect(getWeeklyDistance(activities)).toEqual([
      { weekStart: '2026-07-13', distanceMeters: 3000 },
      { weekStart: '2026-07-20', distanceMeters: 500 },
    ]);
  });

  it('returns an empty array for no activities', () => {
    expect(getWeeklyDistance([])).toEqual([]);
  });

  it('handles a single activity', () => {
    const activities = [{ startTime: '2026-07-21T19:27:23', distanceMeters: 2551.9 }];
    expect(getWeeklyDistance(activities)).toEqual([{ weekStart: '2026-07-20', distanceMeters: 2551.9 }]);
  });

  it('buckets a Sunday into the week that started the previous Monday', () => {
    const activities = [{ startTime: '2026-07-19T09:00:00', distanceMeters: 100 }]; // Sunday
    expect(getWeeklyDistance(activities)).toEqual([{ weekStart: '2026-07-13', distanceMeters: 100 }]);
  });

  it('treats a missing distance field as zero', () => {
    const activities = [{ startTime: '2026-07-13T09:00:00' }];
    expect(getWeeklyDistance(activities)).toEqual([{ weekStart: '2026-07-13', distanceMeters: 0 }]);
  });
});

describe('filterByType', () => {
  const activities = [
    { type: 'running', name: 'Run' },
    { type: 'walking', name: 'Walk' },
    { type: 'running', name: 'Treadmill Run' },
  ];

  it('returns only activities matching the given type', () => {
    expect(filterByType(activities, 'running')).toEqual([
      { type: 'running', name: 'Run' },
      { type: 'running', name: 'Treadmill Run' },
    ]);
  });

  it('returns an empty array when no activities match', () => {
    expect(filterByType(activities, 'strength_training')).toEqual([]);
  });

  it('returns an empty array when given an empty list', () => {
    expect(filterByType([], 'running')).toEqual([]);
  });
});

describe('filterByDateRange', () => {
  const activities = [
    { startTime: '2026-07-01T09:00:00', name: 'early' },
    { startTime: '2026-07-15T09:00:00', name: 'middle' },
    { startTime: '2026-07-30T09:00:00', name: 'late' },
  ];

  it('returns only activities within the inclusive date range', () => {
    const result = filterByDateRange(activities, '2026-07-10', '2026-07-20');
    expect(result).toEqual([{ startTime: '2026-07-15T09:00:00', name: 'middle' }]);
  });

  it('includes activities exactly on the range boundaries', () => {
    const result = filterByDateRange(activities, '2026-07-01', '2026-07-30T23:59:59');
    expect(result).toEqual(activities);
  });

  it('returns an empty array when nothing falls in range', () => {
    const result = filterByDateRange(activities, '2026-01-01', '2026-01-31');
    expect(result).toEqual([]);
  });
});
