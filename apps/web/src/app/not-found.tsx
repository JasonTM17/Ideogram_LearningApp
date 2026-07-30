import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <main className="not-found-page" id="main-content" tabIndex={-1}>
      <span aria-hidden="true">
        <SearchX size={30} />
      </span>
      <p>404 · Không tìm thấy</p>
      <h1>Nội dung này chưa được phát hành hoặc không còn tồn tại.</h1>
      <Link href="/today">
        <ArrowLeft aria-hidden="true" size={18} />
        Về Hôm nay
      </Link>
    </main>
  );
}
