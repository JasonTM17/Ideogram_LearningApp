import { z } from 'zod';

export const syncMutationKinds = [
  'activity',
  'placement-answer',
  'placement-submit',
  'review',
] as const;
export const syncMutationStatuses = ['pending', 'blocked'] as const;

export const syncNamespaceSchema = z
  .object({
    sessionEpoch: z.number().int().positive(),
    userId: z.uuid(),
  })
  .strict();

export const syncMutationSchema = z
  .object({
    createdAt: z.iso.datetime(),
    idempotencyKey: z.uuid(),
    kind: z.enum(syncMutationKinds),
    namespace: syncNamespaceSchema,
    operationId: z.uuid(),
    payload: z.record(z.string().min(1).max(80), z.unknown()),
    retryCount: z.number().int().nonnegative().max(20),
    status: z.enum(syncMutationStatuses),
  })
  .strict();

export const syncQueueSnapshotSchema = z
  .object({
    mutations: z.array(syncMutationSchema).max(50),
    namespace: syncNamespaceSchema,
  })
  .strict();

export type SyncMutation = z.infer<typeof syncMutationSchema>;
export type SyncMutationKind = (typeof syncMutationKinds)[number];
export type SyncNamespace = z.infer<typeof syncNamespaceSchema>;
export type SyncQueueSnapshot = z.infer<typeof syncQueueSnapshotSchema>;
