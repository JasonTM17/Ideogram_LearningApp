import { describe, expect, it } from 'vitest';

import {
  ActivityOperationIdentityError as SharedActivityOperationIdentityError,
  ActivityOperationIdentityStore as SharedActivityOperationIdentityStore,
  activityOperationIdentityStorageKey as sharedActivityOperationIdentityStorageKey,
} from '@ideogram/api-client';

import {
  ActivityOperationIdentityError,
  ActivityOperationIdentityStore,
  activityOperationIdentityStorageKey,
} from './activity-operation-identity';

describe('mobile activity operation identity compatibility exports', () => {
  it('keeps native adapter imports bound to the shared implementation', () => {
    expect(ActivityOperationIdentityError).toBe(SharedActivityOperationIdentityError);
    expect(ActivityOperationIdentityStore).toBe(SharedActivityOperationIdentityStore);
    expect(activityOperationIdentityStorageKey).toBe(sharedActivityOperationIdentityStorageKey);
  });
});
