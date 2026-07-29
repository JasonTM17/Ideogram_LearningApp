import { describe, expect, it } from 'vitest';

import { editorialTokens, webColorTokens, webLayoutTokens, webTypographyTokens } from './index';

describe('editorialTokens', () => {
  it('keeps the visual scale monotonic for predictable layouts', () => {
    expect(editorialTokens.space[2]).toBeGreaterThan(editorialTokens.space[1]);
    expect(editorialTokens.space[8]).toBeGreaterThan(editorialTokens.space[6]);
  });

  it('preserves the existing compatibility aliases for legacy consumers', () => {
    expect(editorialTokens.color.paper).toBe(webColorTokens.canvas.light);
    expect(editorialTokens.color.sage).toBe(webColorTokens.surfaceSubtle.light);
    expect(editorialTokens.radius.card).toBe(webLayoutTokens.radius.surface);
  });
});

describe('webDesignTokens', () => {
  it('matches the approved light and dark master palette', () => {
    expect(webColorTokens.actionPrimary.light).toBe('#1E40AF');
    expect(webColorTokens.actionPrimary.dark).toBe('#60A5FA');
    expect(webColorTokens.surfaceRaised.dark).toBe('#172033');
    expect(webColorTokens.focusRing.dark).toBe('#93C5FD');
  });

  it('keeps the learner shell layout within the approved breakpoint widths', () => {
    expect(webLayoutTokens.navigation.sidebarMinWidth).toBeGreaterThanOrEqual(248);
    expect(webLayoutTokens.navigation.sidebarMaxWidth).toBeLessThanOrEqual(280);
    expect(webLayoutTokens.navigation.railWidth).toBe(88);
    expect(webLayoutTokens.touchTarget).toBeGreaterThanOrEqual(44);
  });

  it('exposes the Vietnamese-first UI and Japanese learning fonts', () => {
    expect(webTypographyTokens.fontFamily.ui).toContain('var(--font-ui)');
    expect(webTypographyTokens.fontFamily.learning.ja).toContain('var(--font-learning-jp)');
    expect(webTypographyTokens.scale.body.fontSize).toBe(16);
  });
});
