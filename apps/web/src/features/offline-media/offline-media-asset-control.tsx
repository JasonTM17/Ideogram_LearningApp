'use client';

import { CheckCircle2, Download, LoaderCircle, Trash2, Volume2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  cacheOfflineMediaAsset,
  listOfflineMediaAssets,
  readOfflineMediaAsset,
  removeOfflineMediaAsset,
} from '@/lib/offline-media/browser-offline-media-cache';

import type { OfflineMediaAsset, OfflineMediaCacheNamespace } from '@ideogram/contracts';

type AssetState =
  | { kind: 'available' }
  | { kind: 'checking' }
  | { kind: 'downloading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; playbackUrl: string }
  | { kind: 'removing'; playbackUrl: string };

const formatBytes = (bytes: number): string =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024) + ' MB';

const describeDownloadError = (error: unknown): string => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('quota') || message.includes('full')) {
    return 'Thiết bị không đủ dung lượng. Hãy xóa một bản tải khác rồi thử lại.';
  }
  if (message.includes('checksum') || message.includes('size')) {
    return 'Bản tải không hợp lệ. Tệp chưa hoàn chỉnh đã được xóa.';
  }
  return 'Không thể tải bản nghe. Kiểm tra kết nối rồi thử lại.';
};

export function OfflineMediaAssetControl({
  asset,
  userId,
}: {
  asset: OfflineMediaAsset;
  userId: string;
}) {
  const namespace: OfflineMediaCacheNamespace = useMemo(
    () => ({ contentReleaseId: asset.contentReleaseId, userId }),
    [asset.contentReleaseId, userId],
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const playbackUrlRef = useRef<string | null>(null);
  const [state, setState] = useState<AssetState>({ kind: 'checking' });

  const releasePlaybackUrl = useCallback(() => {
    if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
    playbackUrlRef.current = null;
  }, []);

  const inspectCache = useCallback(async () => {
    const records = await listOfflineMediaAssets(namespace);
    if (!records.some((record) => record.assetId === asset.assetId)) {
      releasePlaybackUrl();
      setState({ kind: 'available' });
      return;
    }
    const response = await readOfflineMediaAsset(asset, namespace);
    if (!response) {
      setState({ kind: 'available' });
      return;
    }
    releasePlaybackUrl();
    const playbackUrl = URL.createObjectURL(await response.blob());
    playbackUrlRef.current = playbackUrl;
    setState({ kind: 'ready', playbackUrl });
  }, [asset, namespace, releasePlaybackUrl]);

  useEffect(() => {
    const inspection = window.setTimeout(() => {
      void inspectCache().catch(() => setState({ kind: 'available' }));
    }, 0);
    return () => {
      window.clearTimeout(inspection);
      abortControllerRef.current?.abort();
      releasePlaybackUrl();
    };
  }, [inspectCache, releasePlaybackUrl]);

  const download = async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setState({ kind: 'downloading' });
    try {
      await cacheOfflineMediaAsset(asset, namespace, { signal: controller.signal });
      await inspectCache();
    } catch (error) {
      setState(
        controller.signal.aborted
          ? { kind: 'available' }
          : { kind: 'error', message: describeDownloadError(error) },
      );
    } finally {
      abortControllerRef.current = null;
    }
  };

  const remove = async () => {
    if (!window.confirm('Xóa bản nghe đã tải? Bạn vẫn có thể tải lại khi có mạng.')) return;
    const playbackUrl = state.kind === 'ready' ? state.playbackUrl : '';
    setState({ kind: 'removing', playbackUrl });
    try {
      await removeOfflineMediaAsset(asset.assetId, namespace);
      releasePlaybackUrl();
      setState({ kind: 'available' });
    } catch {
      setState({ kind: 'error', message: 'Chưa thể xóa bản tải. Vui lòng thử lại.' });
    }
  };

  return (
    <article
      aria-busy={state.kind === 'checking' || state.kind === 'downloading'}
      className="offline-media-asset"
    >
      <div className="offline-media-asset__heading">
        {state.kind === 'ready' || state.kind === 'removing' ? (
          <CheckCircle2 aria-hidden="true" />
        ) : (
          <Volume2 aria-hidden="true" />
        )}
        <div>
          <h3>{asset.titleVietnamese}</h3>
          <p>{formatBytes(asset.sizeBytes)}</p>
        </div>
      </div>

      {state.kind === 'checking' ? <p role="status">Đang kiểm tra bản tải trên thiết bị…</p> : null}
      {state.kind === 'downloading' ? (
        <div aria-live="polite">
          <p>Đang tải và kiểm tra tệp…</p>
          <progress aria-label={`Đang tải ${asset.titleVietnamese}`} />
          <button onClick={() => abortControllerRef.current?.abort()} type="button">
            <X aria-hidden="true" size={17} /> Hủy tải
          </button>
        </div>
      ) : null}
      {state.kind === 'available' || state.kind === 'error' ? (
        <>
          {state.kind === 'error' ? (
            <p role="alert">{state.message}</p>
          ) : (
            <p>Có thể nghe trực tuyến khi đang kết nối mạng.</p>
          )}
          <audio controls preload="none" src={asset.url}>
            Trình duyệt không hỗ trợ phát audio.
          </audio>
          <button onClick={() => void download()} type="button">
            <Download aria-hidden="true" size={17} />
            {state.kind === 'error' ? 'Thử tải lại' : 'Tải để nghe khi không có mạng'}
          </button>
        </>
      ) : null}
      {state.kind === 'ready' ? (
        <div aria-live="polite">
          <p>Đã tải về thiết bị và kiểm tra toàn vẹn.</p>
          <audio controls preload="metadata" src={state.playbackUrl}>
            Trình duyệt không hỗ trợ phát audio.
          </audio>
          <button
            className="offline-media-asset__remove"
            onClick={() => void remove()}
            type="button"
          >
            <Trash2 aria-hidden="true" size={17} /> Xóa bản tải
          </button>
        </div>
      ) : null}
      {state.kind === 'removing' ? (
        <p aria-live="polite">
          <LoaderCircle aria-hidden="true" className="offline-media-asset__spinner" size={17} />
          Đang xóa bản tải…
        </p>
      ) : null}
    </article>
  );
}
