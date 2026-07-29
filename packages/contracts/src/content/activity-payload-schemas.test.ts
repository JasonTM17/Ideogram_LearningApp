import { describe, expect, it } from 'vitest';

import { activityPayloadSchemas } from './activity-payload-schemas';

const plannedListeningPayload = {
  audioAssetPath: 'media/ja/n5/ja-n5-l01-01.mp3',
  audioProductionStatus: 'planned' as const,
  questions: [
    {
      explanationVietnamese: 'Nghe lời chào trong hội thoại.',
      options: [
        { isCorrect: true, optionId: 'option-a', text: 'こんにちは' },
        { isCorrect: false, optionId: 'option-b', text: 'こんばんは' },
      ],
      prompt: 'Người nói chào thế nào?',
      questionId: 'ja-n5-l01-01-q1',
    },
  ],
  transcript: 'こんにちは。',
  transcriptVietnamese: 'Xin chào.',
};

describe('listening payload contract', () => {
  it('preserves planned audio state for import and publishing gates', () => {
    expect(activityPayloadSchemas.listening.parse(plannedListeningPayload)).toMatchObject({
      audioProductionStatus: 'planned',
    });
  });

  it('rejects recorded audio when its integrity checksum is missing', () => {
    expect(
      activityPayloadSchemas.listening.safeParse({
        ...plannedListeningPayload,
        audioProductionStatus: 'recorded',
      }).success,
    ).toBe(false);
  });
});
