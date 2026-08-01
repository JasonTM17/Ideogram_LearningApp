import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TutorPreferenceControls, defaultWebTutorPreferences } from './tutor-preference-controls';

describe('TutorPreferenceControls', () => {
  it('renders Vietnamese-first controls for language, level, goal, depth, and tone', () => {
    const markup = renderToStaticMarkup(
      createElement(TutorPreferenceControls, {
        disabled: false,
        onChange: () => undefined,
        preferences: defaultWebTutorPreferences,
      }),
    );

    expect(markup).toContain('Cấu hình Trợ lý');
    expect(markup).toContain('Tiếng Nhật');
    expect(markup).toContain('N5');
    expect(markup).toContain('Giao tiếp');
    expect(markup).toContain('Độ sâu giải thích');
    expect(markup).toContain('Giọng điệu');
    expect(markup).toContain('Cấu hình dành cho người Việt');
  });
});
