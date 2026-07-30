import { CircleUserRound, Languages, LockKeyhole, Mail } from 'lucide-react';

import { SignOutButton } from '@/features/auth/sign-out-button';
import { PageHeading } from '@/components/ui/page-heading';

interface ProfileViewProps {
  email: string | null;
}

export function ProfileView({ email }: ProfileViewProps) {
  return (
    <div className="profile-view">
      <PageHeading
        description="Quản lý phiên đăng nhập, ưu tiên ngôn ngữ và các lựa chọn riêng tư từ một nơi."
        eyebrow="Bạn"
        title="Không gian học của bạn"
      />

      <section className="profile-card" aria-labelledby="account-heading">
        <div className="profile-card__heading">
          <span aria-hidden="true">
            <CircleUserRound size={25} />
          </span>
          <div>
            <p>Tài khoản closed beta</p>
            <h2 id="account-heading">Phiên đã được xác minh</h2>
          </div>
        </div>

        <dl className="profile-details">
          <div>
            <dt>
              <Mail aria-hidden="true" size={18} />
              Email
            </dt>
            <dd>{email ?? 'Không có email công khai trong phiên này'}</dd>
          </div>
          <div>
            <dt>
              <Languages aria-hidden="true" size={18} />
              Ngôn ngữ ưu tiên
            </dt>
            <dd>Tiếng Nhật · Japanese-first beta</dd>
          </div>
          <div>
            <dt>
              <LockKeyhole aria-hidden="true" size={18} />
              Bảo vệ phiên
            </dt>
            <dd>Cookie server-side · phản hồi riêng tư, không cache</dd>
          </div>
        </dl>

        <div className="profile-card__footer">
          <div>
            <h3>Kết thúc phiên trên thiết bị này</h3>
            <p>Bạn có thể đăng nhập lại bằng liên kết dùng một lần trong email.</p>
          </div>
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
