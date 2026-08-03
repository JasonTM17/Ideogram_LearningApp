'use client';

import { useBrowserOfflineSync } from './browser-offline-sync-provider';
import { useState } from 'react';

export function BrowserOfflineSyncIndicator() {
  const { blockedCount, discardBlocked, pendingCount, retryBlocked, syncNow } =
    useBrowserOfflineSync();
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState(false);
  if (pendingCount === 0 && blockedCount === 0) return null;
  const discard = async () => {
    if (!window.confirm(`Bỏ ${blockedCount} thay đổi bị chặn? Hành động này không thể hoàn tác.`)) {
      return;
    }
    setDiscardError(false);
    setIsDiscarding(true);
    try {
      await discardBlocked();
    } catch {
      setDiscardError(true);
    } finally {
      setIsDiscarding(false);
    }
  };
  return (
    <aside
      aria-live={blockedCount > 0 ? 'assertive' : 'polite'}
      className="browser-offline-sync-indicator"
      role="status"
    >
      <span>
        {blockedCount > 0
          ? `${blockedCount} thay đổi cần bạn xử lý; ${pendingCount} thay đổi khác đang chờ.`
          : `${pendingCount} thay đổi đang chờ đồng bộ.`}
      </span>
      <div className="browser-offline-sync-indicator__actions">
        {blockedCount > 0 ? (
          <>
            <button onClick={() => void retryBlocked()} type="button">
              Thử lại mục lỗi
            </button>
            <button
              className="browser-offline-sync-indicator__discard"
              disabled={isDiscarding}
              onClick={() => void discard()}
              type="button"
            >
              Bỏ mục lỗi
            </button>
          </>
        ) : (
          <button onClick={() => void syncNow()} type="button">
            Đồng bộ ngay
          </button>
        )}
      </div>
      {discardError ? <p role="alert">Chưa thể bỏ mục lỗi. Vui lòng thử lại.</p> : null}
    </aside>
  );
}
