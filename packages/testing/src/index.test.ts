import { describe, expect, it } from 'vitest';

import { createFixedDate } from './index';

describe('createFixedDate', () => {
  it('creates a deterministic date for boundary tests', () => {
    expect(createFixedDate('2026-07-29T00:00:00.000Z').toISOString()).toBe(
      '2026-07-29T00:00:00.000Z',
    );
  });

  it('rejects invalid date input instead of returning an invalid Date', () => {
    expect(() => createFixedDate('not-a-date')).toThrow(TypeError);
  });
});
