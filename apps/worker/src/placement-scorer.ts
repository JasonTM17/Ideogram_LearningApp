export interface PlacementScoringInput {
  answerPayload: Record<string, unknown>;
  questionType: string;
  scoringRubric: Record<string, unknown>;
}

export interface PlacementScore {
  confidence: number;
  recommendedLevelCode: 'N4' | 'N5';
  scoreSummary: Record<string, unknown>;
}

const numberInRange = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 10
    ? value
    : fallback;

export const scoreJapanesePlacement = (inputs: PlacementScoringInput[]): PlacementScore => {
  if (inputs.length === 0) throw new Error('Placement scoring input is empty.');
  let correctWeight = 0;
  let totalWeight = 0;
  const skillTotals = new Map<string, { correct: number; total: number }>();
  for (const input of inputs) {
    const correctChoice = input.scoringRubric.correctChoice;
    if (!Number.isInteger(correctChoice) || (correctChoice as number) < 0)
      throw new Error('Unsupported placement rubric.');
    const selectedChoice = input.answerPayload.selectedChoice;
    const weight = numberInRange(input.scoringRubric.weight, 1);
    const skill =
      typeof input.scoringRubric.skill === 'string'
        ? input.scoringRubric.skill
        : input.questionType;
    const isCorrect = selectedChoice === correctChoice || selectedChoice === String(correctChoice);
    totalWeight += weight;
    if (isCorrect) correctWeight += weight;
    const total = skillTotals.get(skill) ?? { correct: 0, total: 0 };
    total.total += weight;
    if (isCorrect) total.correct += weight;
    skillTotals.set(skill, total);
  }
  const ratio = correctWeight / totalWeight;
  const confidence = Number(Math.min(0.95, 0.45 + ratio * 0.5).toFixed(3));
  return {
    confidence,
    recommendedLevelCode: ratio >= 0.75 ? 'N4' : 'N5',
    scoreSummary: {
      correctWeight,
      itemCount: inputs.length,
      ratio: Number(ratio.toFixed(3)),
      skills: Object.fromEntries(
        [...skillTotals].map(([skill, totals]) => [
          skill,
          { correct: totals.correct, total: totals.total },
        ]),
      ),
      totalWeight,
      version: 'ja-n5-placement-v1',
    },
  };
};
