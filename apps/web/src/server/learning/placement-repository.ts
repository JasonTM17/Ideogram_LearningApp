import { createHash } from 'node:crypto';

import {
  placementAnswerReceiptSchema,
  placementCatalogResponseSchema,
  placementSessionReceiptSchema,
  placementSessionStartReceiptSchema,
  type PlacementAnswerInput,
  type PlacementAnswerReceipt,
  type PlacementCatalogResponse,
  type PlacementSessionReceipt,
  type PlacementSessionStartInput,
  type PlacementSessionStartReceipt,
} from '@ideogram/contracts';
import { withLearningExecutorTransaction } from '@/server/learning/learning-executor-pool';
import { ApiHttpError } from '@/server/http/api-response';
import { z } from 'zod';

import type { PoolClient, QueryResultRow } from 'pg';
import type { SupabaseClient } from '@supabase/supabase-js';

const placementQuestionRowSchema = z
  .object({
    placement_question_id: z.uuid(),
    prompt_payload: z.record(z.string(), z.unknown()),
    question_key: z.string(),
    question_type: z.string(),
    sequence: z.number().int(),
  })
  .strict();

const placementSetRowSchema = z
  .object({
    language_code: z.string(),
    objective_key: z.string(),
    placement_question_set_id: z.uuid(),
    placement_questions: z.array(placementQuestionRowSchema),
    placement_version: z.string(),
    title_vietnamese: z.string(),
  })
  .strict();

export class PlacementRepositoryError extends Error {
  constructor() {
    super('Placement data is unavailable.');
    this.name = 'PlacementRepositoryError';
  }
}

export const readPlacementCatalog = async (
  client: SupabaseClient,
): Promise<PlacementCatalogResponse> => {
  const { data, error } = await client
    .from('placement_question_sets')
    .select(
      'placement_question_set_id, language_code, objective_key, placement_version, title_vietnamese, placement_questions!inner(placement_question_id, question_key, sequence, question_type, prompt_payload)',
    )
    .eq('status', 'published')
    .eq('placement_questions.status', 'published')
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) throw new PlacementRepositoryError();

  const rows = z.array(placementSetRowSchema).parse(data ?? []);
  return placementCatalogResponseSchema.parse({
    questionSets: rows.map((row) => ({
      languageCode: row.language_code,
      objectiveKey: row.objective_key,
      placementQuestionSetId: row.placement_question_set_id,
      placementVersion: row.placement_version,
      questions: row.placement_questions
        .sort((left, right) => left.sequence - right.sequence)
        .map((question) => ({
          placementQuestionId: question.placement_question_id,
          promptPayload: question.prompt_payload,
          questionKey: question.question_key,
          questionType: question.question_type,
          sequence: question.sequence,
        })),
      titleVietnamese: row.title_vietnamese,
    })),
  });
};

const placementSessionReadRowSchema = z
  .object({
    completed_at: z.union([z.date(), z.string()]).nullable(),
    confidence: z.number().nullable(),
    placement_session_id: z.uuid(),
    recommended_level_code: z.string().nullable(),
    scored_at: z.union([z.date(), z.string()]).nullable(),
    session_status: z.string(),
    submitted_at: z.union([z.date(), z.string()]).nullable(),
  })
  .strict();

export const readPlacementSession = async (
  client: SupabaseClient,
  placementSessionId: string,
): Promise<PlacementSessionReceipt> => {
  const { data, error } = await client
    .from('placement_sessions')
    .select(
      'placement_session_id, session_status, recommended_level_code, confidence, submitted_at, scored_at, completed_at',
    )
    .eq('placement_session_id', placementSessionId)
    .maybeSingle();
  if (error) throw new PlacementRepositoryError();
  if (!data) {
    throw new ApiHttpError({
      code: 'NOT_FOUND',
      message: 'Không tìm thấy phiên placement.',
      status: 404,
    });
  }
  const row = placementSessionReadRowSchema.parse(data);
  return placementSessionReceiptSchema.parse({
    completedAt: row.completed_at === null ? null : timestamp.parse(row.completed_at),
    confidence: row.confidence,
    placementSessionId: row.placement_session_id,
    recommendedLevelCode: row.recommended_level_code,
    scoredAt: row.scored_at === null ? null : timestamp.parse(row.scored_at),
    sessionStatus: row.session_status,
    submittedAt: row.submitted_at === null ? null : timestamp.parse(row.submitted_at),
  });
};

interface PlacementStartRow extends QueryResultRow {
  idempotent_replay: unknown;
  placement_session_id: unknown;
  session_status: unknown;
}

interface PlacementAnswerRow extends QueryResultRow {
  idempotent_replay: unknown;
  placement_answer_id: unknown;
}

interface PlacementSessionRow extends QueryResultRow {
  completed_at: unknown;
  confidence: unknown;
  placement_session_id: unknown;
  recommended_level_code: unknown;
  scored_at: unknown;
  session_status: unknown;
  submitted_at: unknown;
}

const timestamp = z
  .union([z.date(), z.string()])
  .transform((value) =>
    value instanceof Date ? value.toISOString() : new Date(value).toISOString(),
  );

const mapPlacementError = (error: unknown): never => {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  const message =
    error && typeof error === 'object' && 'message' in error ? error.message : undefined;
  if (code === '42501') {
    throw new ApiHttpError({
      code: 'FORBIDDEN',
      message: 'Bạn chưa thể thực hiện placement trong tài khoản này.',
      status: 403,
    });
  }
  if (code === 'P0002') {
    throw new ApiHttpError({
      code: 'NOT_FOUND',
      message: 'Bài placement không còn khả dụng.',
      status: 404,
    });
  }
  if (code === '22023' || code === '23514') {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Thao tác placement không hợp lệ hoặc đã xung đột.',
      status: 409,
    });
  }
  if (
    message === 'Placement session input is invalid.' ||
    message === 'Placement answer input is invalid.'
  ) {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Dữ liệu placement không hợp lệ.',
      status: 400,
    });
  }
  throw error;
};

export type PlacementExecutor = <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>;

export const startPlacementSession = async (
  input: PlacementSessionStartInput & { userId: string },
  execute: PlacementExecutor = withLearningExecutorTransaction,
): Promise<PlacementSessionStartReceipt> => {
  try {
    const result = await execute(async (client) => {
      const rows = await client.query<PlacementStartRow>(
        'select * from private.start_placement_session($1::uuid, $2::uuid, $3::uuid)',
        [input.userId, input.placementQuestionSetId, input.idempotencyKey],
      );
      if (rows.rowCount !== 1 || !rows.rows[0])
        throw new Error('Placement start did not return one receipt.');
      const row = rows.rows[0];
      return placementSessionStartReceiptSchema.parse({
        idempotentReplay: row.idempotent_replay,
        placementSessionId: row.placement_session_id,
        sessionStatus: row.session_status,
      });
    });
    return result;
  } catch (error) {
    return mapPlacementError(error);
  }
};

export const recordPlacementAnswer = async (
  input: PlacementAnswerInput & {
    placementSessionId: string;
    userId: string;
    payloadHash?: string;
  },
  execute: PlacementExecutor = withLearningExecutorTransaction,
): Promise<PlacementAnswerReceipt> => {
  try {
    const payloadHash =
      input.payloadHash ??
      createHash('sha256')
        .update(
          JSON.stringify({
            answerPayload: input.answerPayload,
            attemptNumber: input.attemptNumber,
            clientRecordedAt: input.clientRecordedAt,
            deviceId: input.deviceId,
            deviceSequence: input.deviceSequence,
            idempotencyKey: input.idempotencyKey,
            placementQuestionId: input.placementQuestionId,
            responseTimeMs: input.responseTimeMs,
          }),
        )
        .digest('hex');
    return await execute(async (client) => {
      const rows = await client.query<PlacementAnswerRow>(
        'select * from private.record_placement_answer($1::uuid, $2::uuid, $3::uuid, $4::integer, $5::uuid, $6::uuid, $7::bigint, $8::text, $9::jsonb, $10::integer, $11::timestamptz)',
        [
          input.userId,
          input.placementSessionId,
          input.placementQuestionId,
          input.attemptNumber,
          input.idempotencyKey,
          input.deviceId,
          input.deviceSequence,
          payloadHash,
          input.answerPayload,
          input.responseTimeMs,
          input.clientRecordedAt,
        ],
      );
      if (rows.rowCount !== 1 || !rows.rows[0])
        throw new Error('Placement answer did not return one receipt.');
      return placementAnswerReceiptSchema.parse({
        idempotentReplay: rows.rows[0].idempotent_replay,
        placementAnswerId: rows.rows[0].placement_answer_id,
      });
    });
  } catch (error) {
    return mapPlacementError(error);
  }
};

export const submitPlacementSession = async (
  input: { placementSessionId: string; userId: string },
  execute: PlacementExecutor = withLearningExecutorTransaction,
): Promise<PlacementSessionReceipt> => {
  try {
    return await execute(async (client) => {
      const rows = await client.query<PlacementSessionRow>(
        'select placement_session_id, session_status, recommended_level_code, confidence, submitted_at, scored_at, completed_at from private.submit_placement_session($1::uuid, $2::uuid)',
        [input.userId, input.placementSessionId],
      );
      if (rows.rowCount !== 1 || !rows.rows[0])
        throw new Error('Placement submit did not return one receipt.');
      const row = rows.rows[0];
      return placementSessionReceiptSchema.parse({
        completedAt: row.completed_at === null ? null : timestamp.parse(row.completed_at),
        confidence: row.confidence === null ? null : Number(row.confidence),
        placementSessionId: row.placement_session_id,
        recommendedLevelCode: row.recommended_level_code,
        scoredAt: row.scored_at === null ? null : timestamp.parse(row.scored_at),
        sessionStatus: row.session_status,
        submittedAt: row.submitted_at === null ? null : timestamp.parse(row.submitted_at),
      });
    });
  } catch (error) {
    return mapPlacementError(error);
  }
};
