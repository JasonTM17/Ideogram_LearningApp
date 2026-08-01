import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LessonOverviewView } from './lesson-overview-view';

import type { CatalogLessonContext } from './catalog-presentation';

const lessonContext: CatalogLessonContext = {
  contentReleaseId: 'japanese-n5-v1',
  languageCode: 'ja',
  languageName: 'Tiếng Nhật',
  lesson: {
    activities: [
      {
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
      {
        activityId: 'greeting-retrieval',
        activityType: 'retrieval',
        estimatedMinutes: 5,
        instructionsVietnamese: 'Nhớ lại câu chào phù hợp.',
        payload: { prompt: 'おはようございます', promptVietnamese: 'Chào buổi sáng.' },
        rubyAnnotationState: 'not_applicable',
        targetScript: 'kana_kanji',
        titleVietnamese: 'Chào buổi sáng',
      },
    ],
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

describe('LessonOverviewView', () => {
  it('links only the supported vocabulary activity and labels other types honestly', () => {
    const markup = renderToStaticMarkup(createElement(LessonOverviewView, { lessonContext }));

    expect(markup).toContain('href="/lessons/greetings-01/activities/greeting-vocabulary"');
    expect(markup).toContain('Học từ vựng');
    expect(markup).toContain('Chưa hỗ trợ trong lượt này');
    expect(markup).not.toContain('href="/lessons/greetings-01/activities/greeting-retrieval"');
  });
});
