import { describe, expect, it } from 'vitest';

import { assembleLearnerCatalog, LearnerCatalogIntegrityError } from './learner-catalog-assembler';

import type { LearnerCatalogDataSet } from './learner-catalog-assembler';

const createCatalogDataSet = (): LearnerCatalogDataSet => ({
  activities: [
    {
      activity_id: 'ja-n5-demo-objective',
      activity_type: 'objective_quiz',
      content_release_id: 'ja-n5-demo-v1',
      estimated_minutes: 3,
      instructions_vietnamese: 'Chọn đáp án phù hợp.',
      lesson_id: 'ja-n5-demo-l1',
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
    {
      activity_id: 'ja-n5-demo-retrieval',
      activity_type: 'retrieval',
      content_release_id: 'ja-n5-demo-v1',
      estimated_minutes: 2,
      instructions_vietnamese: 'Trả lời bằng tiếng Nhật.',
      lesson_id: 'ja-n5-demo-l2',
      payload: {
        prompt: 'わたし',
        promptVietnamese: 'Nghĩa là gì?',
      },
      sequence: 1,
      target_script: 'kana_kanji',
      title_vietnamese: 'Nhớ lại từ vựng',
    },
  ],
  languagePacks: [
    {
      availability_state: 'active',
      display_name_vietnamese: 'Tiếng Hàn',
      language_code: 'ko',
    },
    {
      availability_state: 'active',
      display_name_vietnamese: 'Tiếng Nhật',
      language_code: 'ja',
    },
  ],
  lessons: [
    {
      content_release_id: 'ja-n5-demo-v1',
      estimated_minutes: 8,
      lesson_id: 'ja-n5-demo-l2',
      sequence: 1,
      status: 'published',
      summary_vietnamese: 'Ôn lại từ vựng đã gặp.',
      title_vietnamese: 'Nhớ lại',
      unit_id: 'ja-n5-demo-u2',
    },
    {
      content_release_id: 'ja-n5-demo-v1',
      estimated_minutes: 10,
      lesson_id: 'ja-n5-demo-l1',
      sequence: 1,
      status: 'published',
      summary_vietnamese: 'Làm quen với lời chào cơ bản.',
      title_vietnamese: 'Chào hỏi',
      unit_id: 'ja-n5-demo-u1',
    },
  ],
  paths: [
    {
      language_code: 'ja',
      level_code: 'N5',
      objective_key: 'exam',
      path_id: '50000000-0000-0000-0000-000000000001',
      path_status: 'published',
    },
  ],
  releases: [
    {
      content_release_id: 'ja-n5-demo-v1',
      path_id: '50000000-0000-0000-0000-000000000001',
      published_at: '2026-07-29T12:00:00.000Z',
      release_status: 'published',
      title_vietnamese: 'Nhật ngữ N5',
      version: 'v1.0.0',
    },
  ],
  units: [
    {
      content_release_id: 'ja-n5-demo-v1',
      sequence: 2,
      status: 'published',
      title_vietnamese: 'Ôn lại',
      unit_id: 'ja-n5-demo-u2',
    },
    {
      content_release_id: 'ja-n5-demo-v1',
      sequence: 1,
      status: 'published',
      title_vietnamese: 'Bắt đầu',
      unit_id: 'ja-n5-demo-u1',
    },
  ],
});

describe('assembleLearnerCatalog', () => {
  it('orders the catalog deterministically and preserves active packs without releases', () => {
    const catalog = assembleLearnerCatalog(createCatalogDataSet());

    expect(catalog.languagePacks.map((languagePack) => languagePack.languageCode)).toEqual([
      'ja',
      'ko',
    ]);
    expect(catalog.languagePacks[0]?.releases[0]?.units.map((unit) => unit.sequence)).toEqual([
      1, 2,
    ]);
    expect(
      catalog.languagePacks[0]?.releases[0]?.units[0]?.lessons[0]?.activities[0]?.payload,
    ).toEqual({
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
    });
    expect(catalog.languagePacks[1]?.releases).toEqual([]);
  });

  it('fails closed when the RPC response contains answer-bearing payload fields', () => {
    const dataSet = createCatalogDataSet();
    dataSet.activities[0]!.payload = {
      questions: [
        {
          explanationVietnamese: 'Không được trả về learner.',
          options: [{ isCorrect: true, optionId: 'option-a', text: 'こんにちは' }],
          prompt: 'Chọn lời chào.',
          questionId: 'question-1',
        },
      ],
    };

    expect(() => assembleLearnerCatalog(dataSet)).toThrow();
  });

  it('fails closed when a safe activity does not belong to a visible lesson', () => {
    const dataSet = createCatalogDataSet();
    dataSet.activities[0]!.lesson_id = 'ja-n5-demo-missing-lesson';

    expect(() => assembleLearnerCatalog(dataSet)).toThrow(LearnerCatalogIntegrityError);
  });

  it('rejects an invalid release timestamp even when no release comparison is needed', () => {
    const dataSet = createCatalogDataSet();
    dataSet.releases[0]!.published_at = 'not-a-timestamp';

    expect(() => assembleLearnerCatalog(dataSet)).toThrow(LearnerCatalogIntegrityError);
  });
});
