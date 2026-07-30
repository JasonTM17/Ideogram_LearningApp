import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { useMobileTheme } from './use-mobile-theme';

export interface FeatureListItem {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

interface FeatureListCardProps {
  items: readonly FeatureListItem[];
  title: string;
}

export function FeatureListCard({ items, title }: FeatureListCardProps) {
  const { theme } = useMobileTheme();

  return (
    <View style={styles.section}>
      <AppText tone="secondary" variant="label">
        {title.toLocaleUpperCase('vi')}
      </AppText>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
        ]}
      >
        {items.map((item, index) => (
          <View
            key={item.label}
            style={[
              styles.row,
              index > 0 ? { borderTopColor: theme.color.borderSubtle, borderTopWidth: 1 } : null,
            ]}
          >
            <View
              importantForAccessibility="no-hide-descendants"
              style={[styles.icon, { backgroundColor: theme.color.surfaceSubtle }]}
            >
              <Ionicons color={theme.color.actionSecondary} name={item.icon} size={22} />
            </View>
            <View style={styles.copy}>
              <AppText variant="label">{item.label}</AppText>
              <AppText tone="secondary" variant="bodySm">
                {item.description}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    overflow: 'hidden',
  },
  copy: {
    flex: 1,
    gap: nativeLayoutTokens.spacing[1],
    minWidth: 0,
  },
  icon: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.chip,
    height: nativeLayoutTokens.touchTarget.android,
    justifyContent: 'center',
    width: nativeLayoutTokens.touchTarget.android,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[3],
    minHeight: nativeLayoutTokens.touchTarget.android,
    padding: nativeLayoutTokens.spacing[4],
  },
  section: {
    gap: nativeLayoutTokens.spacing[3],
  },
});
