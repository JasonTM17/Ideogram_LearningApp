import { nativeTypographyTokens } from '@ideogram/design-tokens/native';
import { Text, type TextProps } from 'react-native';

import { useMobileTheme } from './use-mobile-theme';

type TextVariant = keyof typeof nativeTypographyTokens.scale;
type TextTone = 'primary' | 'secondary' | 'tertiary' | 'action' | 'danger' | 'success';

interface AppTextProps extends TextProps {
  tone?: TextTone;
  variant?: TextVariant;
}

export function AppText({
  maxFontSizeMultiplier = nativeTypographyTokens.maximumFontScale,
  style,
  tone = 'primary',
  variant = 'body',
  ...props
}: AppTextProps) {
  const { theme } = useMobileTheme();
  const toneColors = {
    action: theme.color.actionPrimary,
    danger: theme.color.danger,
    primary: theme.color.textPrimary,
    secondary: theme.color.textSecondary,
    success: theme.color.success,
    tertiary: theme.color.textTertiary,
  } as const;

  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[nativeTypographyTokens.scale[variant], { color: toneColors[tone] }, style]}
      {...props}
    />
  );
}
