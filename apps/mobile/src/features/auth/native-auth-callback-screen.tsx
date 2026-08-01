import { useURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';
import { finishNativeEmailOtp } from '../../lib/supabase';
import { AuthScreenShell } from './auth-screen-shell';

type CallbackStatus = 'error' | 'processing' | 'waiting';

export function NativeAuthCallbackScreen() {
  const { theme } = useMobileTheme();
  const router = useRouter();
  const callbackUrl = useURL();
  const handledUrl = useRef<string | null>(null);
  const [status, setStatus] = useState<CallbackStatus>(callbackUrl ? 'processing' : 'waiting');

  useEffect(() => {
    if (!callbackUrl || handledUrl.current === callbackUrl) {
      return;
    }

    handledUrl.current = callbackUrl;
    let isCurrent = true;
    setStatus('processing');
    void finishNativeEmailOtp(callbackUrl)
      .then((result) => {
        if (!isCurrent) {
          return;
        }

        if (result.status === 'complete') {
          router.replace('/');
          return;
        }

        setStatus('error');
      })
      .catch(() => {
        if (isCurrent) {
          setStatus('error');
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [callbackUrl, router]);

  const description =
    status === 'error'
      ? 'Liên kết không hợp lệ, đã hết hạn hoặc đã được dùng. Hãy yêu cầu một liên kết mới.'
      : status === 'waiting'
        ? 'Mở màn hình này từ liên kết trong email để hoàn tất đăng nhập.'
        : 'Đang xác minh liên kết an toàn của bạn…';

  return (
    <AuthScreenShell description={description} title="Xác minh đăng nhập">
      <View
        accessibilityLiveRegion={status === 'error' ? 'assertive' : 'polite'}
        style={[
          styles.panel,
          { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
        ]}
      >
        {status === 'processing' ? <ActivityIndicator color={theme.color.actionPrimary} /> : null}
        <AppText variant="headingMd">
          {status === 'processing' ? 'Đang hoàn tất phiên học' : 'Cần một liên kết mới?'}
        </AppText>
        {status !== 'processing' ? (
          <Pressable
            accessibilityHint="Mở màn hình gửi lại liên kết đăng nhập"
            accessibilityLabel="Quay về đăng nhập"
            accessibilityRole="button"
            onPress={() => router.replace('../sign-in')}
            style={({ pressed }) => [
              styles.action,
              { backgroundColor: theme.color.actionPrimary, opacity: pressed ? 0.78 : 1 },
            ]}
          >
            <AppText style={{ color: theme.color.onActionPrimary }} variant="label">
              Quay về đăng nhập
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[4],
  },
  panel: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[4],
    padding: nativeLayoutTokens.spacing[6],
  },
});
