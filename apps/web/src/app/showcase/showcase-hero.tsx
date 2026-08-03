import Link from 'next/link';
import { ArrowRight, CheckCircle2, Code2 } from 'lucide-react';

import { sourceRepositoryUrl } from './showcase-content';

export function ShowcaseHeader() {
  return (
    <header className="showcase-header">
      <Link className="showcase-brand" href="/" aria-label="Ideogram Learning, trang chủ">
        <span aria-hidden="true">I</span>
        <span>
          <strong>Ideogram Learning</strong>
          <small>Project tour · Japanese-first beta</small>
        </span>
      </Link>
      <nav aria-label="Điều hướng project tour">
        <a href="#evidence">Visual</a>
        <a href="#scope">Phạm vi</a>
        <a className="showcase-header__source" href={sourceRepositoryUrl}>
          <Code2 aria-hidden="true" size={17} />
          Mã nguồn
        </a>
      </nav>
    </header>
  );
}

export function ShowcaseHero() {
  return (
    <section className="showcase-hero" aria-labelledby="showcase-title">
      <div className="showcase-hero__copy">
        <p className="showcase-kicker">Case study độc lập · Không cần đăng nhập để xem</p>
        <h1 id="showcase-title">Một nền tảng học ngôn ngữ được xây như một sản phẩm thật.</h1>
        <p>
          Đây là bản tour để xem kiến trúc, luồng học đầu tiên và ranh giới kỹ thuật của Ideogram
          Learning mà không cần database, AI key hay tài khoản beta.
        </p>
        <div className="showcase-hero__actions">
          <a className="showcase-action showcase-action--primary" href="#evidence">
            Xem bằng chứng triển khai
            <ArrowRight aria-hidden="true" size={19} />
          </a>
          <Link
            className="showcase-action showcase-action--secondary"
            href="/sign-in?returnTo=%2Ftoday"
          >
            Mở beta có xác thực
          </Link>
        </div>
        <p className="showcase-hero__note">
          Luồng beta cần email đã được mời; trang này chỉ mô tả phần có trong repository.
        </p>
      </div>

      <aside className="showcase-proof" aria-label="Tóm tắt kỹ thuật đã triển khai">
        <p>Đã kiểm chứng trong repo</p>
        <ul>
          <li>
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>Next.js · Expo · pnpm workspace</span>
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>Supabase Auth/Postgres/RLS boundary</span>
          </li>
          <li>
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>Typed contracts · tests · CI · GHCR image</span>
          </li>
        </ul>
      </aside>
    </section>
  );
}
