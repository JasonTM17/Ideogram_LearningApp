import { describe, expect, it, vi } from 'vitest';

import { createDeepSeekTutorGateway, DeepSeekTutorGatewayError } from './deepseek-tutor-gateway';

const configuration = {
  apiKey: 'test_key_without_whitespace',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-v4-flash' as const,
  reasoningEffort: 'high' as const,
  thinkingMode: 'disabled' as const,
};
const response = {
  assessmentVietnamese: 'Bạn đang phân biệt đúng trọng tâm.',
  example: 'これは本です。',
  explanationVietnamese: 'は đánh dấu chủ đề.',
  frequentVietnameseMistake: 'Không đồng nhất は với chủ ngữ.',
  nextExerciseVietnamese: 'Đặt một câu với は.',
  sourceBoundaryVietnamese: 'Không có nguồn bài học được cung cấp trong lượt này.',
};

const input = {
  learnerPreference: {
    explanationDepth: 'standard' as const,
    preferredLanguageCode: 'ja' as const,
    preferredObjectiveKey: 'communication' as const,
    tone: 'encouraging' as const,
  },
  message: 'Vì sao dùng は?',
  targetLevelCode: 'N5',
};

describe('DeepSeek tutor gateway', () => {
  it('sends a bounded JSON tutor request without client-side side effects', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(response) } }] }),
        {
          status: 200,
        },
      ),
    );
    const gateway = createDeepSeekTutorGateway({ configuration, fetch });

    await expect(gateway.respond(input)).resolves.toEqual(response);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse(fetch.mock.calls[0]?.[1].body as string)).toMatchObject({
      model: 'deepseek-v4-flash',
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
    });
  });

  it('fails closed for an invalid provider payload', async () => {
    const gateway = createDeepSeekTutorGateway({
      configuration,
      fetch: vi.fn().mockResolvedValue(new Response('{"choices":[]}', { status: 200 })),
    });

    await expect(gateway.respond(input)).rejects.toBeInstanceOf(DeepSeekTutorGatewayError);
  });
});
