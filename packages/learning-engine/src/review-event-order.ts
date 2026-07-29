export interface CanonicalReviewEventOrderInput {
  actorUserId: string;
  deviceId: string;
  deviceSequence: number;
  itemId: string;
  operationId: string;
  serverReceiptSequence: number;
}

const compareText = (left: string, right: string): number => left.localeCompare(right, 'en');

/**
 * Produces one deterministic order independent of client arrival time. Server
 * receipt sequence wins before device sequence; the opaque operation ID is a
 * final stable tie-breaker.
 */
export const compareCanonicalReviewEventOrder = (
  left: CanonicalReviewEventOrderInput,
  right: CanonicalReviewEventOrderInput,
): number => {
  if (left.actorUserId !== right.actorUserId) {
    return compareText(left.actorUserId, right.actorUserId);
  }

  if (left.itemId !== right.itemId) {
    return compareText(left.itemId, right.itemId);
  }

  if (left.serverReceiptSequence !== right.serverReceiptSequence) {
    return left.serverReceiptSequence - right.serverReceiptSequence;
  }

  if (left.deviceId !== right.deviceId) {
    return compareText(left.deviceId, right.deviceId);
  }

  if (left.deviceSequence !== right.deviceSequence) {
    return left.deviceSequence - right.deviceSequence;
  }

  return compareText(left.operationId, right.operationId);
};
