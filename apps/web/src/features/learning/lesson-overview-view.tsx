import { ArrowLeft, Clock3, LockKeyhole, ShieldCheck } from 'lucide-react';

import { ActionLink } from '@/components/ui/action-link';

import type { CatalogLessonContext } from './catalog-presentation';

interface LessonOverviewViewProps {
  lessonContext: CatalogLessonContext;
}

const activityLabels = {
  grammar: 'Ngữ pháp',
  listening: 'Nghe',
  objective_quiz: 'Kiểm tra nhanh',
  reading: 'Đọc',
  retrieval: 'Gợi nhớ',
  speaking: 'Nói',
  vocabulary: 'Từ vựng',
  writing: 'Viết',
} as const;

export function LessonOverviewView({ lessonContext }: LessonOverviewViewProps) {
  const { languageName, lesson, levelCode, releaseTitle, unitTitle } = lessonContext;

  return (
    <article className="lesson-overview">
      <ActionLink href="/learn" variant="ghost">
        <ArrowLeft aria-hidden="true" size={18} />
        Trở lại lộ trình
      </ActionLink>

      <header className="lesson-overview__header">
        <p>
          {languageName} · {levelCode} · {unitTitle}
        </p>
        <h1 lang="vi">{lesson.titleVietnamese}</h1>
        <div className="lesson-overview__meta">
          <span>
            <Clock3 aria-hidden="true" size={18} />
            {lesson.estimatedMinutes} phút
          </span>
          <span>
            <ShieldCheck aria-hidden="true" size={18} />
            Bản nội dung đã phát hành
          </span>
        </div>
        <p className="lesson-overview__summary">{lesson.summaryVietnamese}</p>
      </header>

      <section className="lesson-overview__activities" aria-labelledby="activities-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-heading-row__eyebrow">{releaseTitle}</p>
            <h2 id="activities-heading">Hoạt động trong bài</h2>
          </div>
          <span>{lesson.activities.length} hoạt động</span>
        </div>

        <ol>
          {lesson.activities.map((activity, index) => (
            <li id={activity.activityId} key={activity.activityId}>
              <span className="activity-sequence">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <p>
                  {activityLabels[activity.activityType]} · {activity.estimatedMinutes} phút
                </p>
                <h3 lang="vi">{activity.titleVietnamese}</h3>
                <span>{activity.instructionsVietnamese}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="lesson-runtime-note">
        <LockKeyhole aria-hidden="true" size={22} />
        <div>
          <h2>Chế độ làm bài đang được nối an toàn</h2>
          <p>
            Trang này chỉ dùng dữ liệu learner-safe. Đáp án, rubric nội bộ và khóa chấm không bao
            giờ được gửi xuống trình duyệt.
          </p>
        </div>
      </section>
    </article>
  );
}
