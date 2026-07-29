export const webTypographyTokens = {
  fontFamily: {
    ui: 'var(--font-ui), "Noto Sans", sans-serif',
    fallback: '"Noto Sans", sans-serif',
    learning: {
      ja: 'var(--font-learning-jp), "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif',
      sc: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      kr: '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    },
  },
  scale: {
    display: { fontSize: 32, lineHeight: 42, fontWeight: 700 },
    headingLg: { fontSize: 24, lineHeight: 34, fontWeight: 650 },
    headingMd: { fontSize: 20, lineHeight: 30, fontWeight: 600 },
    bodyLg: { fontSize: 18, lineHeight: 30, fontWeight: 400 },
    body: { fontSize: 16, lineHeight: 26, fontWeight: 400 },
    bodySm: { fontSize: 14, lineHeight: 22, fontWeight: 400 },
    label: { fontSize: 14, lineHeight: 20, fontWeight: 600 },
    caption: { fontSize: 12, lineHeight: 18, fontWeight: 500 },
  },
} as const;

export type WebTypographyTokens = typeof webTypographyTokens;
