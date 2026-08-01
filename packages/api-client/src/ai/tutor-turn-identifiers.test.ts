import { describe, expect, it, vi } from 'vitest';

import { resolveTutorTurnIdentifiers } from './tutor-turn-identifiers';

describe('resolveTutorTurnIdentifiers', () => {
  it('creates identifiers for a new conversation turn', () => {
    const createUuid = vi.fn().mockReturnValueOnce('conversation-1').mockReturnValueOnce('turn-1');

    expect(resolveTutorTurnIdentifiers(createUuid, { conversationId: null, turnId: null })).toEqual(
      {
        conversationId: 'conversation-1',
        turnId: 'turn-1',
      },
    );
  });

  it('preserves a pending request identity for an uncertain retry', () => {
    const createUuid = vi.fn();

    expect(
      resolveTutorTurnIdentifiers(createUuid, {
        conversationId: 'conversation-1',
        turnId: 'turn-1',
      }),
    ).toEqual({ conversationId: 'conversation-1', turnId: 'turn-1' });
    expect(createUuid).not.toHaveBeenCalled();
  });

  it('keeps a conversation while replacing a cleared completed or cancelled turn', () => {
    const createUuid = vi.fn().mockReturnValue('turn-2');

    expect(
      resolveTutorTurnIdentifiers(createUuid, { conversationId: 'conversation-1', turnId: null }),
    ).toEqual({ conversationId: 'conversation-1', turnId: 'turn-2' });
  });
});
