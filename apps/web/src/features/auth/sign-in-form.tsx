'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react';

import { createEmailOtpApiRequest } from '@ideogram/api-client';
import { genericEmailOtpAcceptedMessage } from '@ideogram/contracts';

import { requestEmailOtpFormAction } from './email-otp-form-action';

import type { FormEvent } from 'react';

interface SignInFormProps {
  initiallyAccepted?: boolean;
  returnTo: string;
}

export function SignInForm({ initiallyAccepted = false, returnTo }: SignInFormProps) {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const shouldFocusEmailAfterResetRef = useRef(false);
  const shouldFocusSubmitAfterErrorRef = useRef(false);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState(initiallyAccepted);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (isAccepted) {
      successHeadingRef.current?.focus();
      return;
    }

    if (shouldFocusEmailAfterResetRef.current) {
      shouldFocusEmailAfterResetRef.current = false;
      emailInputRef.current?.focus();
    }
  }, [isAccepted]);

  useEffect(() => {
    if (!isPending && shouldFocusSubmitAfterErrorRef.current) {
      shouldFocusSubmitAfterErrorRef.current = false;
      submitButtonRef.current?.focus();
    }
  }, [isPending]);

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    let request: ReturnType<typeof createEmailOtpApiRequest>;
    try {
      request = createEmailOtpApiRequest({ email, returnTo });
    } catch {
      setErrorMessage('Hãy nhập một địa chỉ email hợp lệ.');
      emailInputRef.current?.focus();
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(request.path, {
        body: JSON.stringify(request.body),
        headers: { 'Content-Type': 'application/json' },
        method: request.method,
      });

      if (!response.ok) {
        throw new Error('EMAIL_OTP_REQUEST_FAILED');
      }

      setIsAccepted(true);
    } catch {
      shouldFocusSubmitAfterErrorRef.current = true;
      setErrorMessage('Chưa thể gửi liên kết đăng nhập. Vui lòng thử lại sau.');
      setIsPending(false);
    }
  };

  if (isAccepted) {
    return (
      <section className="sign-in-success" role="status">
        <span aria-hidden="true">
          <CheckCircle2 size={27} />
        </span>
        <div>
          <p>Yêu cầu đã được tiếp nhận</p>
          <h2 ref={successHeadingRef} tabIndex={-1}>
            Kiểm tra hộp thư của bạn
          </h2>
          <p>{genericEmailOtpAcceptedMessage}</p>
          <button
            onClick={() => {
              shouldFocusEmailAfterResetRef.current = true;
              setIsAccepted(false);
              setIsPending(false);
            }}
            type="button"
          >
            Dùng email khác
          </button>
        </div>
      </section>
    );
  }

  return (
    <form
      action={requestEmailOtpFormAction}
      aria-busy={isPending}
      className="sign-in-form"
      noValidate
      onSubmit={submitEmail}
    >
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="sign-in-field">
        <label htmlFor="email">Email đã được mời</label>
        <div className="sign-in-input-wrap">
          <Mail aria-hidden="true" size={19} />
          <input
            aria-describedby={errorMessage ? 'email-help email-error' : 'email-help'}
            aria-invalid={errorMessage ? 'true' : 'false'}
            autoComplete="email"
            disabled={isPending}
            id="email"
            inputMode="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ban@example.com…"
            ref={emailInputRef}
            required
            spellCheck={false}
            type="email"
            value={email}
          />
        </div>
        <p id="email-help">Liên kết đăng nhập dùng một lần; không cần mật khẩu.</p>
        {errorMessage ? (
          <p id="email-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <button disabled={isPending} ref={submitButtonRef} type="submit">
        {isPending ? 'Đang gửi…' : 'Gửi liên kết đăng nhập'}
        <ArrowRight aria-hidden="true" size={19} />
      </button>
    </form>
  );
}
