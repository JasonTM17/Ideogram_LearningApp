import { editorialTokens } from '@ideogram/design-tokens';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section className="space-y-6">
        <p className="text-sm font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
          Internal beta foundation
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Ideogram Learning</h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-700">
          Nền tảng học tiếng Nhật, Trung và Hàn dành cho người Việt. Web shell này xác nhận
          workspace, API contract và design tokens trước khi các flow học tập được triển khai.
        </p>
        <div
          className="rounded-2xl border border-black/10 p-5 text-sm leading-6"
          style={{ backgroundColor: editorialTokens.color.sage }}
        >
          <strong>Đang xây dựng:</strong> placement theo trình độ, bài học retrieval, SRS, AI tutor,
          luyện nói/viết, offline sync và tiến độ học.
        </div>
      </section>
    </main>
  );
}
