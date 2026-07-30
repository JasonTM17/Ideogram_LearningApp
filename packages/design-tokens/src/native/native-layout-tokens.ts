export const nativeSpacingTokens = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
} as const;

export const nativeRadiusTokens = {
  control: 10,
  surface: 12,
  chip: 999,
} as const;

export const nativeLayoutTokens = {
  spacing: nativeSpacingTokens,
  radius: nativeRadiusTokens,
  touchTarget: {
    ios: 44,
    android: 48,
  },
  safeArea: {
    contentEdgePadding: 16,
    minimumVerticalPadding: 8,
  },
  navigation: {
    // Add the runtime bottom safe-area inset to this fixed content height.
    tabBarHeight: 56,
    contentGutter: 16,
    contentMaxWidth: 760,
    tabItemGap: 8,
  },
} as const;

export type NativeLayoutTokens = typeof nativeLayoutTokens;
