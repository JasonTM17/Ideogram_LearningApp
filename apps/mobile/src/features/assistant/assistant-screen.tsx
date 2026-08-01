import { createTutorTurnApiRequest } from '@ideogram/api-client';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { nativeLayoutTokens } from '@ideogram/design-tokens/native';

import { AppText } from '../../components/app-text';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { StatusPanel } from '../../components/status-panel';
import { useMobileTheme } from '../../components/use-mobile-theme';
import { createSessionBoundRequestSignal } from '../../lib/api/session-bound-request-signal';
import { createMobileNativeLearningApiClient } from '../../lib/api/native-learning-api-client';
import { useNativeAuthSession } from '../auth/native-auth-session-provider';
import {
  defaultTutorPreferences,
  describeAssistantError,
  isExpectedAssistantCancellation,
  type AssistantState,
  type TutorPreferenceState,
} from './assistant-state';
import { assistantContent } from './assistant-content';
import { TutorPreferenceDraftPanel } from './tutor-preference-draft-panel';
import { TutorResponseCard } from './tutor-response-card';

export function AssistantScreen() {
  const { theme } = useMobileTheme();
  const { getRequestSignal, hasSession, isHydrating, sessionProvider } = useNativeAuthSession();
  const [conversationId] = useState(() => Crypto.randomUUID());
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

  const submit = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (state.kind === 'submitting' || trimmedMessage.length === 0 || !hasSession) {
      if (trimmedMessage.length === 0 && mounted.current) {
        setState({ kind: 'error', message: 'Viết một câu hỏi trước khi gửi cho Trợ lý.' });
      }
      return;
    }

    const turnId = Crypto.randomUUID();
    const { targetLevelCode, ...learnerPreference } = preferences;
    let tutorRequest: ReturnType<typeof createTutorTurnApiRequest>;

    try {
      tutorRequest = createTutorTurnApiRequest({
        conversationId,
        learnerPreference,
        message: trimmedMessage,
        targetLevelCode,
        turnId,
      });
    } catch {
      setState({ kind: 'error', message: 'Hãy kiểm tra câu hỏi, ngôn ngữ và trình độ đã chọn.' });
      return;
    }

    const request = createSessionBoundRequestSignal(getRequestSignal());
    activeRequest.current = request;
    setState({ kind: 'submitting' });

    try {
      const client = createMobileNativeLearningApiClient(sessionProvider);
      const receipt = await client.submitTutorTurn(tutorRequest.body, { signal: request.signal });
      if (mounted.current && !request.signal.aborted) {
        setState({
          idempotentReplay: receipt.idempotentReplay,
          kind: 'ready',
          response: receipt.response,
        });
      }
    } catch (error: unknown) {
      if (!mounted.current) {
        return;
      }

      if (request.signal.aborted || isExpectedAssistantCancellation(error)) {
        setState({ kind: 'idle' });
        return;
      }

      setState({ kind: 'error', message: describeAssistantError(error) });
    } finally {
      request.dispose();
      if (activeRequest.current === request) {
        activeRequest.current = null;
      }
    }
  }, [
    conversationId,
    getRequestSignal,
    hasSession,
    message,
    preferences,
    sessionProvider,
    state.kind,
  ]);

  const isSubmitting = state.kind === 'submitting';
  const isDisabled = isSubmitting || isHydrating || !hasSession || message.trim().length === 0;

  return (
    <ScreenScaffold
      description={assistantContent.description}
      eyebrow={assistantContent.eyebrow}
      title={assistantContent.title}
    >
      {isHydrating ? (
        <StatusPanel
          description="Đang xác minh phiên học an toàn trước khi mở trợ lý."
          title="Đang chuẩn bị Trợ lý"
          variant="loading"
        />
      ) : null}
      {!isHydrating && !hasSession ? (
        <StatusPanel
          description="Hãy đăng nhập để gửi câu hỏi và nhận câu trả lời riêng cho tiến độ của bạn."
          title="Cần đăng nhập"
          variant="error"
        />
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.form}
      >
        <TutorPreferenceDraftPanel
          disabled={isSubmitting}
          onChange={setPreferences}
          preferences={preferences}
        />
        <View
          style={[
            styles.composer,
            { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
          ]}
        >
          <View style={styles.composerHeading}>
            <AppText variant="headingMd">Bạn muốn hỏi gì?</AppText>
            <AppText tone="secondary" variant="bodySm">
              Không gửi bí mật hoặc thông tin nhận diện. Câu hỏi tối đa 2.000 ký tự.
            </AppText>
          </View>
          <TextInput
            accessibilityHint="Nhập câu hỏi ngôn ngữ bằng tiếng Việt"
            accessibilityLabel="Câu hỏi cho Trợ lý"
            editable={!isSubmitting}
            maxLength={2000}
            multiline
            onChangeText={(value) => {
              setMessage(value);
              if (state.kind === 'error') {
                setState({ kind: 'idle' });
              }
            }}
            placeholder="Ví dụ: Vì sao dùng は thay vì が?"
            placeholderTextColor={theme.color.textTertiary}
            style={[
              styles.input,
              {
                backgroundColor: theme.color.surfaceSubtle,
                borderColor: theme.color.borderSubtle,
                color: theme.color.textPrimary,
              },
            ]}
            textAlignVertical="top"
            value={message}
          />
          <Pressable
            accessibilityHint="Gửi câu hỏi đã chọn cấu hình"
            accessibilityLabel="Gửi câu hỏi cho Trợ lý"
            accessibilityRole="button"
            accessibilityState={{ busy: isSubmitting, disabled: isDisabled }}
            disabled={isDisabled}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.submit,
              {
                backgroundColor: theme.color.actionPrimary,
                opacity: isDisabled ? 0.48 : pressed ? 0.78 : 1,
              },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.color.onActionPrimary} />
            ) : (
              <AppText style={{ color: theme.color.onActionPrimary }} variant="label">
                Gửi câu hỏi
              </AppText>
            )}
          </Pressable>
          <AppText tone="tertiary" variant="caption">
            AI có thể sai. Ranh giới nguồn luôn được hiển thị trong câu trả lời.
          </AppText>
        </View>
      </KeyboardAvoidingView>
      {state.kind === 'error' ? (
        <StatusPanel
          actionHint="Gửi lại câu hỏi hiện tại"
          actionLabel="Thử lại"
          description={state.message}
          onAction={() => void submit()}
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

const styles = StyleSheet.create({
  composer: {
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[4],
    padding: nativeLayoutTokens.spacing[4],
  },
  composerHeading: { gap: nativeLayoutTokens.spacing[1] },
  form: { gap: nativeLayoutTokens.spacing[6] },
  input: {
    borderRadius: nativeLayoutTokens.radius.control,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 128,
    paddingHorizontal: nativeLayoutTokens.spacing[3],
    paddingVertical: nativeLayoutTokens.spacing[3],
  },
  submit: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[4],
  },
});
