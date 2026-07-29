import type { ReviewGrade, ReviewSchedule } from '@ideogram/contracts';

export interface ReviewSchedulerInput {
  currentSchedule: ReviewSchedule | null;
  grade: ReviewGrade;
  now: Date;
}

const minute = 60 * 1_000;
const day = 24 * 60 * minute;

const clampEaseFactor = (value: number): number => Math.min(3.5, Math.max(1.3, value));

interface ScheduleParts {
  dueAt: Date;
  easeFactor: number;
  intervalMinutes: number;
  lapseCount: number;
  repetitionCount: number;
  state: ReviewSchedule['state'];
}

const toSchedule = ({
  dueAt,
  easeFactor,
  intervalMinutes,
  lapseCount,
  repetitionCount,
  state,
}: ScheduleParts): ReviewSchedule => ({
  algorithmVersion: 'srs-v1',
  dueAt: dueAt.toISOString(),
  easeFactor,
  intervalMinutes,
  lapseCount,
  repetitionCount,
  state,
});

/**
 * Schedules against a server-owned absolute timestamp. The client timezone is
 * display metadata only, so DST and device-clock changes cannot alter order.
 */
export const calculateNextReviewSchedule = ({
  currentSchedule,
  grade,
  now,
}: ReviewSchedulerInput): ReviewSchedule => {
  const currentInterval = currentSchedule?.intervalMinutes ?? 0;
  const currentEase = currentSchedule?.easeFactor ?? 2.3;
  const currentRepetitions = currentSchedule?.repetitionCount ?? 0;
  const currentLapses = currentSchedule?.lapseCount ?? 0;

  if (grade === 'again') {
    const intervalMinutes = 10;
    return toSchedule({
      dueAt: new Date(now.getTime() + intervalMinutes * minute),
      easeFactor: clampEaseFactor(currentEase - 0.2),
      intervalMinutes,
      lapseCount: currentLapses + 1,
      repetitionCount: 0,
      state: 'relearning',
    });
  }

  if (grade === 'hard') {
    const intervalMinutes =
      currentInterval === 0
        ? 24 * 60
        : Math.max(24 * 60, Math.round(Math.max(currentInterval, 24 * 60) * 1.2));
    return toSchedule({
      dueAt: new Date(now.getTime() + intervalMinutes * minute),
      easeFactor: clampEaseFactor(currentEase - 0.15),
      intervalMinutes,
      lapseCount: currentLapses,
      repetitionCount: currentRepetitions + 1,
      state: 'review',
    });
  }

  const initialInterval = grade === 'easy' ? 4 * day : day;
  const multiplier = grade === 'easy' ? 3 : currentEase;
  const intervalMinutes =
    currentInterval === 0
      ? Math.round(initialInterval / minute)
      : Math.round((currentInterval * multiplier) / 10) * 10;

  return toSchedule({
    dueAt: new Date(now.getTime() + intervalMinutes * minute),
    easeFactor: clampEaseFactor(currentEase + (grade === 'easy' ? 0.15 : 0.05)),
    intervalMinutes,
    lapseCount: currentLapses,
    repetitionCount: currentRepetitions + 1,
    state: 'review',
  });
};
