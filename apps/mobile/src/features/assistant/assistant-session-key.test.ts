import { describe, expect, it } from 'vitest';

import { getAssistantSessionKey } from './assistant-session-key';

describe('getAssistantSessionKey', () => {
  it('changes identity between authenticated accounts and clears it without a session', () => {
    expect(getAssistantSessionKey(true, 1)).toBe('learner-1');
    expect(getAssistantSessionKey(true, 2)).toBe('learner-2');
    expect(getAssistantSessionKey(false, 2)).toBe('anonymous-learner');
  });
});
