import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { PrimaryAction } from '../../components/primary-action';
import { useMobileTheme } from '../../components/use-mobile-theme';
import {
  cacheNativeOfflineMediaAsset,
  readNativeOfflineMediaAssetUri,
  removeNativeOfflineMediaAsset,
} from '../../lib/offline-media/native-offline-media-cache';

import type { OfflineMediaAsset, OfflineMediaCacheNamespace } from '@ideogram/contracts';

type AssetState =
  | { kind: 'available' }
  | { kind: 'checking' }
  | { kind: 'downloading'; progress: number | null }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; uri: string };

const formatBytes = (bytes: number): string =>
  `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`;

export function NativeOfflineMediaAssetControl({
  asset,
  namespace,
}: {
  asset: OfflineMediaAsset;
  namespace: OfflineMediaCacheNamespace;
}) {
  const { theme } = useMobileTheme();
  const player = useAudioPlayer();
  const playerStatus = useAudioPlayerStatus(player);
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<AssetState>({ kind: 'checking' });

  useEffect(() => {
    let active = true;
    void readNativeOfflineMediaAssetUri(asset, namespace)
      .then((uri) => {
        if (active) setState(uri ? { kind: 'ready', uri } : { kind: 'available' });
      })
      .catch(() => {
        if (active) setState({ kind: 'available' });
      });
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [asset, namespace]);

  const play = (source: string) => {
    if (playerStatus.playing) {
      player.pause();
      return;
    }
    player.replace(source);
    player.play();
  };

  const download = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: 'downloading', progress: null });
    try {
      const uri = await cacheNativeOfflineMediaAsset(asset, namespace, {
        onProgress: (written, total) =>
          setState({
            kind: 'downloading',
            progress: total > 0 ? Math.min(100, Math.round((written / total) * 100)) : null,
          }),
        signal: controller.signal,
      });
      setState({ kind: 'ready', uri });
      await AccessibilityInfo.announceForAccessibility(
        'Bản nghe đã tải xong và sẵn sàng ngoại tuyến.',
      );
    } catch (error) {
      if (controller.signal.aborted) {
        setState({ kind: 'available' });
        await AccessibilityInfo.announceForAccessibility(
          'Đã hủy tải. Phần chưa hoàn chỉnh đã được xóa.',
        );
      } else {
        const message =
          error instanceof Error && error.message.toLowerCase().includes('full')
            ? 'Thiết bị không đủ dung lượng. Xóa một bản tải khác rồi thử lại.'
            : 'Không thể tải bản nghe. Kiểm tra kết nối rồi thử lại.';
        setState({ kind: 'error', message });
        await AccessibilityInfo.announceForAccessibility(message);
      }
    } finally {
      abortRef.current = null;
    }
  };

  const confirmRemove = () =>
    Alert.alert('Xóa bản nghe đã tải?', 'Bạn vẫn có thể tải lại khi có mạng.', [
      { style: 'cancel', text: 'Giữ lại' },
      {
        onPress: () => {
          player.pause();
          removeNativeOfflineMediaAsset(asset, namespace);
          setState({ kind: 'available' });
          void AccessibilityInfo.announceForAccessibility('Đã xóa bản tải khỏi thiết bị.');
        },
        style: 'destructive',
        text: 'Xóa bản tải',
      },
    ]);

  return (
    <View
      accessibilityLiveRegion={state.kind === 'error' ? 'assertive' : 'polite'}
      style={[
        styles.card,
        { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
      ]}
    >
      <View style={styles.heading}>
        <Ionicons color={theme.color.actionSecondary} name="volume-medium-outline" size={24} />
        <View style={styles.copy}>
          <AppText variant="headingMd">{asset.titleVietnamese}</AppText>
          <AppText tone="secondary">{formatBytes(asset.sizeBytes)}</AppText>
        </View>
      </View>
      {state.kind === 'downloading' ? (
        <>
          <AppText tone="secondary">
            {state.progress === null ? 'Đang tải và kiểm tra tệp…' : `Đã tải ${state.progress}%`}
          </AppText>
          <Pressable
            accessibilityHint="Dừng tải và xóa phần tệp chưa hoàn chỉnh"
            accessibilityLabel="Hủy tải bản nghe"
            accessibilityRole="button"
            onPress={() => abortRef.current?.abort()}
            style={styles.textAction}
          >
            <AppText tone="action" variant="label">
              Hủy tải
            </AppText>
          </Pressable>
        </>
      ) : null}
      {state.kind === 'checking' ? (
        <AppText tone="secondary">Đang kiểm tra bản tải trên thiết bị…</AppText>
      ) : null}
      {state.kind === 'error' ? <AppText tone="danger">{state.message}</AppText> : null}
      {state.kind === 'ready' ? (
        <>
          <AppText tone="success">Đã tải về thiết bị và kiểm tra toàn vẹn.</AppText>
          <PrimaryAction
            accessibilityHint="Phát hoặc tạm dừng bản nghe đã tải"
            label={playerStatus.playing ? 'Tạm dừng' : 'Phát bản đã tải'}
            onPress={() => play(state.uri)}
          />
          <PrimaryAction
            accessibilityHint="Mở xác nhận xóa bản nghe khỏi thiết bị"
            label="Xóa bản tải"
            onPress={confirmRemove}
            variant="secondary"
          />
        </>
      ) : (
        state.kind !== 'downloading' &&
        state.kind !== 'checking' && (
          <>
            <PrimaryAction
              accessibilityHint="Phát hoặc tạm dừng bản nghe qua mạng"
              label={playerStatus.playing ? 'Tạm dừng' : 'Nghe trực tuyến'}
              onPress={() => play(asset.url)}
              variant="secondary"
            />
            <PrimaryAction
              accessibilityHint="Tải và kiểm tra bản nghe để dùng khi không có mạng"
              label={state.kind === 'error' ? 'Thử tải lại' : 'Tải để nghe ngoại tuyến'}
              onPress={() => void download()}
            />
          </>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[3],
    padding: nativeLayoutTokens.spacing[4],
  },
  copy: { flex: 1, gap: nativeLayoutTokens.spacing[1], minWidth: 0 },
  heading: { alignItems: 'flex-start', flexDirection: 'row', gap: nativeLayoutTokens.spacing[3] },
  textAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[2],
  },
});
