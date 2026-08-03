'use client';

import { CircleStop, Lightbulb } from 'lucide-react';

import type { ReviewGrade } from '@ideogram/contracts';
import type { VocabularyReviewQueueItem } from './review-queue-presentation';
import type { WebReviewFeedback } from './review-submission-client';

interface ReviewCardProps {
  feedback: WebReviewFeedback | null;
  isAnswerRevealed: boolean;
  isSubmitting: boolean;
  item: VocabularyReviewQueueItem;
  onGrade: (grade: ReviewGrade) => void;
  onRetry: () => void;
  onReveal: () => void;
  onStop: () => void;
  signInHref: string;
}

const reviewChoices: { description: string; grade: ReviewGrade; label: string }[] = [
  { description: 'Chưa nhớ được từ hoặc nghĩa.', grade: 'again', label: 'Chưa nhớ' },
  { description: 'Nhớ được một phần, cần gặp lại sớm.', grade: 'hard', label: 'Khó' },
  { description: 'Nhớ được từ và nghĩa.', grade: 'good', label: 'Tốt' },
  { description: 'Nhớ rõ, có thể giãn lịch nhiều hơn.', grade: 'easy', label: 'Dễ' },
];

export function ReviewCard({
  feedback,
  isAnswerRevealed,
  isSubmitting,
  item,
  onGrade,
  onRetry,
  onReveal,
  onStop,
  signInHref,
}: ReviewCardProps) {
  return (
    <>
      <article className="review-card">
        <header>
          <span>{item.state === 'relearning' ? 'Cần gặp lại' : 'Từ vựng'}</span>
          <p>
            {item.activityTitle} · {item.lessonTitle}
          </p>
        </header>
        <div className="review-card__prompt">
          <p>Hãy thử nhớ nghĩa trước khi mở gợi ý</p>
          <h2 lang="ja">{item.entry.term}</h2>
        </div>
        <button
          aria-expanded={isAnswerRevealed}
          className="review-hint-toggle"
          onClick={onReveal}
          type="button"
        >
          <Lightbulb aria-hidden="true" size={18} />
          {isAnswerRevealed ? 'Ẩn gợi ý' : 'Hiện nghĩa và ví dụ'}
        </button>
        {isAnswerRevealed ? (
          <section aria-live="polite" className="review-card__answer">
            <p lang="ja">{item.entry.reading}</p>
            <strong>{item.entry.meaningVietnamese}</strong>
            <blockquote>
              <p lang="ja">{item.entry.example.value}</p>
              <footer>{item.entry.example.translationVietnamese}</footer>
            </blockquote>
          </section>
        ) : null}
        <section aria-labelledby="review-grade-title" className="review-card__choices">
          <div>
            <h3 id="review-grade-title">Bạn nhớ đến đâu?</h3>
            <p>Đây là tự đánh giá, không phải điểm chấm tự động.</p>
          </div>
          <div className="review-grade-grid">
            {reviewChoices.map((choice) => (
              <button
                aria-busy={isSubmitting}
                disabled={isSubmitting || feedback !== null}
                key={choice.grade}
                onClick={() => onGrade(choice.grade)}
                title={choice.description}
                type="button"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </section>
      </article>
      {isSubmitting ? (
        <button className="review-stop-action" onClick={onStop} type="button">
          <CircleStop aria-hidden="true" size={17} />
          Dừng yêu cầu
        </button>
      ) : null}
      {feedback ? (
        <section aria-live="assertive" className="review-error" role="alert">
          <p>{feedback.message}</p>
          <div>
            {feedback.code === 'UNAUTHORIZED' ? <a href={signInHref}>Đăng nhập lại</a> : null}
            {feedback.retryable ? (
              <button onClick={onRetry} type="button">
                Thử lại an toàn
              </button>
            ) : null}
            {!feedback.retryable ? <a href="/review">Tải lại hàng đợi</a> : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
