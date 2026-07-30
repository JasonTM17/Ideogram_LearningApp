import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SignInForm } from './sign-in-form';

describe('SignInForm', () => {
  it('renders an accessible invite-only email request without account-enumeration copy', () => {
    const markup = renderToStaticMarkup(
      createElement(SignInForm, {
        returnTo: '/today',
      }),
    );

    expect(markup).toContain('Email đã được mời');
    expect(markup).toContain('autoComplete="email"');
    expect(markup).toContain('name="returnTo"');
    expect(markup).toContain('value="/today"');
    expect(markup).not.toContain('action="/api/v1/auth/email-otp"');
    expect(markup).toContain('Liên kết đăng nhập dùng một lần');
    expect(markup).not.toContain('Tạo tài khoản');
    expect(markup).not.toContain('Email chưa tồn tại');
  });

  it('renders the generic accepted state after a progressively enhanced submission', () => {
    const markup = renderToStaticMarkup(
      createElement(SignInForm, {
        initiallyAccepted: true,
        returnTo: '/today',
      }),
    );

    expect(markup).toContain('Yêu cầu đã được tiếp nhận');
    expect(markup).toContain('Kiểm tra hộp thư của bạn');
    expect(markup).not.toContain('minh@example.test');
  });
});
