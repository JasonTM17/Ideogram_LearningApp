import { tutorTurnReceiptSchema, tutorTurnRequestSchema } from '@ideogram/contracts';

import type { TutorTurnReceipt, TutorTurnRequest } from '@ideogram/contracts';

export const tutorApiRoutes = {
  turn: '/api/v1/ai/tutor/turn',
} as const;

export interface TutorTurnApiRequest {
  body: TutorTurnRequest;
  method: 'POST';
  path: typeof tutorApiRoutes.turn;
}

export const createTutorTurnApiRequest = (input: unknown): TutorTurnApiRequest => ({
  body: tutorTurnRequestSchema.parse(input),
  method: 'POST',
  path: tutorApiRoutes.turn,
});

export const parseTutorTurnApiResponse = (input: unknown): TutorTurnReceipt =>
  tutorTurnReceiptSchema.parse(input);
