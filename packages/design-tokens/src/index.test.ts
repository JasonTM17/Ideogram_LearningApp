import { describe, expect, it } from 'vitest';

import { editorialTokens } from './index';

describe('editorialTokens', () => {
  it('keeps the visual scale monotonic for predictable layouts', () => {
    expect(editorialTokens.space[2]).toBeGreaterThan(editorialTokens.space[1]);
    expect(editorialTokens.space[8]).toBeGreaterThan(editorialTokens.space[6]);
  });
});
