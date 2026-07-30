import Ionicons from '@expo/vector-icons/Ionicons';
import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { useMobileTheme } from './use-mobile-theme';

interface PrimaryActionProps {
  accessibilityHint: string;
  label: string;
  onPress: () => void;
}

export function PrimaryAction({ accessibilityHint, label, onPress }: PrimaryActionProps) {
  const { theme } = useMobileTheme();

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.color.actionPrimary, opacity: pressed ? 0.78 : 1 },
      ]}
    >
      <AppText style={{ color: theme.color.onActionPrimary }} variant="label">
        {label}
      </AppText>
      <View importantForAccessibility="no-hide-descendants">
        <Ionicons color={theme.color.onActionPrimary} name="arrow-forward" size={20} />
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
