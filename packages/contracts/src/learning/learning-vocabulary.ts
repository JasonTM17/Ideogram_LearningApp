export const reviewGrades = ['again', 'hard', 'good', 'easy'] as const;
export const reviewItemStates = ['learning', 'review', 'relearning', 'suspended'] as const;
export const activityAttemptStates = ['submitted', 'completed', 'needs_review'] as const;
export const lessonProgressStates = ['not_started', 'in_progress', 'completed'] as const;
export const placementSessionStatuses = ['draft', 'submitted', 'scored', 'abandoned'] as const;
export const learnerEnrollmentStates = ['active', 'paused', 'completed', 'archived'] as const;

export type LearnerEnrollmentState = (typeof learnerEnrollmentStates)[number];
export type ActivityAttemptState = (typeof activityAttemptStates)[number];
export type LessonProgressState = (typeof lessonProgressStates)[number];
export type PlacementSessionStatus = (typeof placementSessionStatuses)[number];
export type ReviewGrade = (typeof reviewGrades)[number];
export type ReviewItemState = (typeof reviewItemStates)[number];

export const reviewGradeScores: Record<ReviewGrade, number> = {
  again: 0,
  easy: 3,
  good: 2,
  hard: 1,
};
