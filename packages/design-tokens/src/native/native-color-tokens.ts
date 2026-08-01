export const nativeColorTokens = {
  canvas: { light: '#FCFAF7', dark: '#161210' },
  surface: { light: '#FFFDF9', dark: '#201A17' },
  surfaceSubtle: { light: '#F6ECE5', dark: '#302724' },
  surfaceRaised: { light: '#FFFFFF', dark: '#2B211E' },
  borderSubtle: { light: '#EADDD4', dark: '#4A3C37' },
  textPrimary: { light: '#211A16', dark: '#FFF8F4' },
  textSecondary: { light: '#5F5049', dark: '#E1D0C7' },
  textTertiary: { light: '#7B6960', dark: '#BBA9A0' },
  actionPrimary: { light: '#B9382E', dark: '#FF8A72' },
  onActionPrimary: { light: '#FFFFFF', dark: '#241310' },
  actionSecondary: { light: '#0F766E', dark: '#2DD4BF' },
  accentWarm: { light: '#B94A24', dark: '#FFB08E' },
  success: { light: '#15803D', dark: '#4ADE80' },
  warning: { light: '#B45309', dark: '#FBBF24' },
  focusRing: { light: '#2563EB', dark: '#93C5FD' },
  danger: { light: '#B91C1C', dark: '#FCA5A5' },
  learning: {
    masteryGrowing: { light: '#0F766E', dark: '#2DD4BF' },
    masterySecure: { light: '#15803D', dark: '#4ADE80' },
    reviewDue: { light: '#B45309', dark: '#FBBF24' },
    aiContext: { light: '#B9382E', dark: '#FF8A72' },
  },
} as const;

export const nativeLightTheme = {
  color: {
    canvas: nativeColorTokens.canvas.light,
    surface: nativeColorTokens.surface.light,
    surfaceSubtle: nativeColorTokens.surfaceSubtle.light,
    surfaceRaised: nativeColorTokens.surfaceRaised.light,
    borderSubtle: nativeColorTokens.borderSubtle.light,
    textPrimary: nativeColorTokens.textPrimary.light,
    textSecondary: nativeColorTokens.textSecondary.light,
    textTertiary: nativeColorTokens.textTertiary.light,
    actionPrimary: nativeColorTokens.actionPrimary.light,
    onActionPrimary: nativeColorTokens.onActionPrimary.light,
    actionSecondary: nativeColorTokens.actionSecondary.light,
    accentWarm: nativeColorTokens.accentWarm.light,
    success: nativeColorTokens.success.light,
    warning: nativeColorTokens.warning.light,
    focusRing: nativeColorTokens.focusRing.light,
    danger: nativeColorTokens.danger.light,
    aiContext: nativeColorTokens.learning.aiContext.light,
  },
} as const;

export const nativeDarkTheme = {
  color: {
    canvas: nativeColorTokens.canvas.dark,
    surface: nativeColorTokens.surface.dark,
    surfaceSubtle: nativeColorTokens.surfaceSubtle.dark,
    surfaceRaised: nativeColorTokens.surfaceRaised.dark,
    borderSubtle: nativeColorTokens.borderSubtle.dark,
    textPrimary: nativeColorTokens.textPrimary.dark,
    textSecondary: nativeColorTokens.textSecondary.dark,
    textTertiary: nativeColorTokens.textTertiary.dark,
    actionPrimary: nativeColorTokens.actionPrimary.dark,
    onActionPrimary: nativeColorTokens.onActionPrimary.dark,
    actionSecondary: nativeColorTokens.actionSecondary.dark,
    accentWarm: nativeColorTokens.accentWarm.dark,
    success: nativeColorTokens.success.dark,
    warning: nativeColorTokens.warning.dark,
    focusRing: nativeColorTokens.focusRing.dark,
    danger: nativeColorTokens.danger.dark,
    aiContext: nativeColorTokens.learning.aiContext.dark,
  },
} as const;

export type NativeColorTokens = typeof nativeColorTokens;
export type NativeTheme = typeof nativeLightTheme | typeof nativeDarkTheme;
