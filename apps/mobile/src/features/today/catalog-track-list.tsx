import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';

import type { CatalogTrack } from './catalog-track-presentation';

interface CatalogTrackListProps {
  onSelect: (lessonId: string) => void;
  tracks: CatalogTrack[];
}

export function CatalogTrackList({ onSelect, tracks }: CatalogTrackListProps) {
  const { theme } = useMobileTheme();

  return (
    <View style={styles.list}>
      <View style={styles.heading}>
        <AppText variant="headingMd">Lộ trình đã xuất bản</AppText>
        <AppText tone="secondary">Chọn một cấp độ để xem bài học trong lộ trình đó.</AppText>
      </View>
      {tracks.map((track) => (
        <Pressable
          key={track.contentReleaseId}
          accessibilityHint={`Mở lộ trình ${track.releaseTitle}`}
          accessibilityLabel={`${track.languageName} ${track.levelCode}, ${track.releaseTitle}`}
          accessibilityRole="button"
          onPress={() => onSelect(track.firstLessonId)}
          style={({ pressed }) => [
            styles.track,
            {
              backgroundColor: theme.color.surface,
              borderColor: theme.color.borderSubtle,
              opacity: pressed ? 0.72 : 1,
            },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: theme.color.surfaceSubtle }]}>
            <Ionicons
              color={theme.color.actionPrimary}
              name="layers-outline"
              size={22}
              importantForAccessibility="no-hide-descendants"
            />
          </View>
          <View style={styles.copy}>
            <AppText tone="action" variant="label">
              {`${track.languageName} · ${track.levelCode}`.toLocaleUpperCase('vi')}
            </AppText>
            <AppText variant="headingMd">{track.releaseTitle}</AppText>
            <AppText tone="tertiary" variant="caption">
              {`${track.unitCount} chặng · ${track.lessonCount} bài · ${track.totalMinutes} phút`}
            </AppText>
          </View>
          <Ionicons
            color={theme.color.textTertiary}
            name="chevron-forward"
            size={20}
            importantForAccessibility="no-hide-descendants"
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: nativeLayoutTokens.spacing[1],
    minWidth: 0,
  },
  heading: {
    gap: nativeLayoutTokens.spacing[1],
  },
  icon: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.chip,
    height: nativeLayoutTokens.touchTarget.android,
    justifyContent: 'center',
    width: nativeLayoutTokens.touchTarget.android,
  },
  list: {
    gap: nativeLayoutTokens.spacing[3],
  },
  track: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[3],
    minHeight: nativeLayoutTokens.touchTarget.android,
    padding: nativeLayoutTokens.spacing[3],
  },
});
