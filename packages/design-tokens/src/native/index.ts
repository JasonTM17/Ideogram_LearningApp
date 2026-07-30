import { nativeColorTokens, nativeDarkTheme, nativeLightTheme } from './native-color-tokens';
import { nativeLayoutTokens } from './native-layout-tokens';
import { nativeMotionTokens } from './native-motion-tokens';
import { nativeTypographyTokens } from './native-typography-tokens';

export const nativeDesignTokens = {
  color: nativeColorTokens,
  theme: {
    light: nativeLightTheme,
    dark: nativeDarkTheme,
  },
  layout: nativeLayoutTokens,
  motion: nativeMotionTokens,
  typography: nativeTypographyTokens,
} as const;

export {
  nativeColorTokens,
  nativeDarkTheme,
  nativeLayoutTokens,
  nativeLightTheme,
  nativeMotionTokens,
  nativeTypographyTokens,
};

export type { NativeColorTokens, NativeTheme } from './native-color-tokens';
export type { NativeLayoutTokens } from './native-layout-tokens';
export type { NativeCubicBezier, NativeMotionTokens } from './native-motion-tokens';
export type { NativeTypographyTokens } from './native-typography-tokens';

export type NativeDesignTokens = typeof nativeDesignTokens;
