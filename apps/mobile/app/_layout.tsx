import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useMobileTheme } from '../src/components/use-mobile-theme';
import { getNativeAuthRoutePolicy } from '../src/features/auth/native-auth-route-policy';
import {
  NativeAuthSessionProvider,
  useNativeAuthSession,
} from '../src/features/auth/native-auth-session-provider';

export const unstable_settings = {
  initialRouteName: 'auth/initializing',
};

export default function RootLayout() {
  const { isDark, theme } = useMobileTheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={createNavigationTheme(isDark, theme)}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NativeAuthSessionProvider>
          <RootNavigator canvasColor={theme.color.canvas} />
        </NativeAuthSessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const RootNavigator = ({ canvasColor }: { canvasColor: string }) => {
  const authSession = useNativeAuthSession();
  const routePolicy = getNativeAuthRoutePolicy({
    ...authSession,
    isWeb: Platform.OS === 'web',
  });

  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: canvasColor },
        headerShown: false,
      }}
    >
      <Stack.Protected guard={routePolicy.canAccessInitializing}>
        <Stack.Screen name="auth/initializing" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={routePolicy.canAccessAuthentication}>
        <Stack.Screen name="sign-in" options={{ animation: 'fade', presentation: 'card' }} />
      </Stack.Protected>
      <Stack.Protected guard={routePolicy.canAccessLearner}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="lessons/[lessonId]"
          options={{ gestureEnabled: true, presentation: 'card' }}
        />
        <Stack.Screen
          name="review/session"
          options={{ gestureEnabled: true, presentation: 'card' }}
        />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" options={{ animation: 'fade', presentation: 'card' }} />
    </Stack>
  );
};

const createNavigationTheme = (
  isDark: boolean,
  theme: ReturnType<typeof useMobileTheme>['theme'],
) => {
  const baseTheme = isDark ? DarkTheme : DefaultTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: theme.color.canvas,
      border: theme.color.borderSubtle,
      card: theme.color.surface,
      notification: theme.color.warning,
      primary: theme.color.actionPrimary,
      text: theme.color.textPrimary,
    },
  };
};
