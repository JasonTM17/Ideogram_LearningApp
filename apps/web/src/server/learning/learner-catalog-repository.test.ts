import { describe, expect, it, vi } from 'vitest';

import { LearnerCatalogRepositoryError, readLearnerCatalog } from './learner-catalog-repository';

import type { LearnerCatalogRpcData } from './learner-catalog-row-contracts';
import type { SupabaseClient } from '@supabase/supabase-js';

const createSafeCatalogData = (): LearnerCatalogRpcData => ({
  activities: [
    {
      activity_id: 'ja-n5-repository-objective',
      activity_type: 'objective_quiz',
      content_release_id: 'ja-n5-repository-v1',
      estimated_minutes: 3,
      instructions_vietnamese: 'Chọn đáp án phù hợp.',
      lesson_id: 'ja-n5-repository-l1',
      payload: {
        questions: [
          {
            options: [
              { optionId: 'option-a', text: 'こんにちは' },
              { optionId: 'option-b', text: 'ありがとう' },
            ],
            prompt: 'Chọn lời chào.',
            questionId: 'question-1',
          },
        ],
      },
      sequence: 1,
      target_script: 'kana_kanji',
      title_vietnamese: 'Chọn lời chào',
    },
  ],
  language_packs: [
    {
      availability_state: 'active',
      display_name_vietnamese: 'Tiếng Nhật',
      language_code: 'ja',
    },
  ],
  lessons: [
    {
      content_release_id: 'ja-n5-repository-v1',
      estimated_minutes: 10,
      lesson_id: 'ja-n5-repository-l1',
      sequence: 1,
      status: 'published',
      summary_vietnamese: 'Làm quen với lời chào cơ bản.',
      title_vietnamese: 'Chào hỏi',
      unit_id: 'ja-n5-repository-u1',
    },
  ],
  paths: [
    {
      language_code: 'ja',
      level_code: 'N5',
      objective_key: 'exam',
      path_id: '50000000-0000-4000-8000-000000000001',
      path_status: 'published',
    },
  ],
  releases: [
    {
      content_release_id: 'ja-n5-repository-v1',
      path_id: '50000000-0000-4000-8000-000000000001',
      published_at: '2026-07-29T12:00:00.000Z',
      release_status: 'published',
      title_vietnamese: 'Nhật ngữ N5',
      version: 'v1.0.0',
    },
  ],
  units: [
    {
      content_release_id: 'ja-n5-repository-v1',
      sequence: 1,
      status: 'published',
      title_vietnamese: 'Bắt đầu',
      unit_id: 'ja-n5-repository-u1',
    },
  ],
});

const createClient = (result: { data: unknown; error: unknown }) => {
  const rpc = vi.fn().mockResolvedValue(result);

  return { client: { rpc } as unknown as SupabaseClient, rpc };
};

describe('readLearnerCatalog', () => {
  it('uses the sole safe catalog RPC instead of querying source tables', async () => {
    const { client, rpc } = createClient({ data: createSafeCatalogData(), error: null });

    const catalog = await readLearnerCatalog(client);

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('get_learner_catalog_data');
    expect(
      catalog.languagePacks[0]?.releases[0]?.units[0]?.lessons[0]?.activities[0]?.titleVietnamese,
    ).toBe('Chọn lời chào');
  });

  it('fails closed if the aggregate RPC contains answer-bearing activity payload data', async () => {
    const data = createSafeCatalogData();
    data.activities[0]!.payload = {
      questions: [
        {
          options: [{ isCorrect: true, optionId: 'option-a', text: 'こんにちは' }],
          prompt: 'Chọn lời chào.',
          questionId: 'question-1',
        },
      ],
    };
    const { client } = createClient({ data, error: null });

    await expect(readLearnerCatalog(client)).rejects.toThrow();
  });

  it('normalizes Supabase RPC failures without preserving provider details', async () => {
    const { client } = createClient({
      data: null,
      error: { message: 'provider detail must not leave this boundary' },
    });

    await expect(readLearnerCatalog(client)).rejects.toThrow(LearnerCatalogRepositoryError);
  });
});
