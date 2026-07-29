import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Be_Vietnam_Pro, Noto_Sans_JP } from 'next/font/google';

import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-ui',
  weight: ['400', '500', '600', '700'],
});

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-learning-jp',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  applicationName: 'Ideogram Learning',
  description:
    'Nền tảng học tiếng Nhật dành cho người Việt với bài học ngắn, ôn tập có căn cứ và shell giao diện ưu tiên khả năng đọc.',
  title: {
    default: 'Ideogram Learning',
    template: '%s | Ideogram Learning',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${notoSansJp.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Bỏ qua điều hướng và chuyển tới nội dung chính
        </a>
        {children}
      </body>
    </html>
  );
}
