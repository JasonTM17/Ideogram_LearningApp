'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';

import { createSignOutApiRequest } from '@ideogram/api-client';

import { clearOfflineMediaCache } from '@/lib/offline-media/browser-offline-media-cache';
import { clearBrowserSyncQueueStorage } from '@/lib/offline-sync/browser-sync-storage';
import { forgetRememberedSessionIdentity } from '@/lib/offline-sync/browser-session-identity';

import {
  broadcastWebSessionInvalidation,
  clearWebSyncSessionEpochs,
} from './web-session-invalidation';

export function SignOutButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const shouldFocusAfterErrorRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!isPending && shouldFocusAfterErrorRef.current) {
      shouldFocusAfterErrorRef.current = false;
      buttonRef.current?.focus();
    }
  }, [isPending]);

  const signOut = async () => {
    setErrorMessage(null);
    setIsPending(true);

    try {
      const request = createSignOutApiRequest();
      const response = await fetch(request.path, {
        body: JSON.stringify(request.body),
        headers: { 'Content-Type': 'application/json' },
        method: request.method,
      });

      if (!response.ok) {
        throw new Error('SIGN_OUT_FAILED');
      }

      await Promise.all([clearOfflineMediaCache(), clearBrowserSyncQueueStorage()]);
      forgetRememberedSessionIdentity(window.localStorage);
      clearWebSyncSessionEpochs();
      broadcastWebSessionInvalidation();
      window.location.assign('/');
    } catch {
      shouldFocusAfterErrorRef.current = true;
      setErrorMessage('Chưa thể đăng xuất. Vui lòng thử lại.');
      setIsPending(false);
    }
  };

  return (
    <div className="sign-out-control">
      <button disabled={isPending} onClick={signOut} ref={buttonRef} type="button">
        <LogOut aria-hidden="true" size={18} />
        {isPending ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </button>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
    </div>
  );
}
