import {
  webColorTokens,
  webDesignTokens,
  webLayoutTokens,
  webMotionTokens,
  webTypographyTokens,
} from './web';

export const editorialTokens = {
  color: {
    accent: webColorTokens.accentWarm.light,
    ink: webColorTokens.textPrimary.light,
    muted: webColorTokens.textTertiary.light,
    paper: webColorTokens.canvas.light,
    sage: webColorTokens.surfaceSubtle.light,
  },
  radius: {
    card: webLayoutTokens.radius.surface,
    control: webLayoutTokens.radius.control,
  },
  space: {
    1: webLayoutTokens.spacing[1],
    2: webLayoutTokens.spacing[2],
    3: webLayoutTokens.spacing[3],
    4: webLayoutTokens.spacing[4],
    6: webLayoutTokens.spacing[6],
    8: webLayoutTokens.spacing[8],
  },
} as const;

export { webColorTokens, webDesignTokens, webLayoutTokens, webMotionTokens, webTypographyTokens };

export {
  nativeColorTokens,
  nativeDarkTheme,
  nativeDesignTokens,
  nativeLayoutTokens,
  nativeLightTheme,
  nativeMotionTokens,
  nativeTypographyTokens,
} from './native';

export type {
  NativeColorTokens,
  NativeCubicBezier,
  NativeDesignTokens,
  NativeLayoutTokens,
  NativeMotionTokens,
  NativeTheme,
  NativeTypographyTokens,
} from './native';

export type EditorialTokens = typeof editorialTokens;
export type WebDesignTokens = typeof webDesignTokens;
