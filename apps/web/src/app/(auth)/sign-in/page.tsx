import Link from 'next/link';
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react';

import { SignInForm } from '@/features/auth/sign-in-form';

import { normalizeWebAuthReturnPath } from '@ideogram/contracts';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  description: 'Đăng nhập closed beta bằng liên kết email dùng một lần.',
  title: 'Đăng nhập',
};

const callbackFailureMessages: Readonly<Record<string, string>> = {
  authorization_denied: 'Yêu cầu đăng nhập đã bị hủy. Bạn có thể thử lại.',
  account_unavailable:
    'Tài khoản hiện chưa thể truy cập không gian học. Vui lòng liên hệ người phụ trách beta để được hỗ trợ.',
  bearer_token_in_callback: 'Liên kết đăng nhập không đúng định dạng an toàn.',
  exchange_failed: 'Liên kết không còn hiệu lực hoặc đã được sử dụng.',
  invalid_callback: 'Liên kết đăng nhập không hợp lệ.',
  missing_code: 'Liên kết đăng nhập thiếu mã xác nhận.',
  request_failed: 'Chưa thể gửi liên kết đăng nhập. Vui lòng thử lại sau.',
  service_unavailable: 'Dịch vụ đăng nhập đang gián đoạn. Vui lòng thử lại sau.',
};

const readSingleValue = (value: string | string[] | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const readSafeReturnPath = (value: string | undefined): string => {
  try {
    return normalizeWebAuthReturnPath(value ?? '/today');
  } catch {
    return '/today';
  }
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const reason = readSingleValue(query.reason);
  const callbackMessage = reason ? callbackFailureMessages[reason] : undefined;
  const returnTo = readSafeReturnPath(readSingleValue(query.returnTo));
  const initiallyAccepted = !callbackMessage && readSingleValue(query.sent) === '1';

  return (
    <main className="auth-page" id="main-content" tabIndex={-1}>
      <section className="auth-page__intro">
        <Link href="/">
          <ArrowLeft aria-hidden="true" size={18} />
          Về trang giới thiệu
        </Link>
        <div>
          <p className="public-eyebrow">Closed beta</p>
          <h1>Tiếp tục nhịp học của bạn.</h1>
          <p>
            Nhập email trong danh sách mời. Hệ thống sẽ gửi liên kết dùng một lần và không tiết lộ
            email có tài khoản hay chưa.
          </p>
        </div>
        <ul>
          <li>
            <ShieldCheck aria-hidden="true" size={20} />
            Không tự tạo tài khoản ngoài danh sách phê duyệt
          </li>
          <li>
            <LockKeyhole aria-hidden="true" size={20} />
            Phiên lưu trong cookie server-side được siết thuộc tính
          </li>
        </ul>
      </section>

      <section className="auth-card" aria-labelledby="sign-in-heading">
        <div className="auth-card__heading">
          <span aria-hidden="true">I</span>
          <div>
            <p>Ideogram Learning</p>
            <h2 id="sign-in-heading">Đăng nhập bằng email</h2>
          </div>
        </div>
        {callbackMessage ? (
          <p className="auth-callback-error" role="alert">
            {callbackMessage}
          </p>
        ) : null}
        <SignInForm initiallyAccepted={initiallyAccepted} returnTo={returnTo} />
        <p className="auth-card__privacy">
          Khi tiếp tục, bạn chỉ yêu cầu một phiên đăng nhập. Dữ liệu học và cấu hình AI không được
          đưa vào email.
        </p>
      </section>
    </main>
  );
}
