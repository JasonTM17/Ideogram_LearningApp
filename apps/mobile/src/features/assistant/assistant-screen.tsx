import { useNativeAuthSession } from '../auth/native-auth-session-provider';

import { getAssistantSessionKey } from './assistant-session-key';
import { AssistantTutorSurface } from './assistant-tutor-surface';

export function AssistantScreen() {
  const auth = useNativeAuthSession();
  const sessionKey = getAssistantSessionKey(auth.hasSession, auth.sessionEpoch);

  return <AssistantTutorSurface auth={auth} key={sessionKey} />;
}
