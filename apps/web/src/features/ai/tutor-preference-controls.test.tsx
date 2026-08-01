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
    expect(markup).toContain('Tiếng Trung — sắp mở');
    expect(markup).toContain('Tiếng Hàn — sắp mở');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('N5');
    expect(markup).toContain('Giao tiếp');
    expect(markup).toContain('Độ sâu giải thích');
    expect(markup).toContain('Giọng điệu');
    expect(markup).toContain('hiện chỉ có Tiếng Nhật đang mở cho beta');
  });
});
