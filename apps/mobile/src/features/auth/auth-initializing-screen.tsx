import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';
import { AuthScreenShell } from './auth-screen-shell';

export function AuthInitializingScreen() {
  const { theme } = useMobileTheme();

  return (
    <AuthScreenShell
      description="Đang kiểm tra phiên học được bảo vệ trên thiết bị này."
      title="Chuẩn bị không gian học của bạn"
    >
      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.panel,
          { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
        ]}
      >
        <ActivityIndicator color={theme.color.actionPrimary} />
        <AppText tone="secondary">Đang kiểm tra phiên đăng nhập…</AppText>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[4],
    padding: nativeLayoutTokens.spacing[6],
  },
});
