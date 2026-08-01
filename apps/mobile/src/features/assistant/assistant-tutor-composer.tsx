import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';

interface AssistantTutorComposerProps {
  isSubmitting: boolean;
  message: string;
  submitDisabled: boolean;
  onChangeMessage: (value: string) => void;
  onSubmit: () => void;
}

export function AssistantTutorComposer({
  isSubmitting,
  message,
  onChangeMessage,
  onSubmit,
  submitDisabled,
}: AssistantTutorComposerProps) {
  const { theme } = useMobileTheme();

  return (
    <View
      style={[
        styles.composer,
        { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
      ]}
    >
      <View style={styles.heading}>
        <AppText variant="headingMd">Bạn muốn hỏi gì?</AppText>
        <AppText tone="secondary" variant="bodySm">
          Không gửi bí mật hoặc thông tin nhận diện. Câu hỏi tối đa 2.000 ký tự.
        </AppText>
      </View>
      <TextInput
        accessibilityHint="Nhập câu hỏi ngôn ngữ bằng tiếng Việt"
        accessibilityLabel="Câu hỏi cho Trợ lý"
        editable={!isSubmitting}
        maxLength={2000}
        multiline
        onChangeText={onChangeMessage}
        placeholder="Ví dụ: Vì sao dùng は thay vì が?"
        placeholderTextColor={theme.color.textTertiary}
        style={[
          styles.input,
          {
            backgroundColor: theme.color.surfaceSubtle,
            borderColor: theme.color.borderSubtle,
            color: theme.color.textPrimary,
          },
        ]}
        textAlignVertical="top"
        value={message}
      />
      <Pressable
        accessibilityHint="Gửi câu hỏi đã chọn cấu hình"
        accessibilityLabel="Gửi câu hỏi cho Trợ lý"
        accessibilityRole="button"
        accessibilityState={{ busy: isSubmitting, disabled: submitDisabled }}
        disabled={submitDisabled}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.submit,
          {
            backgroundColor: theme.color.actionPrimary,
            opacity: submitDisabled ? 0.48 : pressed ? 0.78 : 1,
          },
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={theme.color.onActionPrimary} />
        ) : (
          <AppText style={{ color: theme.color.onActionPrimary }} variant="label">
            Gửi câu hỏi
          </AppText>
        )}
      </Pressable>
      <AppText tone="tertiary" variant="caption">
        AI có thể sai. Ranh giới nguồn luôn được hiển thị trong câu trả lời.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    borderRadius: nativeLayoutTokens.radius.surface,
    borderWidth: 1,
    gap: nativeLayoutTokens.spacing[4],
    padding: nativeLayoutTokens.spacing[4],
  },
  heading: { gap: nativeLayoutTokens.spacing[1] },
  input: {
    borderRadius: nativeLayoutTokens.radius.control,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 128,
    paddingHorizontal: nativeLayoutTokens.spacing[3],
    paddingVertical: nativeLayoutTokens.spacing[3],
  },
  submit: {
    alignItems: 'center',
    borderRadius: nativeLayoutTokens.radius.control,
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[4],
  },
});
