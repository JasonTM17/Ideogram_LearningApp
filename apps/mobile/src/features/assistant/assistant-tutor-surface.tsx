import { createTutorTurnApiRequest, resolveTutorTurnIdentifiers } from '@ideogram/api-client';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';

import { nativeLayoutTokens } from '@ideogram/design-tokens/native';

import { ScreenScaffold } from '../../components/screen-scaffold';
import { StatusPanel } from '../../components/status-panel';
import { createSessionBoundRequestSignal } from '../../lib/api/session-bound-request-signal';
import { createMobileNativeLearningApiClient } from '../../lib/api/native-learning-api-client';
import {
  defaultTutorPreferences,
  describeAssistantError,
  getAssistantErrorCode,
  isExpectedAssistantCancellation,
  type AssistantState,
  type TutorPreferenceState,
} from './assistant-state';
import { assistantContent } from './assistant-content';
import { AssistantTutorComposer } from './assistant-tutor-composer';
import { AssistantTutorSessionGate } from './assistant-tutor-session-gate';
import { TutorPreferenceDraftPanel } from './tutor-preference-draft-panel';
import { TutorResponseCard } from './tutor-response-card';

import type { NativeAuthSessionState } from '../auth/use-native-auth-session';

interface AssistantTutorSurfaceProps {
  auth: NativeAuthSessionState;
}

export function AssistantTutorSurface({ auth }: AssistantTutorSurfaceProps) {
  const router = useRouter();
  const { getRequestSignal, hasSession, isHydrating, sessionProvider } = auth;
  const conversationId = useRef<string | null>(null);
  const pendingTurnId = useRef<string | null>(null);
  const [message, setMessage] = useState('');
  const [preferences, setPreferences] = useState<TutorPreferenceState>(defaultTutorPreferences);
  const [state, setState] = useState<AssistantState>({ kind: 'idle' });
  const activeRequest = useRef<ReturnType<typeof createSessionBoundRequestSignal> | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
      activeRequest.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (state.kind === 'ready') {
      void AccessibilityInfo.announceForAccessibility('Trợ lý đã trả lời.');
    }
  }, [state.kind]);

  const submit = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (state.kind === 'submitting' || trimmedMessage.length === 0 || !hasSession) {
      if (trimmedMessage.length === 0 && mounted.current) {
        setState({ kind: 'error', message: 'Viết một câu hỏi trước khi gửi cho Trợ lý.' });
      }
      return;
    }

    const identifiers = resolveTutorTurnIdentifiers(Crypto.randomUUID, {
      conversationId: conversationId.current,
      turnId: pendingTurnId.current,
    });
    conversationId.current = identifiers.conversationId;
    pendingTurnId.current = identifiers.turnId;
    const { targetLevelCode, ...learnerPreference } = preferences;
    let tutorRequest: ReturnType<typeof createTutorTurnApiRequest>;

    try {
      tutorRequest = createTutorTurnApiRequest({
        conversationId: identifiers.conversationId,
        learnerPreference,
        message: trimmedMessage,
        targetLevelCode,
        turnId: identifiers.turnId,
      });
    } catch {
      setState({ kind: 'error', message: 'Hãy kiểm tra câu hỏi, ngôn ngữ và trình độ đã chọn.' });
      return;
    }

    const request = createSessionBoundRequestSignal(getRequestSignal());
    Keyboard.dismiss();
    activeRequest.current = request;
    setState({ kind: 'submitting' });

    try {
      const client = createMobileNativeLearningApiClient(sessionProvider);
      const receipt = await client.submitTutorTurn(tutorRequest.body, { signal: request.signal });
      if (mounted.current && !request.signal.aborted) {
        pendingTurnId.current = null;
        setState({
          idempotentReplay: receipt.idempotentReplay,
          kind: 'ready',
          response: receipt.response,
        });
      }
    } catch (error: unknown) {
      if (!mounted.current) return;

      if (request.signal.aborted || isExpectedAssistantCancellation(error)) {
        pendingTurnId.current = null;
        setState({ kind: 'idle' });
        return;
      }

      const code = getAssistantErrorCode(error);
      const errorMessage = describeAssistantError(error);
      setState(
        code === undefined
          ? { kind: 'error', message: errorMessage }
          : { code, kind: 'error', message: errorMessage },
      );
    } finally {
      request.dispose();
      if (activeRequest.current === request) {
        activeRequest.current = null;
      }
    }
  }, [getRequestSignal, hasSession, message, preferences, sessionProvider, state.kind]);

  const clearForChangedDraft = () => {
    pendingTurnId.current = null;
    if (state.kind !== 'idle') setState({ kind: 'idle' });
  };

  if (isHydrating || !hasSession) {
    return (
      <AssistantTutorSessionGate
        hasSession={hasSession}
        isHydrating={isHydrating}
        onSignIn={() => router.replace('../../sign-in')}
      />
    );
  }

  const isSubmitting = state.kind === 'submitting';
  const isDisabled = isSubmitting || message.trim().length === 0;
  const errorActionIsSignIn = state.kind === 'error' && state.code === 'UNAUTHORIZED';

  return (
    <ScreenScaffold
      description={assistantContent.description}
      eyebrow={assistantContent.eyebrow}
      title={assistantContent.title}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ gap: nativeLayoutTokens.spacing[6] }}
      >
        <AssistantTutorComposer
          isSubmitting={isSubmitting}
          message={message}
          onChangeMessage={(value) => {
            setMessage(value);
            clearForChangedDraft();
          }}
          onSubmit={() => void submit()}
          submitDisabled={isDisabled}
        />
        <TutorPreferenceDraftPanel
          disabled={isSubmitting}
          onChange={(next) => {
            setPreferences(next);
            clearForChangedDraft();
          }}
          preferences={preferences}
        />
      </KeyboardAvoidingView>
      {state.kind === 'error' ? (
        <StatusPanel
          actionHint={
            errorActionIsSignIn ? 'Mở màn hình đăng nhập lại' : 'Gửi lại câu hỏi hiện tại'
          }
          actionLabel={errorActionIsSignIn ? 'Đăng nhập lại' : 'Thử lại'}
          description={state.message}
          onAction={
            errorActionIsSignIn ? () => router.replace('../../sign-in') : () => void submit()
          }
          title="Chưa thể hoàn tất"
          variant="error"
        />
      ) : null}
      {state.kind === 'ready' ? (
        <TutorResponseCard idempotentReplay={state.idempotentReplay} response={state.response} />
      ) : null}
    </ScreenScaffold>
  );
}
