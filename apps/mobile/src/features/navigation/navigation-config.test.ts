import { describe, expect, it } from 'vitest';

import { statusPanelVariants } from '../../components/status-panel-config';
import { fullScreenRoutes, tabDestinations } from './navigation-config';

describe('mobile navigation configuration', () => {
  it('keeps the five required labelled destinations in product order', () => {
    expect(tabDestinations.map(({ label }) => label)).toEqual([
      'Hôm nay',
      'Ôn tập',
      'Trợ lý',
      'Tiến độ',
      'Bạn',
    ]);
    expect(new Set(tabDestinations.map(({ route }) => route)).size).toBe(5);
  });

  it('keeps lesson and review task flows outside the tabs with fallbacks', () => {
    expect(fullScreenRoutes).toEqual([
      { name: 'lessons/[lessonId]', fallbackPath: '/' },
      { name: 'review/session', fallbackPath: '/review' },
    ]);
  });

  it('defines every required truthful status panel state', () => {
    expect(statusPanelVariants).toEqual(['loading', 'empty', 'error', 'offline', 'planned']);
  });
});
