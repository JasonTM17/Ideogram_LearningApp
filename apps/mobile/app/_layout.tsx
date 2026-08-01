import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useMobileTheme } from '../src/components/use-mobile-theme';
import { getNativeAuthRoutePolicy } from '../src/features/auth/native-auth-route-policy';
import { useNativeAuthSession } from '../src/features/auth/use-native-auth-session';

export const unstable_settings = {
  initialRouteName: 'auth/initializing',
};

export default function RootLayout() {
  const { isDark, theme } = useMobileTheme();
  const authSession = useNativeAuthSession();
  const routePolicy = getNativeAuthRoutePolicy({
    ...authSession,
    isWeb: Platform.OS === 'web',
  });
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
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

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: theme.color.canvas },
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
          <Stack.Screen
            name="auth/callback"
            options={{ animation: 'fade', presentation: 'card' }}
          />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
