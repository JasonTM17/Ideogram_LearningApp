import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';

import type { TutorTurnResponse } from '@ideogram/contracts';

interface TutorResponseCardProps {
  idempotentReplay: boolean;
  response: TutorTurnResponse;
}

const sections = [
  ['assessmentVietnamese', 'Nhận xét'],
  ['explanationVietnamese', 'Giải thích'],
  ['example', 'Ví dụ'],
  ['frequentVietnameseMistake', 'Lỗi người Việt hay gặp'],
  ['nextExerciseVietnamese', 'Bài tập tiếp theo'],
  ['sourceBoundaryVietnamese', 'Ranh giới nguồn'],
] as const satisfies readonly [keyof TutorTurnResponse, string][];

export function TutorResponseCard({ idempotentReplay, response }: TutorResponseCardProps) {
  const { theme } = useMobileTheme();

  return (
    <View
      accessibilityLabel="Câu trả lời của Trợ lý"
      style={[
        styles.card,
        { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
      ]}
    >
      <View style={styles.heading}>
        <AppText variant="headingMd">Trợ lý trả lời</AppText>
        {idempotentReplay ? (
          <AppText tone="success" variant="caption">
            Kết quả đã lưu được dùng lại an toàn
          </AppText>
        ) : null}
      </View>
      {sections.map(([key, label]) => (
        <View key={key} style={styles.section}>
          <AppText tone="secondary" variant="label">
            {label}
          </AppText>
          <AppText>{response[key]}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[4],
    padding: nativeLayoutTokens.spacing[4],
  },
  heading: { gap: nativeLayoutTokens.spacing[1] },
  section: { gap: nativeLayoutTokens.spacing[1] },
});
