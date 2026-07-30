import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { PrimaryAction } from './primary-action';
import { statusPanelDefaults, type StatusPanelVariant } from './status-panel-config';
import { useMobileTheme } from './use-mobile-theme';

interface StatusPanelProps {
  actionHint?: string;
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
  variant: StatusPanelVariant;
}

export function StatusPanel({
  actionHint,
  actionLabel,
  description,
  onAction,
  title,
  variant,
}: StatusPanelProps) {
  const { theme } = useMobileTheme();
  const preset = statusPanelDefaults[variant];
  const accentColor =
    variant === 'error'
      ? theme.color.danger
      : variant === 'offline'
        ? theme.color.warning
        : theme.color.actionSecondary;

  return (
    <View
      accessibilityLiveRegion={
        variant === 'error' || variant === 'offline' ? 'assertive' : 'polite'
      }
      style={[
        styles.panel,
        { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
      ]}
    >
      <View style={styles.heading}>
        <View
          importantForAccessibility="no-hide-descendants"
          style={[styles.icon, { backgroundColor: theme.color.surfaceSubtle }]}
        >
          {variant === 'loading' ? (
            <ActivityIndicator color={accentColor} />
          ) : (
            <Ionicons
              color={accentColor}
              name={preset.icon as keyof typeof Ionicons.glyphMap}
              size={24}
            />
          )}
        </View>
        <View style={styles.copy}>
          <AppText
            accessibilityLabel={`${preset.accessibilityLabel}. ${title}`}
            variant="headingMd"
          >
            {title}
          </AppText>
          <AppText tone="secondary">{description}</AppText>
        </View>
      </View>
      {actionLabel && actionHint && onAction ? (
        <PrimaryAction accessibilityHint={actionHint} label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: nativeLayoutTokens.spacing[2],
    minWidth: 0,
  },
  heading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[3],
  },
  icon: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.chip,
    height: nativeLayoutTokens.touchTarget.android,
    justifyContent: 'center',
    width: nativeLayoutTokens.touchTarget.android,
  },
  panel: {
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[6],
    padding: nativeLayoutTokens.spacing[4],
  },
});
