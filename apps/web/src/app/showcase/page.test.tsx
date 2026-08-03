import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ShowcasePage from './page';

describe('ShowcasePage', () => {
  it('gives a credential-free reviewer path without claiming planned work is shipped', () => {
    const markup = renderToStaticMarkup(createElement(ShowcasePage));

    expect(markup).toContain('Không cần đăng nhập để xem');
    expect(markup).toContain('Xem bằng chứng triển khai');
    expect(markup).toContain('Roadmap còn mở');
    expect(markup).toContain('không phải lời hứa đã ship');
    expect(markup).toContain('href="/sign-in?returnTo=%2Ftoday"');
    expect(markup).toContain('url=%2Fshowcase%2Fsystem-architecture.png');
    expect(markup).toContain('src="/showcase/project-tour.gif"');
    expect(markup).toContain('src="/showcase/mobile-learning-flow.gif"');
  });
});
