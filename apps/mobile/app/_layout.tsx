import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useMobileTheme } from '../src/components/use-mobile-theme';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const { isDark, theme } = useMobileTheme();
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
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="lessons/[lessonId]"
            options={{ gestureEnabled: true, presentation: 'card' }}
          />
          <Stack.Screen
            name="review/session"
            options={{ gestureEnabled: true, presentation: 'card' }}
          />
          <Stack.Screen name="sign-in" options={{ animation: 'fade', presentation: 'card' }} />
          <Stack.Screen
            name="auth/callback"
            options={{ animation: 'fade', presentation: 'card' }}
          />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
