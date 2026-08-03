'use client';

import { CloudOff, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { offlineMediaManifestSchema } from '@ideogram/contracts';

import { OfflineMediaAssetControl } from './offline-media-asset-control';

import type { OfflineMediaManifest } from '@ideogram/contracts';

type ViewState =
  | { kind: 'error' }
  | { kind: 'loading' }
  | { kind: 'ready'; manifest: OfflineMediaManifest; userId: string };

const loadSettings = async (): Promise<Extract<ViewState, { kind: 'ready' }>> => {
  const [manifestResponse, sessionResponse] = await Promise.all([
    fetch('/api/v1/learning/offline-media', { cache: 'no-store', credentials: 'same-origin' }),
    fetch('/api/v1/auth/session', { cache: 'no-store', credentials: 'same-origin' }),
  ]);
  if (!manifestResponse.ok || !sessionResponse.ok) throw new Error('OFFLINE_MEDIA_UNAVAILABLE');
  const session = (await sessionResponse.json()) as { userId?: unknown };
  if (typeof session.userId !== 'string') throw new Error('OFFLINE_MEDIA_SESSION_INVALID');
  return {
    kind: 'ready',
    manifest: offlineMediaManifestSchema.parse(await manifestResponse.json()),
    userId: session.userId,
  };
};

export function OfflineMediaSettings() {
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const load = useCallback(() => {
    setState({ kind: 'loading' });
    void loadSettings()
      .then(setState)
      .catch(() => setState({ kind: 'error' }));
  }, []);

  useEffect(() => {
    let active = true;
    void loadSettings()
      .then((nextState) => {
        if (active) setState(nextState);
      })
      .catch(() => {
        if (active) setState({ kind: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  const assets =
    state.kind === 'ready' ? state.manifest.releases.flatMap((release) => release.assets) : [];

  return (
    <section aria-labelledby="offline-media-settings-title" className="offline-media-settings">
      <header>
        <p>Cài đặt ngoại tuyến</p>
        <h2 id="offline-media-settings-title">Bản nghe trên thiết bị</h2>
        <span>Tệp chỉ được đánh dấu sẵn sàng sau khi kiểm tra dung lượng và SHA-256.</span>
      </header>
      {state.kind === 'loading' ? <p role="status">Đang kiểm tra nội dung có thể tải…</p> : null}
      {state.kind === 'error' ? (
        <div role="alert">
          <p>Chưa thể đọc danh sách bản nghe. Dữ liệu đã tải trên thiết bị không bị thay đổi.</p>
          <button onClick={load} type="button">
            <RefreshCw aria-hidden="true" size={17} /> Thử lại
          </button>
        </div>
      ) : null}
      {state.kind === 'ready' && assets.length === 0 ? (
        <div className="offline-media-settings__empty" role="status">
          <CloudOff aria-hidden="true" size={24} />
          <div>
            <h3>Bản nghe chưa được phát hành</h3>
            <p>
              Bạn vẫn có thể học các phần khác. Mục tải sẽ tự xuất hiện khi audio đã được duyệt.
            </p>
          </div>
        </div>
      ) : null}
      {state.kind === 'ready' && assets.length > 0 ? (
        <div className="offline-media-settings__assets">
          {assets.map((asset) => (
            <OfflineMediaAssetControl asset={asset} key={asset.assetId} userId={state.userId} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
