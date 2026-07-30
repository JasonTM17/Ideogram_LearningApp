export const nativeColorTokens = {
  canvas: { light: '#F8FAFC', dark: '#0B1220' },
  surface: { light: '#FFFFFF', dark: '#111827' },
  surfaceSubtle: { light: '#EEF2FF', dark: '#1F2937' },
  surfaceRaised: { light: '#FFFFFF', dark: '#172033' },
  borderSubtle: { light: '#E2E8F0', dark: '#334155' },
  textPrimary: { light: '#0F172A', dark: '#F1F5F9' },
  textSecondary: { light: '#475569', dark: '#CBD5E1' },
  textTertiary: { light: '#64748B', dark: '#94A3B8' },
  actionPrimary: { light: '#1E40AF', dark: '#60A5FA' },
  onActionPrimary: { light: '#FFFFFF', dark: '#0B1220' },
  actionSecondary: { light: '#0F766E', dark: '#2DD4BF' },
  accentWarm: { light: '#C2410C', dark: '#F59E0B' },
  success: { light: '#15803D', dark: '#4ADE80' },
  warning: { light: '#B45309', dark: '#FBBF24' },
  focusRing: { light: '#2563EB', dark: '#93C5FD' },
  danger: { light: '#B91C1C', dark: '#FCA5A5' },
  learning: {
    masteryGrowing: { light: '#0F766E', dark: '#2DD4BF' },
    masterySecure: { light: '#15803D', dark: '#4ADE80' },
    reviewDue: { light: '#B45309', dark: '#FBBF24' },
    aiContext: { light: '#1E40AF', dark: '#60A5FA' },
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
