import Link from 'next/link';
import { ArrowRight, Bot, BookOpenCheck, Languages, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="public-site">
      <header className="public-header">
        <Link className="public-brand" href="/" aria-label="Ideogram Learning, trang chủ">
          <span aria-hidden="true">I</span>
          <span>
            <strong>Ideogram Learning</strong>
            <small>Japanese-first beta</small>
          </span>
        </Link>
        <nav aria-label="Điều hướng trang giới thiệu">
          <Link href="#approach">Cách học</Link>
          <Link href="#trust">An toàn</Link>
          <Link className="public-header__sign-in" href="/sign-in?returnTo=%2Ftoday">
            Đăng nhập
          </Link>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="public-hero">
          <div className="public-hero__copy">
            <p className="public-eyebrow">Học ngôn ngữ cho người Việt</p>
            <h1>Học sâu hơn mỗi ngày, không bị cuốn vào điểm số ảo.</h1>
            <p className="public-hero__lead">
              Lộ trình tiếng Nhật theo trình độ, ôn tập có căn cứ và trợ lý AI hiểu cách người Việt
              học. Tiếng Trung và tiếng Hàn sẽ mở theo cổng chất lượng riêng.
            </p>
            <div className="public-hero__actions">
              <Link className="public-cta" href="/sign-in?returnTo=%2Ftoday">
                Vào không gian học
                <ArrowRight aria-hidden="true" size={19} />
              </Link>
              <a className="public-text-link" href="#approach">
                Xem cách nền tảng hoạt động
              </a>
            </div>
            <p className="public-hero__note">
              Closed beta cho người lớn · Không tự tạo tài khoản ngoài danh sách mời
            </p>
          </div>

          <div className="public-hero__visual" aria-label="Minh họa nhịp học ưu tiên nội dung">
            <div className="public-lesson-card">
              <p>Bài học kế tiếp</p>
              <span>Tiếng Nhật · lộ trình cá nhân</span>
              <h2>Một mục tiêu rõ trong khoảng thời gian vừa đủ</h2>
              <div>
                <span>Đọc</span>
                <span>Gợi nhớ</span>
                <span>Ôn có lịch</span>
              </div>
            </div>
            <div className="public-visual-caption">
              <ShieldCheck aria-hidden="true" size={21} />
              <p>
                <strong>Nội dung qua kiểm định</strong>
                <span>Bài nháp và khóa chấm không đi tới trình duyệt.</span>
              </p>
            </div>
          </div>
        </section>

        <section className="public-approach" id="approach" aria-labelledby="approach-title">
          <div className="public-section-heading">
            <p className="public-eyebrow">Ít nhiễu, nhiều căn cứ</p>
            <h2 id="approach-title">Một hệ học tập, ba lớp hỗ trợ.</h2>
          </div>
          <div className="public-feature-grid">
            <article>
              <span aria-hidden="true">
                <BookOpenCheck size={25} />
              </span>
              <h3>Lộ trình theo trình độ</h3>
              <p>JLPT N5–N1 trước; HSK và TOPIK mở khi nội dung đạt cổng phát hành.</p>
            </article>
            <article>
              <span aria-hidden="true">
                <Languages size={25} />
              </span>
              <h3>Giải thích bằng tiếng Việt</h3>
              <p>So sánh ngữ pháp, âm và lỗi thường gặp ở đúng bối cảnh người Việt.</p>
            </article>
            <article>
              <span aria-hidden="true">
                <Bot size={25} />
              </span>
              <h3>AI có ranh giới rõ</h3>
              <p>Gia sư AI cá nhân hóa sẽ nêu nguồn học, độ chắc chắn và cách thử lại.</p>
            </article>
          </div>
        </section>

        <section className="public-trust" id="trust" aria-labelledby="trust-title">
          <div>
            <p className="public-eyebrow">Thiết kế để tin cậy</p>
            <h2 id="trust-title">Tiến độ thật, trạng thái thật, quyền riêng tư nhìn thấy được.</h2>
          </div>
          <ul>
            <li>Không dùng dữ liệu mẫu để giả thành tích người học.</li>
            <li>AI key và đáp án nội bộ chỉ tồn tại ở server.</li>
            <li>Phiên đăng nhập dùng cookie server-side và phản hồi không cache.</li>
          </ul>
        </section>
      </main>

      <footer className="public-footer">
        <p>Ideogram Learning · tên làm việc trong giai đoạn closed beta</p>
        <Link href="/sign-in?returnTo=%2Ftoday">Đăng nhập an toàn</Link>
      </footer>
    </div>
  );
}
