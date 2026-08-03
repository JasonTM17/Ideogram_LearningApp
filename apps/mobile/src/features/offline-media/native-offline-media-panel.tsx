import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { StatusPanel } from '../../components/status-panel';
import { createMobileNativeLearningApiClient } from '../../lib/api/native-learning-api-client';
import { useNativeAuthSession } from '../auth/native-auth-session-provider';
import { NativeOfflineMediaAssetControl } from './native-offline-media-asset-control';

import type { OfflineMediaManifest } from '@ideogram/contracts';

type PanelState =
  | { kind: 'error' }
  | { kind: 'loading' }
  | { kind: 'ready'; manifest: OfflineMediaManifest; userId: string };

export function NativeOfflineMediaPanel() {
  const auth = useNativeAuthSession();
  const [state, setState] = useState<PanelState>({ kind: 'loading' });

  useEffect(() => {
    let active = true;
    void Promise.all([
      createMobileNativeLearningApiClient(auth.sessionProvider).getOfflineMediaManifest(),
      auth.sessionProvider(),
    ])
      .then(([manifest, session]) => {
        if (!active) return;
        if (!session) throw new Error('SESSION_UNAVAILABLE');
        setState({ kind: 'ready', manifest, userId: session.userId });
      })
      .catch(() => {
        if (active) setState({ kind: 'error' });
      });
    return () => {
      active = false;
    };
  }, [auth.sessionEpoch, auth.sessionProvider]);

  if (state.kind === 'loading') {
    return (
      <StatusPanel
        description="Đang kiểm tra bản nghe có thể tải cho tài khoản này."
        title="Đang kiểm tra nội dung ngoại tuyến"
        variant="loading"
      />
    );
  }
  if (state.kind === 'error') {
    return (
      <StatusPanel
        description="Chưa thể đọc danh sách bản nghe. Dữ liệu trên thiết bị không bị thay đổi."
        title="Nội dung ngoại tuyến tạm thời chưa sẵn sàng"
        variant="error"
      />
    );
  }

  const assets = state.manifest.releases.flatMap((release) => release.assets);
  if (assets.length === 0) {
    return (
      <StatusPanel
        description="Bạn vẫn có thể học các phần khác. Mục tải sẽ xuất hiện khi audio đã được duyệt."
        title="Bản nghe chưa được phát hành"
        variant="empty"
      />
    );
  }

  return (
    <View style={styles.list}>
      <AppText variant="headingMd">Bản nghe ngoại tuyến</AppText>
      {assets.map((asset) => (
        <NativeOfflineMediaAssetControl
          asset={asset}
          key={asset.assetId}
          namespace={{ contentReleaseId: asset.contentReleaseId, userId: state.userId }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ list: { gap: nativeLayoutTokens.spacing[3] } });
