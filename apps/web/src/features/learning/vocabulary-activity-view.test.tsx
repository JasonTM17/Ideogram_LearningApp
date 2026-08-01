import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { VocabularyActivityView } from './vocabulary-activity-view';

import type { CatalogVocabularyActivityContext } from './catalog-presentation';

const activityContext: CatalogVocabularyActivityContext = {
  activity: {
    activityId: 'greeting-vocabulary',
    activityType: 'vocabulary',
    estimatedMinutes: 4,
    instructionsVietnamese: 'Đọc từ và ví dụ trước khi xác nhận đã học.',
    payload: {
      entries: [
        {
          example: { translationVietnamese: 'Tôi là giáo viên.', value: '私は先生です。' },
          meaningVietnamese: 'giáo viên',
          reading: 'せんせい',
          term: '先生',
        },
      ],
    },
    rubyAnnotationState: 'planned',
    targetScript: 'kana_kanji',
    titleVietnamese: 'Từ vựng: giáo viên',
  },
  activitySequence: 1,
  contentReleaseId: 'japanese-n5-v1',
  languageCode: 'ja',
  languageName: 'Tiếng Nhật',
  lesson: {
    activities: [],
    estimatedMinutes: 10,
    lessonId: 'greetings-01',
    sequence: 1,
    summaryVietnamese: 'Những câu chào cơ bản.',
    titleVietnamese: 'Lời chào đầu tiên',
  },
  levelCode: 'N5',
  releaseTitle: 'Nền tảng N5',
  unitTitle: 'Bắt đầu giao tiếp',
};

describe('VocabularyActivityView', () => {
  it('renders public vocabulary content and an honest acknowledgement action', () => {
    const markup = renderToStaticMarkup(
      createElement(VocabularyActivityView, {
        activityContext: {
          ...activityContext,
          lesson: { ...activityContext.lesson, activities: [activityContext.activity] },
        },
        signInHref: '/sign-in?returnTo=%2Flessons%2Fgreetings-01',
      }),
    );

    expect(markup).toContain('lang="ja"');
    expect(markup).toContain('先生');
    expect(markup).toContain('せんせい');
    expect(markup).toContain('Tôi là giáo viên.');
    expect(markup).toContain('Xác nhận đã học');
    expect(markup).toContain('Không có đáp án hay điểm số bị ẩn');
    expect(markup).not.toContain('Đáp án đúng');
  });
});
