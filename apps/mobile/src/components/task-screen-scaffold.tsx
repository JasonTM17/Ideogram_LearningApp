import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from './app-text';
import { useMobileTheme } from './use-mobile-theme';

interface TaskScreenScaffoldProps {
  backLabel: string;
  children: ReactNode;
  fallbackHref: Href;
  title: string;
}

export function TaskScreenScaffold({
  backLabel,
  children,
  fallbackHref,
  title,
}: TaskScreenScaffoldProps) {
  const router = useRouter();
  const { theme } = useMobileTheme();
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackHref);
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: theme.color.canvas }]}
    >
      <View style={[styles.appBar, { borderBottomColor: theme.color.borderSubtle }]}>
        <Pressable
          accessibilityHint={`Quay về màn hình ${backLabel}`}
          accessibilityLabel={`Quay lại ${backLabel}`}
          accessibilityRole="button"
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons color={theme.color.textPrimary} name="arrow-back" size={24} />
          <AppText variant="label">{backLabel}</AppText>
        </Pressable>
        <AppText style={styles.routeTitle} tone="secondary" variant="caption">
          {title}
        </AppText>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appBar: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[2],
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[1],
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[2],
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    gap: nativeLayoutTokens.spacing[6],
    maxWidth: nativeLayoutTokens.navigation.contentMaxWidth,
    padding: nativeLayoutTokens.navigation.contentGutter,
    width: '100%',
  },
  routeTitle: {
    flexShrink: 1,
    paddingHorizontal: nativeLayoutTokens.spacing[2],
    textAlign: 'right',
  },
  safeArea: {
    flex: 1,
  },
});
