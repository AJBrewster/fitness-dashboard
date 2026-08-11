import { describe, it, expect } from 'vitest';
import {
  getTotals,
  getWeeklyDistance,
  getWeeklyDuration,
  getWeeklyActivityCount,
  filterByType,
  filterByDateRange,
  getActivityTypeBreakdown,
  getAvgHrByType,
  getCurrentWeekRange,
  getWellnessSeries,
  getWellnessDelta,
} from './stats.js';

describe('getTotals', () => {
  it('sums distance, duration, and counts activities', () => {
    const activities = [
      { startTime: '2026-07-01T09:00:00', distanceMeters: 1000, durationSeconds: 300 },
      { startTime: '2026-07-02T09:00:00', distanceMeters: 2000, durationSeconds: 600 },
    ];
    expect(getTotals(activities)).toEqual({
      totalDistanceMeters: 3000,
      totalDurationSeconds: 900,
      activityCount: 2,
      streak: 2,
    });
  });

  it('returns zeros for an empty list', () => {
    expect(getTotals([])).toEqual({
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      activityCount: 0,
      streak: 0,
    });
  });

  it('handles a single activity', () => {
    const activities = [{ startTime: '2026-07-01T09:00:00', distanceMeters: 500, durationSeconds: 120 }];
    expect(getTotals(activities)).toEqual({
      totalDistanceMeters: 500,
      totalDurationSeconds: 120,
      activityCount: 1,
      streak: 1,
    });
  });

  it('treats missing distance/duration fields as zero', () => {
    const activities = [
      { startTime: '2026-07-01T09:00:00', distanceMeters: 1000, durationSeconds: 300 },
      { startTime: '2026-07-02T09:00:00', type: 'strength_training' }, // no distanceMeters/durationSeconds at all
    ];
    expect(getTotals(activities)).toEqual({
      totalDistanceMeters: 1000,
      totalDurationSeconds: 300,
      activityCount: 2,
      streak: 2,
    });
  });

  it('finds the longest streak, not just the most recent one', () => {
    const dates = [
      '2026-07-01', // streak of 2 (07-01, 07-02)
      '2026-07-02',
      '2026-07-05', // gap, streak of 4 (07-05..07-08)
      '2026-07-06',
      '2026-07-07',
      '2026-07-08',
      '2026-07-20', // gap, streak of 1
    ];
    const activities = dates.map((date) => ({ startTime: `${date}T09:00:00` }));
    expect(getTotals(activities).streak).toBe(4);
  });

  it('treats multiple activities on the same day as one day, not a longer streak', () => {
    const activities = [
      { startTime: '2026-07-01T06:00:00' },
      { startTime: '2026-07-01T18:00:00' }, // same day, second activity
      { startTime: '2026-07-02T06:00:00' },
    ];
    expect(getTotals(activities).streak).toBe(2);
  });

  it('is order-independent — unsorted input still finds the right streak', () => {
    const activities = [
      { startTime: '2026-07-08T09:00:00' },
      { startTime: '2026-07-01T09:00:00' },
      { startTime: '2026-07-02T09:00:00' },
    ];
    expect(getTotals(activities).streak).toBe(2);
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

describe('getWeeklyDuration', () => {
  it('buckets activities into the Monday of their week and sums duration', () => {
    const activities = [
      { startTime: '2026-07-13T09:00:00', durationSeconds: 1000 }, // Monday
      { startTime: '2026-07-15T09:00:00', durationSeconds: 2000 }, // Wednesday, same week
      { startTime: '2026-07-20T09:00:00', durationSeconds: 500 }, // next Monday
    ];
    expect(getWeeklyDuration(activities)).toEqual([
      { weekStart: '2026-07-13', durationSeconds: 3000 },
      { weekStart: '2026-07-20', durationSeconds: 500 },
    ]);
  });

  it('returns an empty array for no activities', () => {
    expect(getWeeklyDuration([])).toEqual([]);
  });

  it('handles a single activity', () => {
    const activities = [{ startTime: '2026-07-21T19:27:23', durationSeconds: 1800 }];
    expect(getWeeklyDuration(activities)).toEqual([{ weekStart: '2026-07-20', durationSeconds: 1800 }]);
  });

  it('buckets a Sunday into the week that started the previous Monday', () => {
    const activities = [{ startTime: '2026-07-19T09:00:00', durationSeconds: 100 }]; // Sunday
    expect(getWeeklyDuration(activities)).toEqual([{ weekStart: '2026-07-13', durationSeconds: 100 }]);
  });

  it('treats a missing duration field as zero', () => {
    const activities = [{ startTime: '2026-07-13T09:00:00' }];
    expect(getWeeklyDuration(activities)).toEqual([{ weekStart: '2026-07-13', durationSeconds: 0 }]);
  });
});

describe('getWeeklyActivityCount', () => {
  it('buckets activities into the Monday of their week and counts them', () => {
    const activities = [
      { startTime: '2026-07-13T09:00:00' }, // Monday
      { startTime: '2026-07-15T09:00:00' }, // Wednesday, same week
      { startTime: '2026-07-20T09:00:00' }, // next Monday
    ];
    expect(getWeeklyActivityCount(activities)).toEqual([
      { weekStart: '2026-07-13', count: 2 },
      { weekStart: '2026-07-20', count: 1 },
    ]);
  });

  it('returns an empty array for no activities', () => {
    expect(getWeeklyActivityCount([])).toEqual([]);
  });

  it('handles a single activity', () => {
    const activities = [{ startTime: '2026-07-21T19:27:23' }];
    expect(getWeeklyActivityCount(activities)).toEqual([{ weekStart: '2026-07-20', count: 1 }]);
  });

  it('buckets a Sunday into the week that started the previous Monday', () => {
    const activities = [{ startTime: '2026-07-19T09:00:00' }]; // Sunday
    expect(getWeeklyActivityCount(activities)).toEqual([{ weekStart: '2026-07-13', count: 1 }]);
  });
});

describe('weekly bucketing consistency', () => {
  it('getWeeklyDistance/getWeeklyDuration/getWeeklyActivityCount all bucket into identical weekStart keys', () => {
    const activities = [
      { startTime: '2026-07-13T09:00:00', distanceMeters: 1000, durationSeconds: 300 }, // Monday
      { startTime: '2026-07-19T09:00:00', distanceMeters: 200, durationSeconds: 60 }, // Sunday, same week
      { startTime: '2026-07-20T09:00:00', distanceMeters: 500, durationSeconds: 150 }, // next Monday
    ];

    const weekStartsFrom = (result) => result.map((entry) => entry.weekStart);

    expect(weekStartsFrom(getWeeklyDistance(activities))).toEqual(['2026-07-13', '2026-07-20']);
    expect(weekStartsFrom(getWeeklyDuration(activities))).toEqual(weekStartsFrom(getWeeklyDistance(activities)));
    expect(weekStartsFrom(getWeeklyActivityCount(activities))).toEqual(weekStartsFrom(getWeeklyDistance(activities)));
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

describe('getActivityTypeBreakdown', () => {
  it('counts activities per type, most common first', () => {
    const activities = [
      { type: 'running' },
      { type: 'walking' },
      { type: 'running' },
      { type: 'running' },
      { type: 'walking' },
    ];
    expect(getActivityTypeBreakdown(activities)).toEqual([
      { type: 'running', count: 3 },
      { type: 'walking', count: 2 },
    ]);
  });

  it('returns an empty array for no activities', () => {
    expect(getActivityTypeBreakdown([])).toEqual([]);
  });

  it('handles a single activity', () => {
    expect(getActivityTypeBreakdown([{ type: 'ultimate_disc' }])).toEqual([{ type: 'ultimate_disc', count: 1 }]);
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

describe('getCurrentWeekRange', () => {
  it('returns Monday..Sunday for a mid-week reference date', () => {
    expect(getCurrentWeekRange(new Date('2026-06-10T12:00:00'))).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    });
  });

  it('treats a Monday reference date as the start of its own week', () => {
    expect(getCurrentWeekRange(new Date('2026-06-08T09:00:00'))).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    });
  });

  it('treats a Sunday reference date as the end of its own week', () => {
    expect(getCurrentWeekRange(new Date('2026-06-14T21:00:00'))).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    });
  });

  it('spans a year boundary correctly', () => {
    expect(getCurrentWeekRange(new Date('2026-01-01T12:00:00'))).toEqual({
      start: '2025-12-29',
      end: '2026-01-04',
    });
  });
});

describe('getAvgHrByType', () => {
  it('averages avgHrBpm per type, highest first', () => {
    const activities = [
      { type: 'running', avgHrBpm: 150 },
      { type: 'running', avgHrBpm: 160 },
      { type: 'walking', avgHrBpm: 100 },
    ];
    expect(getAvgHrByType(activities)).toEqual([
      { type: 'running', avgHr: 155 },
      { type: 'walking', avgHr: 100 },
    ]);
  });

  it('excludes null HR readings from a type\'s average rather than counting them as zero', () => {
    const activities = [
      { type: 'running', avgHrBpm: 150 },
      { type: 'running', avgHrBpm: null },
      { type: 'running', avgHrBpm: 160 },
    ];
    // Average of 150 and 160, not (150 + 0 + 160) / 3.
    expect(getAvgHrByType(activities)).toEqual([{ type: 'running', avgHr: 155 }]);
  });

  it('omits a type whose activities never recorded HR', () => {
    const activities = [
      { type: 'running', avgHrBpm: 150 },
      { type: 'strength_training', avgHrBpm: null },
      { type: 'strength_training', avgHrBpm: null },
    ];
    expect(getAvgHrByType(activities)).toEqual([{ type: 'running', avgHr: 150 }]);
  });

  it('rounds the average to one decimal', () => {
    const activities = [
      { type: 'running', avgHrBpm: 141 },
      { type: 'running', avgHrBpm: 158 },
      { type: 'running', avgHrBpm: 165 },
    ];
    expect(getAvgHrByType(activities)).toEqual([{ type: 'running', avgHr: 154.7 }]);
  });

  it('returns an empty array for no activities', () => {
    expect(getAvgHrByType([])).toEqual([]);
  });
});

describe('getWellnessSeries', () => {
  it('returns a field\'s values in date order', () => {
    const wellness = [
      { date: '2026-07-16', sleepScore: 72 },
      { date: '2026-07-15', sleepScore: 68 },
      { date: '2026-07-17', sleepScore: 80 },
    ];
    expect(getWellnessSeries(wellness, 'sleepScore')).toEqual([68, 72, 80]);
  });

  it('drops null and undefined values rather than zeroing them', () => {
    const wellness = [
      { date: '2026-07-15', sleepScore: 68 },
      { date: '2026-07-16', sleepScore: null },
      { date: '2026-07-17' },
      { date: '2026-07-18', sleepScore: 74 },
    ];
    expect(getWellnessSeries(wellness, 'sleepScore')).toEqual([68, 74]);
  });

  it('returns an empty array when the field is null on every day', () => {
    const wellness = [
      { date: '2026-07-15', sleepScore: null },
      { date: '2026-07-16', sleepScore: null },
    ];
    expect(getWellnessSeries(wellness, 'sleepScore')).toEqual([]);
  });

  it('returns an empty array for empty input', () => {
    expect(getWellnessSeries([], 'sleepScore')).toEqual([]);
  });
});

describe('getWellnessDelta', () => {
  it('is the change between the latest two recorded values', () => {
    const wellness = [
      { date: '2026-07-15', trainingReadinessScore: 55 },
      { date: '2026-07-16', trainingReadinessScore: 61 },
    ];
    expect(getWellnessDelta(wellness, 'trainingReadinessScore')).toBe(6);
  });

  it('is negative when the value dropped', () => {
    const wellness = [
      { date: '2026-07-15', trainingReadinessScore: 61 },
      { date: '2026-07-16', trainingReadinessScore: 48 },
    ];
    expect(getWellnessDelta(wellness, 'trainingReadinessScore')).toBe(-13);
  });

  it('compares the last two recorded values, skipping nulls between them', () => {
    const wellness = [
      { date: '2026-07-15', trainingReadinessScore: 50 },
      { date: '2026-07-16', trainingReadinessScore: null },
      { date: '2026-07-17', trainingReadinessScore: 62 },
    ];
    expect(getWellnessDelta(wellness, 'trainingReadinessScore')).toBe(12);
  });

  it('returns null when there are fewer than two recorded values', () => {
    const wellness = [{ date: '2026-07-15', trainingReadinessScore: 61 }];
    expect(getWellnessDelta(wellness, 'trainingReadinessScore')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(getWellnessDelta([], 'trainingReadinessScore')).toBeNull();
  });
});
