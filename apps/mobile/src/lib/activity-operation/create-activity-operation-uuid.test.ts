import { describe, expect, it } from 'vitest';

import { ActivityOperationIdentityError } from '@ideogram/api-client';

import { createActivityOperationUuid } from './create-activity-operation-uuid';

describe('createActivityOperationUuid', () => {
  it('normalizes a platform UUID capability failure', () => {
    const error = (() => {
      try {
        createActivityOperationUuid(() => {
          throw new Error('random source unavailable');
        });
      } catch (caught) {
        return caught;
      }
      throw new Error('Expected native UUID creation to fail.');
    })();

    expect(error).toBeInstanceOf(ActivityOperationIdentityError);
    expect(error).toMatchObject({ code: 'device_id_failure' });
  });

  it('rejects an invalid UUID before a device sequence can be reserved', () => {
    expect(() => createActivityOperationUuid(() => 'invalid-uuid')).toThrow(
      ActivityOperationIdentityError,
    );
  });
});
