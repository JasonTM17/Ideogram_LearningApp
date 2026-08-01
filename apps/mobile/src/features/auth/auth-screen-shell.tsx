import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';

interface AuthScreenShellProps {
  children: ReactNode;
  description: string;
  title: string;
}

export function AuthScreenShell({ children, description, title }: AuthScreenShellProps) {
  const { theme } = useMobileTheme();

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: theme.color.canvas }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View accessibilityRole="header" style={styles.hero}>
          <View
            importantForAccessibility="no-hide-descendants"
            style={[styles.mark, { backgroundColor: theme.color.actionPrimary }]}
          >
            <Ionicons color={theme.color.onActionPrimary} name="book-outline" size={26} />
          </View>
          <AppText style={styles.title} variant="display">
            {title}
          </AppText>
          <AppText style={styles.description} tone="secondary">
            {description}
          </AppText>
        </View>
        {children}
        <View
          accessibilityLabel="Hỗ trợ tiếng Nhật, tiếng Trung và tiếng Hàn"
          style={styles.languages}
        >
          <AppText
            style={[styles.language, { borderColor: theme.color.borderSubtle }]}
            tone="tertiary"
            variant="caption"
          >
            日
          </AppText>
          <AppText
            style={[styles.language, { borderColor: theme.color.borderSubtle }]}
            tone="tertiary"
            variant="caption"
          >
            汉
          </AppText>
          <AppText
            style={[styles.language, { borderColor: theme.color.borderSubtle }]}
            tone="tertiary"
            variant="caption"
          >
            한
          </AppText>
        </View>
        <AppText style={styles.privacy} tone="tertiary" variant="caption">
          Thông tin của bạn được bảo mật theo chính sách quyền riêng tư.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    gap: nativeLayoutTokens.spacing[6],
    justifyContent: 'center',
    maxWidth: 480,
    paddingHorizontal: nativeLayoutTokens.spacing[4],
    paddingVertical: nativeLayoutTokens.spacing[8],
    width: '100%',
  },
  description: {
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: nativeLayoutTokens.spacing[3],
  },
  language: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: nativeLayoutTokens.radius.control,
    paddingHorizontal: nativeLayoutTokens.spacing[2],
    paddingVertical: nativeLayoutTokens.spacing[1],
    textAlign: 'center',
  },
  languages: {
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[2],
    justifyContent: 'center',
  },
  mark: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  privacy: {
    textAlign: 'center',
  },
  safeArea: {
    flex: 1,
  },
  title: {
    textAlign: 'center',
  },
});
