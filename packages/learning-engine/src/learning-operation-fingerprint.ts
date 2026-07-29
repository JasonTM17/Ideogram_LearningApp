import type { ActivityAttemptInput, ReviewSubmissionInput } from '@ideogram/contracts';

import { serializeCanonicalJson } from './canonical-json';

/**
 * The Next.js API hashes these stable strings with a server-side SHA-256
 * implementation before calling the database transaction. Keeping this helper
 * platform-neutral lets web and native test the exact operation shape.
 */
export const serializeActivityAttemptForIdempotency = (input: ActivityAttemptInput): string =>
  serializeCanonicalJson({
    activityId: input.activityId,
    contentReleaseId: input.contentReleaseId,
    deviceId: input.deviceId,
    deviceSequence: input.deviceSequence,
    endpoint: 'activity-submit',
    idempotencyKey: input.idempotencyKey,
    responsePayload: input.responsePayload,
    reviewedAtClient: input.reviewedAtClient,
    timezone: input.timezone,
  });

export const serializeReviewSubmissionForIdempotency = (input: ReviewSubmissionInput): string =>
  serializeCanonicalJson({
    deviceId: input.deviceId,
    deviceSequence: input.deviceSequence,
    endpoint: 'review-submit',
    grade: input.grade,
    idempotencyKey: input.idempotencyKey,
    itemId: input.itemId,
    reviewedAtClient: input.reviewedAtClient,
    timezone: input.timezone,
  });
