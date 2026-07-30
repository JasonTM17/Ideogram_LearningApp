import { ArrowRight, BookOpen, CheckCircle2, Clock3, LibraryBig } from 'lucide-react';

import { createCatalogOverview, flattenCatalogLessons } from './catalog-presentation';
import { ActionLink } from '@/components/ui/action-link';
import { PageHeading } from '@/components/ui/page-heading';

import type { LearnerCatalogResponse } from '@ideogram/contracts';

interface TodayViewProps {
  catalog: LearnerCatalogResponse;
}

const formatMinutes = (minutes: number): string => new Intl.NumberFormat('vi-VN').format(minutes);

export function TodayView({ catalog }: TodayViewProps) {
  const overview = createCatalogOverview(catalog);
  const discoveryLessons = flattenCatalogLessons(catalog).slice(1, 3);
  const nextLesson = overview.nextLesson;

  return (
    <div className="today-view">
      <PageHeading
        description={
          nextLesson
            ? 'Một bước nhỏ, rõ mục tiêu và đủ thời gian để bạn duy trì nhịp học.'
            : 'Gói tiếng Nhật đã sẵn sàng về hệ thống; nội dung chỉ xuất hiện sau khi qua đủ cổng chất lượng.'
        }
        eyebrow="Hôm nay"
        title={nextLesson ? 'Sẵn sàng học tiếp?' : 'Nội dung đang được duyệt'}
      />

      <div className="today-view__overview">
        <section className="today-primary-card" data-empty={nextLesson === null}>
          <div className="today-primary-card__copy">
            <p className="today-primary-card__label">
              {nextLesson
                ? `${nextLesson.languageName} · ${nextLesson.levelCode}`
                : 'Chất lượng trước'}
            </p>
            <h2>
              {nextLesson?.lesson.titleVietnamese ??
                'Bài học sẽ mở khi nội dung, âm thanh và sư phạm đạt chuẩn'}
            </h2>
            <p>
              {nextLesson?.lesson.summaryVietnamese ??
                'Bạn sẽ không gặp bài học nháp, đáp án nội bộ hay dữ liệu minh họa được trình bày như tiến độ thật.'}
            </p>
          </div>

          <div className="today-primary-card__footer">
            <span className="today-primary-card__duration">
              <Clock3 aria-hidden="true" size={18} />
              {nextLesson ? `${nextLesson.lesson.estimatedMinutes} phút` : 'Đang kiểm định'}
            </span>
            <ActionLink
              href={nextLesson ? `/lessons/${nextLesson.lesson.lessonId}` : '/learn'}
              variant={nextLesson ? 'primary' : 'secondary'}
            >
              {nextLesson ? 'Mở bài học' : 'Xem lộ trình'}
              <ArrowRight aria-hidden="true" size={18} />
            </ActionLink>
          </div>
        </section>

        <aside className="today-facts" aria-label="Tình trạng nội dung học">
          <article className="today-fact-card">
            <span className="today-fact-card__icon" aria-hidden="true">
              <BookOpen size={20} />
            </span>
            <div>
              <p>Bài đã phát hành</p>
              <strong>{overview.lessonCount}</strong>
              <span>
                {overview.lessonCount > 0
                  ? `${formatMinutes(overview.totalMinutes)} phút học`
                  : 'Chưa có bài công khai'}
              </span>
            </div>
          </article>
          <article className="today-fact-card">
            <span className="today-fact-card__icon" aria-hidden="true">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <p>Gói ngôn ngữ</p>
              <strong>{overview.languagePackCount}</strong>
              <span>
                {overview.releaseCount > 0
                  ? `${overview.releaseCount} phiên bản nội dung`
                  : 'Đang bật, chờ bản phát hành'}
              </span>
            </div>
          </article>
        </aside>
      </div>

      <section className="discovery-section" aria-labelledby="discovery-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-heading-row__eyebrow">Khám phá</p>
            <h2 id="discovery-heading">Bài tiếp theo trong lộ trình</h2>
          </div>
          <ActionLink href="/learn" variant="ghost">
            Xem toàn bộ
            <ArrowRight aria-hidden="true" size={18} />
          </ActionLink>
        </div>

        {discoveryLessons.length > 0 ? (
          <div className="discovery-grid">
            {discoveryLessons.map((item) => (
              <article className="discovery-card" key={item.lesson.lessonId}>
                <div className="discovery-card__icon" aria-hidden="true">
                  <LibraryBig size={22} />
                </div>
                <p>
                  {item.releaseTitle} · {item.levelCode}
                </p>
                <h3>{item.lesson.titleVietnamese}</h3>
                <span>{item.unitTitle}</span>
                <ActionLink href={`/lessons/${item.lesson.lessonId}`} variant="ghost">
                  Xem bài
                  <ArrowRight aria-hidden="true" size={17} />
                </ActionLink>
              </article>
            ))}
          </div>
        ) : (
          <div className="discovery-empty">
            <LibraryBig aria-hidden="true" size={24} />
            <div>
              <h3>Chưa có bài khám phá được phát hành</h3>
              <p>Khu vực này tự mở khi bản nội dung kế tiếp vượt qua cổng kiểm định.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
