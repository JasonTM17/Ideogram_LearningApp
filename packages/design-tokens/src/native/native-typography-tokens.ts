export const nativeTypographyTokens = {
  fontFamily: {
    ui: 'Be Vietnam Pro',
    fallback: 'Noto Sans',
    learning: {
      ja: 'Noto Sans JP',
      sc: 'Noto Sans SC',
      kr: 'Noto Sans KR',
    },
  },
  scale: {
    display: { fontSize: 32, lineHeight: 42, fontWeight: '700' },
    headingLg: { fontSize: 24, lineHeight: 34, fontWeight: '600' },
    headingMd: { fontSize: 20, lineHeight: 30, fontWeight: '600' },
    bodyLg: { fontSize: 18, lineHeight: 30, fontWeight: '400' },
    body: { fontSize: 16, lineHeight: 26, fontWeight: '400' },
    bodySm: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
    label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
    caption: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  },
  learningText: {
    fontSize: 18,
    lineHeight: 31,
    fontWeight: '400',
  },
  maximumFontScale: 2,
} as const;

export type NativeTypographyTokens = typeof nativeTypographyTokens;
