import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';
import { requestNativeEmailOtp } from '../../lib/supabase';
import { AuthScreenShell } from './auth-screen-shell';

type SignInStatus = 'idle' | 'request_failed' | 'sending' | 'sent' | 'invalid_email';

const statusCopy: Record<Exclude<SignInStatus, 'idle' | 'sending'>, string> = {
  invalid_email: 'Nhập một địa chỉ email đầy đủ để nhận liên kết đăng nhập.',
  request_failed: 'Chưa thể gửi liên kết lúc này. Vui lòng thử lại sau ít phút.',
  sent: 'Nếu email hợp lệ và đã được phê duyệt, chúng tôi sẽ gửi liên kết đăng nhập.',
};

export function NativeSignInScreen() {
  const { theme } = useMobileTheme();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SignInStatus>('idle');
  const isSubmitting = status === 'sending';
  const isDisabled = isSubmitting || email.trim().length === 0;

  const submit = useCallback(async () => {
    if (isDisabled) {
      return;
    }

    setStatus('sending');
    try {
      const result = await requestNativeEmailOtp(email);
      setStatus(result.status === 'sent' ? 'sent' : result.reason);
    } catch {
      setStatus('request_failed');
    }
  }, [email, isDisabled]);

  const feedback = status === 'idle' || status === 'sending' ? null : statusCopy[status];
  const isError = status === 'invalid_email' || status === 'request_failed';

  return (
    <AuthScreenShell
      description="Nhập email để nhận liên kết đăng nhập an toàn."
      title="Học tiếng Nhật, Trung, Hàn cùng Ideogram"
    >
      <View style={styles.form}>
        <View style={styles.field}>
          <AppText variant="label">Địa chỉ email</AppText>
          <TextInput
            accessibilityHint="Dùng email đã được phê duyệt để nhận liên kết đăng nhập"
            accessibilityLabel="Địa chỉ email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={(value) => {
              setEmail(value);
              if (status !== 'idle') {
                setStatus('idle');
              }
            }}
            onSubmitEditing={() => void submit()}
            placeholder="name@example.com"
            placeholderTextColor={theme.color.textTertiary}
            returnKeyType="send"
            style={[
              styles.input,
              {
                backgroundColor: theme.color.surface,
                borderColor: isError ? theme.color.danger : theme.color.borderSubtle,
                color: theme.color.textPrimary,
              },
            ]}
            textContentType="emailAddress"
            value={email}
          />
        </View>
        <Pressable
          accessibilityHint="Gửi liên kết đăng nhập một lần tới email của bạn"
          accessibilityLabel="Gửi liên kết an toàn"
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
              Gửi liên kết an toàn
            </AppText>
          )}
        </Pressable>
        {feedback ? (
          <View
            accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
            style={[
              styles.feedback,
              {
                backgroundColor: theme.color.surfaceSubtle,
                borderColor: isError ? theme.color.danger : theme.color.actionSecondary,
              },
            ]}
          >
            <AppText tone={isError ? 'danger' : 'success'} variant="bodySm">
              {feedback}
            </AppText>
          </View>
        ) : null}
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  feedback: {
    borderRadius: nativeLayoutTokens.radius.control,
    borderWidth: 1,
    padding: nativeLayoutTokens.spacing[3],
  },
  field: {
    gap: nativeLayoutTokens.spacing[2],
  },
  form: {
    gap: nativeLayoutTokens.spacing[4],
  },
  input: {
    borderRadius: nativeLayoutTokens.radius.control,
    borderWidth: 1,
    fontSize: 16,
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[3],
    paddingVertical: nativeLayoutTokens.spacing[2],
  },
  submit: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[4],
  },
});
