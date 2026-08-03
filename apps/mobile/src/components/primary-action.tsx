import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { useMobileTheme } from './use-mobile-theme';

interface PrimaryActionProps {
  accessibilityHint: string;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export function PrimaryAction({
  accessibilityHint,
  label,
  onPress,
  variant = 'primary',
}: PrimaryActionProps) {
  const { theme } = useMobileTheme();
  const isSecondary = variant === 'secondary';
  const foregroundColor = isSecondary ? theme.color.actionSecondary : theme.color.onActionPrimary;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isSecondary ? theme.color.surface : theme.color.actionPrimary,
          borderColor: isSecondary ? theme.color.actionSecondary : 'transparent',
          borderWidth: 1,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <AppText style={{ color: foregroundColor }} variant="label">
        {label}
      </AppText>
      <View importantForAccessibility="no-hide-descendants">
        <Ionicons color={foregroundColor} name="arrow-forward" size={20} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: nativeLayoutTokens.radius.control,
    flexDirection: 'row',
    gap: nativeLayoutTokens.spacing[2],
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[4],
    paddingVertical: nativeLayoutTokens.spacing[3],
  },
});
