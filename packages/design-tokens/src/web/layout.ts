export const webSpacingTokens = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
} as const;

export const webRadiusTokens = {
  control: 10,
  surface: 12,
  chip: 999,
} as const;

export const webZIndexTokens = {
  base: 0,
  card: 10,
  sticky: 100,
  overlay: 200,
  modal: 300,
  tooltip: 400,
  notification: 500,
} as const;

export const webLayoutTokens = {
  spacing: webSpacingTokens,
  radius: webRadiusTokens,
  zIndex: webZIndexTokens,
  touchTarget: 44,
  contentMeasure: 760,
  navigation: {
    bottomBarHeight: 88,
    railWidth: 88,
    sidebarMinWidth: 248,
    sidebarWidth: 264,
    sidebarMaxWidth: 280,
    supportRailWidth: 320,
  },
} as const;

export type WebLayoutTokens = typeof webLayoutTokens;
