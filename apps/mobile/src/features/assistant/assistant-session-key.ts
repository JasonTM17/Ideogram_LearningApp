export const getAssistantSessionKey = (hasSession: boolean, sessionEpoch: number | null): string =>
  hasSession && sessionEpoch !== null ? `learner-${sessionEpoch}` : 'anonymous-learner';
