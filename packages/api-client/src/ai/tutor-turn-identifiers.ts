export interface TutorTurnIdentifierState {
  conversationId: string | null;
  turnId: string | null;
}

export interface TutorTurnIdentifiers {
  conversationId: string;
  turnId: string;
}

/**
 * Preserves a pending turn identity across an uncertain retry. A caller clears
 * `turnId` only after a confirmed receipt, a cancellation, or changed input.
 */
export const resolveTutorTurnIdentifiers = (
  createUuid: () => string,
  current: TutorTurnIdentifierState,
): TutorTurnIdentifiers => ({
  conversationId: current.conversationId ?? createUuid(),
  turnId: current.turnId ?? createUuid(),
});
