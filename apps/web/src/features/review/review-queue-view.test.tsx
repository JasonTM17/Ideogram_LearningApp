import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ReviewQueueView } from './review-queue-view';
import { BrowserOfflineSyncProvider } from '@/features/offline-sync/browser-offline-sync-provider';

const presentation = {
  items: [
    {
      activityTitle: 'Từ vựng: giáo viên',
      dueAt: '2026-08-03T07:00:00.000Z',
      entry: {
        example: { translationVietnamese: 'Tôi là giáo viên.', value: '私は先生です。' },
        meaningVietnamese: 'giáo viên',
        reading: 'せんせい',
        term: '先生',
      },
      itemId: '123e4567-e89b-42d3-a456-426614174003',
      lessonTitle: 'Lời chào đầu tiên',
      state: 'learning' as const,
    },
  ],
  unavailableItemCount: 0,
};

describe('review queue view', () => {
  it('renders one honest recall decision without exposing the answer initially', () => {
    const markup = renderToStaticMarkup(
      <BrowserOfflineSyncProvider>
        <ReviewQueueView presentation={presentation} signInHref="/sign-in?returnTo=%2Freview" />
      </BrowserOfflineSyncProvider>,
    );
    expect(markup).toContain('Nhớ lại một từ tại một thời điểm');
    expect(markup).toContain('先生');
    expect(markup).toContain('Hiện nghĩa và ví dụ');
    expect(markup).toContain('Đây là tự đánh giá, không phải điểm chấm tự động.');
    expect(markup).not.toContain('Tôi là giáo viên.');
    expect(markup).not.toContain('せんせい');
  });

  it('uses a real empty state rather than sample review cards', () => {
    const markup = renderToStaticMarkup(
      <BrowserOfflineSyncProvider>
        <ReviewQueueView
          presentation={{ items: [], unavailableItemCount: 0 }}
          signInHref="/sign-in"
        />
      </BrowserOfflineSyncProvider>,
    );
    expect(markup).toContain('Chưa có từ nào cần ôn');
    expect(markup).not.toContain('先生');
  });

  it('does not call an unavailable-only queue empty', () => {
    const markup = renderToStaticMarkup(
      <BrowserOfflineSyncProvider>
        <ReviewQueueView
          presentation={{ items: [], unavailableItemCount: 2 }}
          signInHref="/sign-in"
        />
      </BrowserOfflineSyncProvider>,
    );
    expect(markup).toContain('Cần cập nhật hàng đợi');
    expect(markup).toContain('2 mục chưa thể mở');
  });
});
