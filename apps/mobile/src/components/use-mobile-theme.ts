import {
  nativeDarkTheme,
  nativeLightTheme,
  type NativeTheme,
} from '@ideogram/design-tokens/native';
import { useColorScheme } from 'react-native';

export interface MobileThemeResult {
  isDark: boolean;
  theme: NativeTheme;
}

export const useMobileTheme = (): MobileThemeResult => {
  const isDark = useColorScheme() === 'dark';

  return {
    isDark,
    theme: isDark ? nativeDarkTheme : nativeLightTheme,
  };
};
