export interface ExistingReviewOperation {
  itemId: string;
  operationId: string;
  payloadHash: string;
}

export type ReviewOperationIdempotencyDecision =
  { status: 'new' } | { status: 'replay' } | { status: 'conflict' };

export const decideReviewOperationIdempotency = ({
  existing,
  itemId,
  operationId,
  payloadHash,
}: {
  existing: ExistingReviewOperation | null;
  itemId: string;
  operationId: string;
  payloadHash: string;
}): ReviewOperationIdempotencyDecision => {
  if (!existing) {
    return { status: 'new' };
  }

  if (
    existing.operationId === operationId &&
    existing.itemId === itemId &&
    existing.payloadHash === payloadHash
  ) {
    return { status: 'replay' };
  }

  return { status: 'conflict' };
};
