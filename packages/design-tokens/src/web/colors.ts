export const webColorTokens = {
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

export type WebColorTokens = typeof webColorTokens;
