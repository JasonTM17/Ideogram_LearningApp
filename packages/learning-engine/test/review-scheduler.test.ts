import { describe, expect, it } from 'vitest';

import { calculateNextReviewSchedule } from '../src/review-scheduler';

describe('review scheduler', () => {
  const now = new Date('2026-03-08T06:55:00.000Z');

  it('uses server UTC time consistently across a DST transition', () => {
    const schedule = calculateNextReviewSchedule({ currentSchedule: null, grade: 'good', now });

    expect(schedule.dueAt).toBe('2026-03-09T06:55:00.000Z');
    expect(schedule.intervalMinutes).toBe(1_440);
  });

  it('keeps a deterministic bounded learning interval for each grade', () => {
    const again = calculateNextReviewSchedule({ currentSchedule: null, grade: 'again', now });
    const hard = calculateNextReviewSchedule({ currentSchedule: null, grade: 'hard', now });
    const easy = calculateNextReviewSchedule({ currentSchedule: null, grade: 'easy', now });

    expect(again).toMatchObject({ intervalMinutes: 10, lapseCount: 1, state: 'relearning' });
    expect(hard.intervalMinutes).toBe(1_440);
    expect(easy.intervalMinutes).toBe(5_760);
  });

  it('rebuilds the same next schedule from the same current state and event', () => {
    const currentSchedule = {
      algorithmVersion: 'srs-v1' as const,
      dueAt: '2026-03-07T06:55:00.000Z',
      easeFactor: 2.3,
      intervalMinutes: 1_440,
      lapseCount: 0,
      repetitionCount: 1,
      state: 'review' as const,
    };

    expect(calculateNextReviewSchedule({ currentSchedule, grade: 'good', now })).toEqual(
      calculateNextReviewSchedule({ currentSchedule, grade: 'good', now }),
    );
  });
});
