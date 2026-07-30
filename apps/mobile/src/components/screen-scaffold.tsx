import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from './app-text';
import { useMobileTheme } from './use-mobile-theme';

interface ScreenScaffoldProps {
  children: ReactNode;
  description: string;
  eyebrow: string;
  includeBottomSafeArea?: boolean;
  title: string;
}

export function ScreenScaffold({
  children,
  description,
  eyebrow,
  includeBottomSafeArea = false,
  title,
}: ScreenScaffoldProps) {
  const { theme } = useMobileTheme();

  return (
    <SafeAreaView
      edges={includeBottomSafeArea ? ['top', 'bottom'] : ['top']}
      style={[styles.safeArea, { backgroundColor: theme.color.canvas }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View accessibilityRole="header" style={styles.header}>
          <AppText style={{ color: theme.color.actionSecondary }} variant="label">
            {eyebrow.toLocaleUpperCase('vi')}
          </AppText>
          <AppText variant="display">{title}</AppText>
          <AppText tone="secondary">{description}</AppText>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    gap: nativeLayoutTokens.spacing[6],
    maxWidth: nativeLayoutTokens.navigation.contentMaxWidth,
    paddingBottom: nativeLayoutTokens.spacing[8],
    paddingHorizontal: nativeLayoutTokens.navigation.contentGutter,
    paddingTop: nativeLayoutTokens.spacing[6],
    width: '100%',
  },
  header: {
    gap: nativeLayoutTokens.spacing[2],
  },
  safeArea: {
    flex: 1,
  },
});
