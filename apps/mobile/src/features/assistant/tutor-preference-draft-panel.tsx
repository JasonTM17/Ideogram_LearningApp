import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';

const preferences = {
  depth: ['Ngắn gọn', 'Tiêu chuẩn', 'Chi tiết'],
  language: ['Tiếng Nhật', 'Tiếng Trung', 'Tiếng Hàn'],
  objective: ['Giao tiếp', 'Thi cử', 'Công việc', 'Du lịch'],
  tone: ['Khích lệ', 'Thẳng thắn'],
} as const;

export function TutorPreferenceDraftPanel() {
  const { theme } = useMobileTheme();
  const [selected, setSelected] = useState({
    depth: preferences.depth[1],
    language: preferences.language[0],
    objective: preferences.objective[0],
    tone: preferences.tone[0],
  });

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
      ]}
    >
      <AppText variant="headingMd">Cách Trợ lý giải thích</AppText>
      <AppText tone="secondary" variant="bodySm">
        Bản nháp chỉ hiển thị trên thiết bị này và chưa được gửi hoặc lưu vào tài khoản.
      </AppText>
      {(Object.keys(preferences) as Array<keyof typeof preferences>).map((key) => (
        <View key={key} style={styles.group}>
          <AppText variant="label">{labels[key]}</AppText>
          <View style={styles.options}>
            {preferences[key].map((option) => {
              const active = selected[key] === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelected((current) => ({ ...current, [key]: option }))}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: active
                        ? theme.color.actionPrimary
                        : theme.color.surfaceSubtle,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      color: active ? theme.color.onActionPrimary : theme.color.textPrimary,
                    }}
                    variant="caption"
                  >
                    {option}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const labels = {
  depth: 'Độ sâu giải thích',
  language: 'Ngôn ngữ muốn học',
  objective: 'Mục tiêu',
  tone: 'Giọng điệu',
} as const;

const styles = StyleSheet.create({
  card: {
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[4],
    padding: nativeLayoutTokens.spacing[4],
  },
  group: { gap: nativeLayoutTokens.spacing[2] },
  option: {
    borderRadius: nativeLayoutTokens.radius.chip,
    minHeight: nativeLayoutTokens.touchTarget.android,
    justifyContent: 'center',
    paddingHorizontal: nativeLayoutTokens.spacing[3],
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: nativeLayoutTokens.spacing[2] },
});
