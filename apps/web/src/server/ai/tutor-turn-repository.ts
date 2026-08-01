import { createHash } from 'node:crypto';

import {
  serializeTutorTurnForIdempotency,
  tutorTurnReceiptSchema,
  tutorTurnRequestSchema,
  type TutorTurnReceipt,
  type TutorTurnRequest,
} from '@ideogram/contracts';

import { ApiHttpError } from '@/server/http/api-response';

import { withLearningExecutorTransaction } from '../learning/learning-executor-pool';
import {
  parseTutorTurnReceipt,
  tutorTurnBeginRowSchema,
  tutorTurnFailureRowSchema,
  tutorTurnCompleteRowSchema,
} from './tutor-turn-database-contracts';

import type { TutorTurnResponse, TutorTurnUsage } from '@ideogram/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

interface TutorTurnBeginDatabaseRow extends QueryResultRow {
  completion_tokens: unknown;
  conversation_id: unknown;
  estimated_cost_microusd: unknown;
  idempotent_replay: unknown;
  prompt_tokens: unknown;
  response_payload: unknown;
  state: unknown;
  total_tokens: unknown;
  turn_id: unknown;
}

interface TutorTurnFailureDatabaseRow extends QueryResultRow {
  conversation_id: unknown;
  idempotent_replay: unknown;
  state: unknown;
  turn_id: unknown;
}

export interface TutorTurnReservation {
  conversationId: string;
  idempotentReplay: boolean;
  receipt?: TutorTurnReceipt;
  state: 'pending' | 'streaming' | 'completed' | 'cancelled' | 'failed';
  turnId: string;
}

export interface BeginTutorTurnOptions {
  consentPolicyKey: string;
  request: TutorTurnRequest;
  userId: string;
}

export interface CompleteTutorTurnOptions {
  configurationVersion: string;
  conversationId: string;
  estimatedCostMicrousd: number;
  providerModel: string;
  request: TutorTurnRequest;
  response: TutorTurnResponse;
  usage: TutorTurnUsage;
  userId: string;
}

export interface FailTutorTurnOptions {
  conversationId: string;
  errorCode: string;
  request: TutorTurnRequest;
  userId: string;
}

export type TutorTurnExecutor = <Result>(
  operation: (client: PoolClient) => Promise<Result>,
) => Promise<Result>;

const beginTutorTurnSql = `
  select
    completion_tokens,
    conversation_id,
    estimated_cost_microusd,
    idempotent_replay,
    prompt_tokens,
    response_payload,
    state,
    total_tokens,
    turn_id
  from private.begin_ai_tutor_turn(
    $1::uuid, $2::uuid, $3::uuid, $4::text, $5::jsonb,
    $6::text, $7::text, $8::text, $9::text, $10::text, $11::text
  )
`;

const completeTutorTurnSql = `
  select
    completion_tokens,
    conversation_id,
    estimated_cost_microusd,
    idempotent_replay,
    prompt_tokens,
    response_payload,
    state,
    total_tokens,
    turn_id
  from private.complete_ai_tutor_turn(
    $1::uuid, $2::uuid, $3::uuid, $4::text, $5::jsonb,
    $6::bigint, $7::bigint, $8::bigint, $9::bigint,
    $10::text, $11::text
  )
`;

const failTutorTurnSql = `
  select conversation_id, idempotent_replay, state, turn_id
  from private.fail_ai_tutor_turn($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text)
`;

const hashTutorTurnRequest = (request: TutorTurnRequest): string =>
  createHash('sha256').update(serializeTutorTurnForIdempotency(request)).digest('hex');

const parseOneRow = <Row extends QueryResultRow>(rows: Row[], rowCount: number | null): Row => {
  if (rowCount !== 1 || rows.length !== 1) {
    throw new Error('Tutor turn transition did not return exactly one row.');
  }

  const [row] = rows;
  if (row === undefined) {
    throw new Error('Tutor turn transition did not return a row.');
  }

  return row;
};

const toReservation = (
  row: ReturnType<typeof tutorTurnBeginRowSchema.parse>,
): TutorTurnReservation => {
  const reservation: TutorTurnReservation = {
    conversationId: row.conversation_id,
    idempotentReplay: row.idempotent_replay,
    state: row.state,
    turnId: row.turn_id,
  };

  if (row.state === 'completed') {
    reservation.receipt = parseTutorTurnReceipt(row);
  }

  return reservation;
};

const mapTutorTurnDatabaseError = (error: unknown): never => {
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined;
  const message =
    error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : undefined;

  if (code === '42501') {
    throw new ApiHttpError({
      code: 'FORBIDDEN',
      message: 'Bạn chưa được phép sử dụng gia sư AI.',
      status: 403,
    });
  }
  if (code === 'P0001') {
    throw new ApiHttpError({
      code: 'RATE_LIMITED',
      headers: { 'Retry-After': '30' },
      message: 'Gia sư AI đang bận hoặc đã đạt giới hạn lượt. Vui lòng thử lại sau.',
      status: 429,
    });
  }
  if (code === 'P0002') {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Ngôn ngữ hoặc nội dung gia sư chưa khả dụng.',
      status: 409,
    });
  }
  if (code === '22023') {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: message?.includes('input is invalid')
        ? 'Dữ liệu lượt gia sư không hợp lệ.'
        : 'Lượt gia sư xung đột với một yêu cầu trước đó.',
      status: message?.includes('input is invalid') ? 400 : 409,
    });
  }

  throw error;
};

export const beginTutorTurn = async (
  { consentPolicyKey, request, userId }: BeginTutorTurnOptions,
  execute: TutorTurnExecutor = withLearningExecutorTransaction,
): Promise<TutorTurnReservation> => {
  const parsedRequest = tutorTurnRequestSchema.parse(request);
  const payloadHash = hashTutorTurnRequest(parsedRequest);

  try {
    return await execute(async (client) => {
      const result = await client.query<TutorTurnBeginDatabaseRow>(beginTutorTurnSql, [
        userId,
        parsedRequest.conversationId,
        parsedRequest.turnId,
        payloadHash,
        serializeTutorTurnForIdempotency(parsedRequest),
        parsedRequest.learnerPreference.preferredLanguageCode,
        parsedRequest.targetLevelCode,
        parsedRequest.learnerPreference.preferredObjectiveKey,
        parsedRequest.learnerPreference.explanationDepth,
        parsedRequest.learnerPreference.tone,
        consentPolicyKey,
      ]);

      const row = tutorTurnBeginRowSchema.parse(parseOneRow(result.rows, result.rowCount));
      return toReservation(row);
    });
  } catch (error) {
    return mapTutorTurnDatabaseError(error);
  }
};

export const completeTutorTurn = async (
  {
    configurationVersion,
    conversationId,
    estimatedCostMicrousd,
    providerModel,
    request,
    response,
    usage,
    userId,
  }: CompleteTutorTurnOptions,
  execute: TutorTurnExecutor = withLearningExecutorTransaction,
): Promise<TutorTurnReceipt> => {
  const parsedRequest = tutorTurnRequestSchema.parse(request);
  const payloadHash = hashTutorTurnRequest(parsedRequest);

  try {
    return await execute(async (client) => {
      const result = await client.query<TutorTurnBeginDatabaseRow>(completeTutorTurnSql, [
        userId,
        conversationId,
        parsedRequest.turnId,
        payloadHash,
        JSON.stringify(response),
        usage.promptTokens,
        usage.completionTokens,
        usage.totalTokens,
        estimatedCostMicrousd,
        providerModel,
        configurationVersion,
      ]);
      const row = tutorTurnCompleteRowSchema.parse(parseOneRow(result.rows, result.rowCount));
      return tutorTurnReceiptSchema.parse(parseTutorTurnReceipt(row));
    });
  } catch (error) {
    return mapTutorTurnDatabaseError(error);
  }
};

export const failTutorTurn = async (
  { conversationId, errorCode, request, userId }: FailTutorTurnOptions,
  execute: TutorTurnExecutor = withLearningExecutorTransaction,
): Promise<void> => {
  const parsedRequest = tutorTurnRequestSchema.parse(request);
  const payloadHash = hashTutorTurnRequest(parsedRequest);

  try {
    await execute(async (client) => {
      const result = await client.query<TutorTurnFailureDatabaseRow>(failTutorTurnSql, [
        userId,
        conversationId,
        parsedRequest.turnId,
        payloadHash,
        errorCode,
      ]);
      const row = tutorTurnFailureRowSchema.parse(parseOneRow(result.rows, result.rowCount));
      return row;
    });
  } catch (error) {
    mapTutorTurnDatabaseError(error);
  }
};
