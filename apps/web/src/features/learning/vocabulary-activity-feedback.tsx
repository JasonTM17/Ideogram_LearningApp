'use client';

import { CheckCircle2, CircleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { ActivityAttemptReceipt } from '@ideogram/contracts';
import type { WebActivityAttemptFeedback } from './activity-attempt-client';

interface VocabularyActivityReceiptProps {
  lessonHref: string;
  receipt: ActivityAttemptReceipt;
}

interface VocabularyActivityErrorProps {
  feedback: WebActivityAttemptFeedback;
  onRetry: () => void;
  signInHref: string;
}

const progressCopy = (progressState: ActivityAttemptReceipt['progressState']): string => {
  if (progressState === 'completed') {
    return 'Bài học này đã hoàn thành.';
  }

  return 'Bạn có thể quay lại bài học để tiếp tục hoạt động kế tiếp.';
};

export function VocabularyActivityReceipt({ lessonHref, receipt }: VocabularyActivityReceiptProps) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <section
      ref={panelRef}
      aria-live="polite"
      aria-labelledby="vocabulary-activity-receipt-title"
      className="vocabulary-activity__receipt"
      tabIndex={-1}
    >
      <CheckCircle2 aria-hidden="true" size={25} />
      <div>
        <p className="vocabulary-activity__eyebrow">Đã xác nhận</p>
        <h2 id="vocabulary-activity-receipt-title">Tiến độ học đã được lưu</h2>
        <p>
          Đã hoàn thành {receipt.completedActivityCount}/{receipt.totalActivityCount} hoạt động.
        </p>
        <p>{progressCopy(receipt.progressState)}</p>
        {receipt.idempotentReplay ? (
          <p className="vocabulary-activity__replay">Kết quả trước đó đã được dùng lại an toàn.</p>
        ) : null}
        <a className="vocabulary-activity__secondary-action" href={lessonHref}>
          Quay lại bài học
        </a>
      </div>
    </section>
  );
}

export function VocabularyActivityError({
  feedback,
  onRetry,
  signInHref,
}: VocabularyActivityErrorProps) {
  return (
    <section aria-live="assertive" className="vocabulary-activity__error" role="alert">
      <CircleAlert aria-hidden="true" size={23} />
      <div>
        <p>{feedback.message}</p>
        <div className="vocabulary-activity__error-actions">
          {feedback.code === 'UNAUTHORIZED' ? (
            <a className="vocabulary-activity__secondary-action" href={signInHref}>
              Đăng nhập lại
            </a>
          ) : null}
          {feedback.retryable ? (
            <button
              className="vocabulary-activity__secondary-action"
              onClick={onRetry}
              type="button"
            >
              Gửi lại an toàn
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
