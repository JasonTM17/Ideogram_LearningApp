import Link from 'next/link';
import { ArrowRight, BookOpenCheck, Layers3 } from 'lucide-react';

import { ActionLink } from '@/components/ui/action-link';
import { PageHeading } from '@/components/ui/page-heading';
import { StatusPanel } from '@/components/ui/status-panel';

import type { LearnerCatalogResponse } from '@ideogram/contracts';

interface LearningPathViewProps {
  catalog: LearnerCatalogResponse;
}

export function LearningPathView({ catalog }: LearningPathViewProps) {
  const hasRelease = catalog.languagePacks.some((languagePack) => languagePack.releases.length > 0);

  return (
    <div className="learning-path">
      <PageHeading
        description="Chỉ các bản nội dung đã phát hành mới xuất hiện ở đây. Mỗi bài đều đi kèm mục tiêu, thời lượng và hoạt động công khai."
        eyebrow="Lộ trình"
        title="Học theo cấp độ, không học mò"
      />

      {!hasRelease ? (
        <StatusPanel
          action={
            <ActionLink href="/today" variant="secondary">
              Về Hôm nay
              <ArrowRight aria-hidden="true" size={18} />
            </ActionLink>
          }
          description="Gói tiếng Nhật đang hoạt động nhưng corpus N5 vẫn ở chế độ review-only. Hệ thống sẽ không hiển thị bản nháp cho người học."
          icon={BookOpenCheck}
          label="Catalog thật · 0 bản phát hành"
          title="Lộ trình đang chờ cổng nội dung"
          tone="info"
        />
      ) : (
        <div className="language-pack-list">
          {catalog.languagePacks.map((languagePack) => (
            <section className="language-pack" key={languagePack.languageCode}>
              <div className="language-pack__heading">
                <span aria-hidden="true">
                  <Layers3 size={22} />
                </span>
                <div>
                  <p>Gói ngôn ngữ</p>
                  <h2>{languagePack.displayName}</h2>
                </div>
              </div>

              <div className="release-list">
                {languagePack.releases.map((release) => (
                  <article className="release-card" key={release.contentReleaseId}>
                    <header>
                      <div>
                        <p>
                          {release.levelCode} · {release.version}
                        </p>
                        <h3>{release.titleVietnamese}</h3>
                      </div>
                      <span>{release.units.length} chặng</span>
                    </header>

                    <ol className="unit-list">
                      {release.units.map((unit) => (
                        <li key={unit.unitId}>
                          <div className="unit-list__heading">
                            <span>Chặng {unit.sequence}</span>
                            <strong>{unit.titleVietnamese}</strong>
                          </div>
                          <ol className="lesson-link-list">
                            {unit.lessons.map((lesson) => (
                              <li key={lesson.lessonId}>
                                <Link href={`/lessons/${lesson.lessonId}`}>
                                  <span>
                                    {lesson.sequence}. {lesson.titleVietnamese}
                                  </span>
                                  <small>{lesson.estimatedMinutes} phút</small>
                                  <ArrowRight aria-hidden="true" size={18} />
                                </Link>
                              </li>
                            ))}
                          </ol>
                        </li>
                      ))}
                    </ol>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
