import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TodayView } from './today-view';

describe('TodayView', () => {
  it('renders an honest quality-gate state when no release is public', () => {
    const markup = renderToStaticMarkup(
      createElement(TodayView, {
        catalog: {
          languagePacks: [
            {
              displayName: 'Tiếng Nhật',
              languageCode: 'ja',
              releases: [],
            },
          ],
        },
      }),
    );

    expect(markup).toContain('Nội dung đang được duyệt');
    expect(markup).toContain('Chưa có bài công khai');
    expect(markup).toContain('href="/learn"');
    expect(markup).not.toContain('24 từ đang chờ');
    expect(markup).not.toContain('4/5 ngày');
  });
});
