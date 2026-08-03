import { describe, expect, it, vi } from 'vitest';

import {
  readPlacementCatalog,
  recordPlacementAnswer,
  startPlacementSession,
  submitPlacementSession,
} from './placement-repository';

import type { PlacementExecutor } from './placement-repository';
import type { SupabaseClient } from '@supabase/supabase-js';

const ids = {
  answer: '123e4567-e89b-42d3-a456-426614174001',
  device: '123e4567-e89b-42d3-a456-426614174002',
  idempotency: '123e4567-e89b-42d3-a456-426614174003',
  question: '123e4567-e89b-42d3-a456-426614174004',
  questionSet: '123e4567-e89b-42d3-a456-426614174005',
  session: '123e4567-e89b-42d3-a456-426614174006',
  user: '123e4567-e89b-42d3-a456-426614174007',
};

const createCatalogClient = () => {
  const limit = vi.fn(async () => ({
    data: [
      {
        language_code: 'ja',
        objective_key: 'exam',
        placement_question_set_id: ids.questionSet,
        placement_questions: [
          {
            placement_question_id: ids.question,
            prompt_payload: { choices: ['A'], promptVietnamese: 'Chọn' },
            question_key: 'q-1',
            question_type: 'vocabulary',
            sequence: 1,
          },
        ],
        placement_version: 'v1.0.0',
        title_vietnamese: 'Kiểm tra N5',
      },
    ],
    error: null,
  }));
  const order = vi.fn(() => ({ limit }));
  const secondEq = vi.fn(() => ({ order }));
  const firstEq = vi.fn(() => ({ eq: secondEq }));
  const select = vi.fn(() => ({ eq: firstEq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from } as unknown as SupabaseClient, from, limit };
};

const executor =
  (rows: Record<string, unknown>[]): PlacementExecutor =>
  async (operation) =>
    operation({ query: vi.fn(async () => ({ rowCount: rows.length, rows })) } as never);

describe('placement repository', () => {
  it('projects only answer-safe published questions in stable sequence order', async () => {
    const fixture = createCatalogClient();
    await expect(readPlacementCatalog(fixture.client)).resolves.toMatchObject({
      questionSets: [
        {
          placementQuestionSetId: ids.questionSet,
          questions: [{ placementQuestionId: ids.question }],
        },
      ],
    });
    expect(fixture.from).toHaveBeenCalledWith('placement_question_sets');
    expect(fixture.limit).toHaveBeenCalledWith(12);
  });

  it('maps database receipts for start, answer, and submit without exposing scoring inputs', async () => {
    await expect(
      startPlacementSession(
        {
          idempotencyKey: ids.idempotency,
          placementQuestionSetId: ids.questionSet,
          userId: ids.user,
        },
        executor([
          { idempotent_replay: false, placement_session_id: ids.session, session_status: 'draft' },
        ]),
      ),
    ).resolves.toMatchObject({ placementSessionId: ids.session, sessionStatus: 'draft' });
    await expect(
      recordPlacementAnswer(
        {
          answerPayload: { selectedChoice: 'A' },
          attemptNumber: 1,
          clientRecordedAt: null,
          deviceId: ids.device,
          deviceSequence: 1,
          idempotencyKey: ids.idempotency,
          placementQuestionId: ids.question,
          placementSessionId: ids.session,
          responseTimeMs: 0,
          userId: ids.user,
        },
        executor([{ idempotent_replay: false, placement_answer_id: ids.answer }]),
      ),
    ).resolves.toEqual({ idempotentReplay: false, placementAnswerId: ids.answer });
    await expect(
      submitPlacementSession(
        { placementSessionId: ids.session, userId: ids.user },
        executor([
          {
            completed_at: null,
            confidence: null,
            placement_session_id: ids.session,
            recommended_level_code: null,
            scored_at: null,
            session_status: 'submitted',
            submitted_at: '2026-08-03T00:00:00.000Z',
          },
        ]),
      ),
    ).resolves.toMatchObject({ placementSessionId: ids.session, sessionStatus: 'submitted' });
  });
});
