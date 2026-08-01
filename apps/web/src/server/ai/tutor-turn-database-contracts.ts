import {
  tutorTurnReceiptSchema,
  tutorTurnResponseSchema,
  tutorTurnStateSchema,
  tutorTurnUsageSchema,
} from '@ideogram/contracts';
import { z } from 'zod';

const databaseInteger = (maximum: number) =>
  z
    .union([
      z.number().int().nonnegative().max(maximum),
      z.bigint().nonnegative().max(BigInt(maximum)),
      z.string().regex(/^\d+$/u),
    ])
    .transform((value) => {
      const integerValue = typeof value === 'bigint' ? value : BigInt(value);
      if (integerValue > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new TypeError('Database integer exceeds the JavaScript safe integer range.');
      }
      return Number(integerValue);
    });

const nullableDatabaseInteger = (maximum: number) => databaseInteger(maximum).nullable();

export const tutorTurnBeginRowSchema = z
  .object({
    completion_tokens: nullableDatabaseInteger(1_000_000),
    conversation_id: z.uuid(),
    estimated_cost_microusd: databaseInteger(10_000_000),
    idempotent_replay: z.boolean(),
    lease_token: z.uuid(),
    prompt_tokens: nullableDatabaseInteger(1_000_000),
    response_payload: z.unknown().nullable(),
    state: tutorTurnStateSchema,
    total_tokens: nullableDatabaseInteger(1_000_000),
    turn_id: z.uuid(),
  })
  .strict();

export const tutorTurnCompleteRowSchema = tutorTurnBeginRowSchema;
export const tutorTurnReplayRowSchema = tutorTurnBeginRowSchema;

export const tutorTurnFailureRowSchema = z
  .object({
    conversation_id: z.uuid(),
    idempotent_replay: z.boolean(),
    state: tutorTurnStateSchema,
    turn_id: z.uuid(),
  })
  .strict();

export type TutorTurnBeginRow = z.infer<typeof tutorTurnBeginRowSchema>;
export type TutorTurnCompleteRow = z.infer<typeof tutorTurnCompleteRowSchema>;
export type TutorTurnFailureRow = z.infer<typeof tutorTurnFailureRowSchema>;

export const parseTutorTurnUsage = (
  row: Pick<TutorTurnBeginRow, 'completion_tokens' | 'prompt_tokens' | 'total_tokens'>,
) => {
  if (row.prompt_tokens === null || row.completion_tokens === null || row.total_tokens === null) {
    return undefined;
  }

  return tutorTurnUsageSchema.parse({
    completionTokens: row.completion_tokens,
    promptTokens: row.prompt_tokens,
    totalTokens: row.total_tokens,
  });
};

export const parseTutorTurnReceipt = (
  row: TutorTurnCompleteRow,
): ReturnType<typeof tutorTurnReceiptSchema.parse> => {
  const usage = parseTutorTurnUsage(row);
  if (row.state !== 'completed' || row.response_payload === null || usage === undefined) {
    throw new Error('Completed tutor turn did not return a complete receipt.');
  }

  return tutorTurnReceiptSchema.parse({
    conversationId: row.conversation_id,
    idempotentReplay: row.idempotent_replay,
    response: tutorTurnResponseSchema.parse(row.response_payload),
    state: row.state,
    turnId: row.turn_id,
    usage,
  });
};
