import { describe, expect, it } from 'vitest';

import { decideReviewOperationIdempotency } from '../src/review-idempotency';

describe('review operation idempotency', () => {
  const operation = {
    itemId: 'item-1',
    operationId: 'operation-1',
    payloadHash: 'a'.repeat(64),
  };

  it('recognizes an exact replay without creating another event', () => {
    expect(
      decideReviewOperationIdempotency({
        existing: operation,
        itemId: operation.itemId,
        operationId: operation.operationId,
        payloadHash: operation.payloadHash,
      }),
    ).toEqual({ status: 'replay' });
  });

  it('rejects an operation key reused with a different payload or item', () => {
    expect(
      decideReviewOperationIdempotency({
        existing: operation,
        itemId: operation.itemId,
        operationId: operation.operationId,
        payloadHash: 'b'.repeat(64),
      }),
    ).toEqual({ status: 'conflict' });
  });
});
