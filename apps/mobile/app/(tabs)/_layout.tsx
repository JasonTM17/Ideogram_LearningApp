import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens, nativeTypographyTokens } from '@ideogram/design-tokens/native';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useMobileTheme } from '../../src/components/use-mobile-theme';
import { tabDestinations } from '../../src/features/navigation/navigation-config';

export default function TabLayout() {
  const { theme } = useMobileTheme();
  const { fontScale } = useWindowDimensions();
  const supportedFontScale = Math.max(
    1,
    Math.min(fontScale, nativeTypographyTokens.maximumFontScale),
  );
  const largeTextAllowance = (supportedFontScale - 1) * nativeLayoutTokens.spacing[8];

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.color.canvas },
        tabBarActiveTintColor: theme.color.actionPrimary,
        tabBarAllowFontScaling: true,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: theme.color.textSecondary,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopColor: theme.color.borderSubtle,
          minHeight:
            nativeLayoutTokens.navigation.tabBarHeight +
            nativeLayoutTokens.spacing[4] +
            largeTextAllowance,
          paddingBottom: nativeLayoutTokens.spacing[2],
          paddingTop: nativeLayoutTokens.spacing[1],
        },
      }}
    >
      {tabDestinations.map((destination) => (
        <Tabs.Screen
          key={destination.route}
          name={destination.route}
          options={{
            tabBarAccessibilityLabel: `${destination.label}, thẻ điều hướng`,
            tabBarIcon: ({ color, focused }) => (
              <View
                importantForAccessibility="no-hide-descendants"
                style={[
                  styles.iconContainer,
                  focused ? { backgroundColor: theme.color.surfaceSubtle } : null,
                ]}
              >
                <Ionicons
                  color={color}
                  name={focused ? destination.activeIcon : destination.icon}
                  size={22}
                />
              </View>
            ),
            tabBarLabel: ({ color, focused }) => (
              <Text
                allowFontScaling
                maxFontSizeMultiplier={nativeTypographyTokens.maximumFontScale}
                numberOfLines={2}
                style={[styles.label, { color, fontWeight: focused ? '700' : '500' }]}
              >
                {destination.label}
              </Text>
            ),
            title: destination.label,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.chip,
    height: 28,
    justifyContent: 'center',
    minWidth: 44,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  tabItem: {
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: 0,
  },
});
