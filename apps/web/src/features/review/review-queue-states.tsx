import { BookOpenCheck, CheckCircle2, RefreshCw } from 'lucide-react';

import { ActionLink } from '@/components/ui/action-link';
import { PageHeading } from '@/components/ui/page-heading';
import { StatusPanel } from '@/components/ui/status-panel';

import type { ReviewSubmissionReceipt } from '@ideogram/contracts';
import type { VocabularyReviewQueueItem } from './review-queue-presentation';

interface ReviewQueueReceiptProps {
  hasNextItem: boolean;
  item: VocabularyReviewQueueItem;
  onContinue: () => void;
  receipt: ReviewSubmissionReceipt;
}

interface ReviewQueueEmptyStateProps {
  unavailableItemCount: number;
}

const formatDueAt = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

export function ReviewQueueReceipt({
  hasNextItem,
  item,
  onContinue,
  receipt,
}: ReviewQueueReceiptProps) {
  return (
    <div className="review-queue-view">
      <PageHeading
        description="Lịch tiếp theo do máy chủ tính và lưu cùng lịch sử ôn tập của bạn."
        eyebrow="Đã ghi nhận"
        title="Một quyết định đã được lưu"
      />
      <section aria-live="polite" className="review-receipt" tabIndex={-1}>
        <CheckCircle2 aria-hidden="true" size={28} />
        <div>
          <p>Đã cập nhật: {item.entry.term}</p>
          <h2>Gặp lại vào {formatDueAt(receipt.schedule.dueAt)}</h2>
          <p>
            Lịch SRS v{receipt.schedule.algorithmVersion.replace('srs-v', '')} ·{' '}
            {receipt.schedule.intervalMinutes} phút · {receipt.schedule.state}
          </p>
          {receipt.idempotentReplay ? <p>Kết quả trước đó đã được dùng lại an toàn.</p> : null}
        </div>
      </section>
      <div className="review-queue-actions">
        {hasNextItem ? (
          <button className="review-primary-action" onClick={onContinue} type="button">
            Ôn mục tiếp theo
            <RefreshCw aria-hidden="true" size={17} />
          </button>
        ) : (
          <ActionLink href="/today" variant="primary">
            Về Hôm nay
          </ActionLink>
        )}
      </div>
    </div>
  );
}

export function ReviewQueueEmptyState({ unavailableItemCount }: ReviewQueueEmptyStateProps) {
  const hasUnavailableItems = unavailableItemCount > 0;
  return (
    <div className="review-queue-view">
      <PageHeading
        description={
          hasUnavailableItems
            ? 'Một số mục cũ chưa có phiên ôn tương thích và không được thay thế bằng thẻ minh hoạ.'
            : 'Chỉ các mục được tạo từ lần học đã xác nhận mới xuất hiện ở đây.'
        }
        eyebrow="Ôn tập"
        title={hasUnavailableItems ? 'Cần cập nhật hàng đợi' : 'Hàng đợi đang trống'}
      />
      <StatusPanel
        action={
          <ActionLink href="/learn" variant="secondary">
            Mở lộ trình
          </ActionLink>
        }
        description={
          hasUnavailableItems
            ? `${unavailableItemCount} mục chưa thể mở trong phiên vocabulary hiện tại. Hãy tải lại sau khi nội dung được cập nhật.`
            : 'Hoàn thành một hoạt động từ vựng đã phát hành để nhận các mục tự đánh giá đầu tiên.'
        }
        icon={BookOpenCheck}
        label={hasUnavailableItems ? 'Không tạo thẻ thay thế' : 'Không có mục sẵn sàng'}
        title={hasUnavailableItems ? 'Một số mục chưa tương thích' : 'Chưa có từ nào cần ôn'}
        tone="info"
      />
    </div>
  );
}
