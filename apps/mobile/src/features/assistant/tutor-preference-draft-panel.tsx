import { nativeLayoutTokens } from '@ideogram/design-tokens/native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/app-text';
import { useMobileTheme } from '../../components/use-mobile-theme';
import {
  resetTutorLevelForLanguage,
  tutorLevelsForLanguage,
  type TutorPreferenceState,
} from './assistant-state';

interface TutorPreferencePanelProps {
  disabled?: boolean;
  preferences: TutorPreferenceState;
  onChange: (next: TutorPreferenceState) => void;
}

const languageOptions = [
  { label: 'Tiếng Nhật', value: 'ja' },
  { label: 'Tiếng Trung', value: 'zh' },
  { label: 'Tiếng Hàn', value: 'ko' },
] as const;

const objectiveOptions = [
  { label: 'Giao tiếp', value: 'communication' },
  { label: 'Thi cử', value: 'exam' },
  { label: 'Công việc', value: 'work' },
  { label: 'Du lịch', value: 'travel' },
] as const;

const depthOptions = [
  { label: 'Ngắn gọn', value: 'concise' },
  { label: 'Tiêu chuẩn', value: 'standard' },
  { label: 'Chi tiết', value: 'detailed' },
] as const;

const toneOptions = [
  { label: 'Khích lệ', value: 'encouraging' },
  { label: 'Thẳng thắn', value: 'direct' },
] as const;

const labels = {
  depth: 'Độ sâu giải thích',
  language: 'Ngôn ngữ muốn học',
  level: 'Trình độ',
  objective: 'Mục tiêu',
  tone: 'Giọng điệu',
} as const;

export function TutorPreferenceDraftPanel({
  disabled = false,
  onChange,
  preferences,
}: TutorPreferencePanelProps) {
  const { theme } = useMobileTheme();
  const selectedLanguage = languageOptions.find(
    (option) => option.value === preferences.preferredLanguageCode,
  );
  const languageLabel = selectedLanguage?.label ?? 'Ngôn ngữ';
  const levels = tutorLevelsForLanguage(preferences.preferredLanguageCode);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.color.surface, borderColor: theme.color.borderSubtle },
      ]}
    >
      <View style={styles.heading}>
        <AppText variant="headingMd">Cấu hình Trợ lý</AppText>
        <AppText tone="secondary" variant="bodySm">
          Điều chỉnh câu trả lời cho người Việt; cấu hình chỉ được gửi cùng câu hỏi.
        </AppText>
      </View>
      <OptionGroup
        disabled={disabled}
        label={labels.language}
        options={languageOptions}
        selected={preferences.preferredLanguageCode}
        onSelect={(value) => onChange({ ...preferences, ...resetTutorLevelForLanguage(value) })}
        theme={theme}
      />
      <OptionGroup
        disabled={disabled}
        label={labels.level}
        options={levels.map((value) => ({ label: value.replace('_', ' '), value }))}
        selected={preferences.targetLevelCode}
        onSelect={(value) => onChange({ ...preferences, targetLevelCode: value })}
        theme={theme}
      />
      <OptionGroup
        disabled={disabled}
        label={labels.objective}
        options={objectiveOptions}
        selected={preferences.preferredObjectiveKey}
        onSelect={(value) => onChange({ ...preferences, preferredObjectiveKey: value })}
        theme={theme}
      />
      <OptionGroup
        disabled={disabled}
        label={labels.depth}
        options={depthOptions}
        selected={preferences.explanationDepth}
        onSelect={(value) => onChange({ ...preferences, explanationDepth: value })}
        theme={theme}
      />
      <OptionGroup
        disabled={disabled}
        label={labels.tone}
        options={toneOptions}
        selected={preferences.tone}
        onSelect={(value) => onChange({ ...preferences, tone: value })}
        theme={theme}
      />
      <AppText tone="tertiary" variant="caption">
        Đang học {languageLabel} · {preferences.targetLevelCode}
      </AppText>
    </View>
  );
}

interface OptionGroupProps<T extends string> {
  disabled: boolean;
  label: string;
  options: readonly { label: string; value: T }[];
  selected: T;
  theme: ReturnType<typeof useMobileTheme>['theme'];
  onSelect: (value: T) => void;
}

function OptionGroup<T extends string>({
  disabled,
  label,
  onSelect,
  options,
  selected,
  theme,
}: OptionGroupProps<T>) {
  return (
    <View style={styles.group}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.options}>
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled, selected: active }}
              disabled={disabled}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: active ? theme.color.actionPrimary : theme.color.surfaceSubtle,
                  opacity: disabled ? 0.52 : pressed ? 0.72 : 1,
                },
              ]}
            >
              <AppText
                style={{ color: active ? theme.color.onActionPrimary : theme.color.textPrimary }}
                variant="caption"
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
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
  group: { gap: nativeLayoutTokens.spacing[2] },
  heading: { gap: nativeLayoutTokens.spacing[1] },
  option: {
    borderRadius: nativeLayoutTokens.radius.chip,
    justifyContent: 'center',
    minHeight: nativeLayoutTokens.touchTarget.android,
    paddingHorizontal: nativeLayoutTokens.spacing[3],
  },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: nativeLayoutTokens.spacing[2] },
});
