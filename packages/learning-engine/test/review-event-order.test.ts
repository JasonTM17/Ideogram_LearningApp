import { describe, expect, it } from 'vitest';

import { compareCanonicalReviewEventOrder } from '../src/review-event-order';

describe('canonical review event order', () => {
  it('uses the server receipt sequence before reversed device arrival order', () => {
    const events = [
      {
        actorUserId: 'learner-1',
        deviceId: 'device-b',
        deviceSequence: 2,
        itemId: 'item-1',
        operationId: 'operation-b',
        serverReceiptSequence: 2,
      },
      {
        actorUserId: 'learner-1',
        deviceId: 'device-a',
        deviceSequence: 9,
        itemId: 'item-1',
        operationId: 'operation-a',
        serverReceiptSequence: 1,
      },
    ];

    expect(
      [...events].sort(compareCanonicalReviewEventOrder).map((event) => event.operationId),
    ).toEqual(['operation-a', 'operation-b']);
  });
});
