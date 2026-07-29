import { webColorTokens } from './colors';
import { webLayoutTokens } from './layout';
import { webMotionTokens } from './motion';
import { webTypographyTokens } from './typography';

export const webDesignTokens = {
  color: webColorTokens,
  layout: webLayoutTokens,
  motion: webMotionTokens,
  typography: webTypographyTokens,
} as const;

export { webColorTokens, webLayoutTokens, webMotionTokens, webTypographyTokens };

export type WebDesignTokens = typeof webDesignTokens;
