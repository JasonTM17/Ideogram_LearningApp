import { describe, expect, it } from 'vitest';

import {
  nativeDarkTheme,
  nativeDesignTokens,
  nativeLayoutTokens,
  nativeLightTheme,
  nativeMotionTokens,
  nativeTypographyTokens,
} from '@ideogram/design-tokens/native';
import { nativeDesignTokens as rootNativeDesignTokens } from '../index';

describe('native themes', () => {
  it('exposes the approved semantic palette in light and dark modes', () => {
    expect(nativeLightTheme.color.actionPrimary).toBe('#1E40AF');
    expect(nativeDarkTheme.color.actionPrimary).toBe('#60A5FA');
    expect(nativeLightTheme.color.onActionPrimary).toBe('#FFFFFF');
    expect(nativeDarkTheme.color.onActionPrimary).toBe('#0B1220');
    expect(nativeDarkTheme.color.surfaceRaised).toBe('#172033');
    expect(nativeDarkTheme.color.aiContext).toBe('#60A5FA');
    expect(Object.keys(nativeLightTheme.color)).toEqual(Object.keys(nativeDarkTheme.color));
  });

  it('is available through both native and root entry points', () => {
    expect(rootNativeDesignTokens).toBe(nativeDesignTokens);
  });
});

describe('native layout', () => {
  it('uses the 4/8 spacing rhythm and platform touch minimums', () => {
    expect(nativeLayoutTokens.spacing).toEqual({
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      6: 24,
      8: 32,
      12: 48,
    });
    expect(nativeLayoutTokens.touchTarget.ios).toBeGreaterThanOrEqual(44);
    expect(nativeLayoutTokens.touchTarget.android).toBeGreaterThanOrEqual(48);
  });

  it('keeps tab content separate from runtime safe-area insets', () => {
    expect(nativeLayoutTokens.navigation.tabBarHeight).toBe(56);
    expect(nativeLayoutTokens.safeArea.minimumVerticalPadding).toBeGreaterThan(0);
    expect(nativeLayoutTokens.navigation.contentGutter).toBe(
      nativeLayoutTokens.safeArea.contentEdgePadding,
    );
    expect(nativeLayoutTokens.navigation.contentMaxWidth).toBe(760);
  });
});

describe('native typography and motion', () => {
  it('provides Vietnamese UI and script-specific learning families', () => {
    expect(nativeTypographyTokens.fontFamily.ui).toBe('Be Vietnam Pro');
    expect(nativeTypographyTokens.fontFamily.learning).toEqual({
      ja: 'Noto Sans JP',
      sc: 'Noto Sans SC',
      kr: 'Noto Sans KR',
    });
    expect(nativeTypographyTokens.scale.body.fontSize).toBeGreaterThanOrEqual(16);
    expect(nativeTypographyTokens.maximumFontScale).toBe(2);
  });

  it('uses native-compatible weights and bounded purposeful motion', () => {
    const weights = Object.values(nativeTypographyTokens.scale).map(({ fontWeight }) => fontWeight);
    expect(weights.every((weight) => /^[1-9]00$/.test(weight))).toBe(true);
    expect(nativeMotionTokens.duration.fast).toBeGreaterThanOrEqual(150);
    expect(nativeMotionTokens.duration.slow).toBeLessThanOrEqual(300);
    expect(nativeMotionTokens.easing.standard).toHaveLength(4);
    expect(nativeMotionTokens.reducedMotionDuration).toBe(0);
  });
});
