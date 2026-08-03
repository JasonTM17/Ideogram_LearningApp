import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpenCheck, MonitorSmartphone, ShieldCheck } from 'lucide-react';

import { plannedCapabilities, shippedCapabilities, sourceRepositoryUrl } from './showcase-content';

export function ShowcaseSections() {
  return (
    <>
      <section
        className="showcase-section showcase-capabilities"
        aria-labelledby="capabilities-title"
      >
        <div className="showcase-section__heading">
          <p className="showcase-kicker">Built, not promised</p>
          <h2 id="capabilities-title">Bốn lát cắt đã chạy qua boundary thật.</h2>
        </div>
        <ol>
          {shippedCapabilities.map((capability, index) => (
            <li key={capability.title}>
              <span aria-hidden="true">0{index + 1}</span>
              <div>
                <h3>{capability.title}</h3>
                <p>{capability.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="showcase-section showcase-evidence"
        id="evidence"
        aria-labelledby="evidence-title"
      >
        <div className="showcase-section__heading">
          <p className="showcase-kicker">Visual evidence</p>
          <h2 id="evidence-title">Hai loại bằng chứng, hai mục đích khác nhau.</h2>
        </div>
        <div className="showcase-evidence-grid">
          <figure className="showcase-architecture">
            <Image
              alt="Sơ đồ kiến trúc Ideogram Learning, dùng nét liền cho phần beta đã triển khai và nét đứt cho target state."
              height={716}
              priority
              src="/showcase/system-architecture.png"
              width={1784}
            />
            <figcaption>
              <strong>Kiến trúc có nguồn Mermaid.</strong> Nét liền là boundary beta hiện có; nét
              đứt thể hiện target state, không phải lời hứa đã ship.
            </figcaption>
          </figure>
          <figure className="showcase-runtime-tour">
            <Image
              alt="GIF quay từ project tour chạy tại localhost, lần lượt cho thấy phần mở đầu, bằng chứng kiến trúc và roadmap."
              height={720}
              src="/showcase/project-tour.gif"
              unoptimized
              width={1280}
            />
            <figcaption>
              <strong>Runtime tour được quay từ app.</strong> GIF dùng ảnh chụp localhost của chính
              route này, nên không mô tả dữ liệu học viên hay chứng minh đăng nhập/thiết bị thật.
            </figcaption>
          </figure>
          <figure className="showcase-mobile-flow">
            <Image
              alt="GIF năm màn hình thiết kế mobile gồm Today, Review, AI tutor, Progress và Profile."
              height={512}
              src="/showcase/mobile-learning-flow.gif"
              unoptimized
              width={256}
            />
            <figcaption>
              <strong>Mobile design flow.</strong> Đây là sequence từ handoff Stitch, không phải
              video quay runtime; luồng vocabulary beta thật nằm sau đăng nhập.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="showcase-section showcase-scope" id="scope" aria-labelledby="scope-title">
        <div className="showcase-scope__intro">
          <p className="showcase-kicker">Honest scope</p>
          <h2 id="scope-title">
            Đủ để review như một personal project, chưa tự nhận là production.
          </h2>
          <p>
            Mục tiêu của repository là chứng minh cách những surface web, mobile, database và AI
            giao nhau an toàn. Phần còn lại được giữ thành roadmap thay vì giả lập bằng dữ liệu mẫu.
          </p>
        </div>
        <div className="showcase-scope__planned">
          <MonitorSmartphone aria-hidden="true" size={25} />
          <div>
            <h3>Roadmap còn mở</h3>
            <ul>
              {plannedCapabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="showcase-review" aria-labelledby="review-title">
        <ShieldCheck aria-hidden="true" size={27} />
        <div>
          <p className="showcase-kicker">Reviewer path</p>
          <h2 id="review-title">Muốn đi sâu hơn?</h2>
          <p>
            Đọc README để chạy workspace và quality gates, xem contracts/architecture trong mã
            nguồn, hoặc dùng email beta được mời để mở Today → Lesson → Vocabulary completion.
          </p>
        </div>
        <div className="showcase-review__actions">
          <a className="showcase-action showcase-action--secondary" href={sourceRepositoryUrl}>
            <BookOpenCheck aria-hidden="true" size={18} />
            Đọc repository
          </a>
          <Link
            className="showcase-action showcase-action--primary"
            href="/sign-in?returnTo=%2Ftoday"
          >
            Đi tới Today
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}

export function ShowcaseFooter() {
  return (
    <footer className="showcase-footer">
      <p>Ideogram Learning · Japanese-first · internal beta foundation</p>
      <Link href="/">Về trang giới thiệu</Link>
    </footer>
  );
}
