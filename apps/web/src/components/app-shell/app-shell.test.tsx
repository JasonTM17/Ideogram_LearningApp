import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { learnerPrimaryDestinations } from './app-shell-destinations';
import { AppShellNavigation } from './app-shell-navigation';

describe('learnerPrimaryDestinations', () => {
  it('keeps the canonical five destination information architecture', () => {
    expect(learnerPrimaryDestinations.map((item) => item.label)).toEqual([
      'Hôm nay',
      'Ôn tập',
      'Trợ lý',
      'Tiến độ',
      'Bạn',
    ]);
  });

  it('marks destinations without connected learner history as planned', () => {
    const plannedItems = learnerPrimaryDestinations.filter((item) => item.planned);
    expect(plannedItems.map((item) => item.label)).toEqual(['Ôn tập', 'Trợ lý', 'Tiến độ']);
  });
});

describe('AppShellNavigation', () => {
  it('renders visible labels and the planned AI affordance', () => {
    const markup = renderToStaticMarkup(
      createElement(AppShellNavigation, { activeKey: 'today', variant: 'bottom' }),
    );

    expect(markup).toContain('Hôm nay');
    expect(markup).toContain('Ôn tập');
    expect(markup).toContain('Trợ lý');
    expect(markup).toContain('Sắp mở');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('href="/assistant"');
  });
});
