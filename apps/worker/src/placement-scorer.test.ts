import { describe, expect, it } from 'vitest';
import { scoreJapanesePlacement } from './placement-scorer';

describe('scoreJapanesePlacement', () => {
  it('returns a bounded recommendation from private rubric data', () => {
    expect(
      scoreJapanesePlacement([
        {
          answerPayload: { selectedChoice: 0 },
          questionType: 'vocabulary',
          scoringRubric: { correctChoice: 0, skill: 'vocabulary' },
        },
        {
          answerPayload: { selectedChoice: 1 },
          questionType: 'grammar',
          scoringRubric: { correctChoice: 1, skill: 'grammar' },
        },
      ]),
    ).toMatchObject({ confidence: 0.95, recommendedLevelCode: 'N4', scoreSummary: { ratio: 1 } });
  });
  it('rejects unknown rubrics instead of guessing a score', () => {
    expect(() =>
      scoreJapanesePlacement([
        { answerPayload: {}, questionType: 'vocabulary', scoringRubric: {} },
      ]),
    ).toThrow('Unsupported');
  });
});
