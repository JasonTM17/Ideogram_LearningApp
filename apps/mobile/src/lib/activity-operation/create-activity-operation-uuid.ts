import { ActivityOperationIdentityError } from '@ideogram/api-client';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/**
 * Normalizes platform UUID capability failures before a device sequence is
 * reserved, so the learner receives a terminal identity error instead of a
 * retryable network error.
 */
export const createActivityOperationUuid = (createUuid: () => string): string => {
  try {
    const uuid = createUuid();
    if (!uuidPattern.test(uuid)) {
      throw new Error('Activity UUID generation returned an invalid UUID.');
    }

    return uuid;
  } catch (error) {
    throw new ActivityOperationIdentityError(
      'device_id_failure',
      'Activity UUID generation is unavailable.',
      error,
    );
  }
};
