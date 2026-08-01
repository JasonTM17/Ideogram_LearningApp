import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TutorResponsePanel } from './tutor-response-panel';

const response = {
  assessmentVietnamese: 'Đúng hướng.',
  example: 'これは本です。',
  explanationVietnamese: 'は đánh dấu chủ đề.',
  frequentVietnameseMistake: 'Không đồng nhất は với chủ ngữ.',
  nextExerciseVietnamese: 'Đặt một câu với は.',
  sourceBoundaryVietnamese: 'Chưa có nguồn bài học trong lượt này.',
} as const;

describe('TutorResponsePanel', () => {
  it('renders every bounded Vietnamese response section and replay state', () => {
    const markup = renderToStaticMarkup(
      createElement(TutorResponsePanel, { idempotentReplay: true, response }),
    );

    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-labelledby="tutor-response-title"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain('Kết quả đã lưu được dùng lại an toàn.');
    for (const value of Object.values(response)) {
      expect(markup).toContain(value);
    }
    expect(markup).not.toContain('Tính năng sắp mở');
  });
});
