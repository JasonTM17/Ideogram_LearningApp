'use client';

import { isTutorLanguageAvailable, languageLevelCodes } from '@ideogram/contracts';

import type { LearnerTutorPreference, LanguagePackCode } from '@ideogram/contracts';

export type WebTutorPreferences = LearnerTutorPreference & { targetLevelCode: string };

export const defaultWebTutorPreferences: WebTutorPreferences = {
  explanationDepth: 'standard',
  preferredLanguageCode: 'ja',
  preferredObjectiveKey: 'communication',
  targetLevelCode: 'N5',
  tone: 'encouraging',
};

const languageOptions = [
  { label: 'Tiếng Nhật', value: 'ja' },
  { disabled: !isTutorLanguageAvailable('zh'), label: 'Tiếng Trung — sắp mở', value: 'zh' },
  { disabled: !isTutorLanguageAvailable('ko'), label: 'Tiếng Hàn — sắp mở', value: 'ko' },
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

interface TutorPreferenceControlsProps {
  disabled: boolean;
  onChange: (next: WebTutorPreferences) => void;
  preferences: WebTutorPreferences;
}

export function TutorPreferenceControls({
  disabled,
  onChange,
  preferences,
}: TutorPreferenceControlsProps) {
  const levels = languageLevelCodes[preferences.preferredLanguageCode];

  return (
    <fieldset className="tutor-preferences" disabled={disabled}>
      <legend className="tutor-preferences__legend">Cấu hình Trợ lý</legend>
      <p className="tutor-preferences__description">
        Cấu hình dành cho người Việt; hiện chỉ có Tiếng Nhật đang mở cho beta.
      </p>
      <div className="tutor-preferences__grid">
        <Choice
          label="Ngôn ngữ muốn học"
          options={languageOptions}
          value={preferences.preferredLanguageCode}
          onChange={(value) => {
            const language = value as LanguagePackCode;
            onChange({
              ...preferences,
              preferredLanguageCode: language,
              targetLevelCode: languageLevelCodes[language][0],
            });
          }}
        />
        <Choice
          label="Trình độ"
          options={levels.map((value) => ({ label: value.replace('_', ' '), value }))}
          value={preferences.targetLevelCode}
          onChange={(value) => onChange({ ...preferences, targetLevelCode: value })}
        />
        <Choice
          label="Mục tiêu"
          options={objectiveOptions}
          value={preferences.preferredObjectiveKey}
          onChange={(value) =>
            onChange({
              ...preferences,
              preferredObjectiveKey: value as WebTutorPreferences['preferredObjectiveKey'],
            })
          }
        />
        <Choice
          label="Độ sâu giải thích"
          options={depthOptions}
          value={preferences.explanationDepth}
          onChange={(value) =>
            onChange({
              ...preferences,
              explanationDepth: value as WebTutorPreferences['explanationDepth'],
            })
          }
        />
        <Choice
          label="Giọng điệu"
          options={toneOptions}
          value={preferences.tone}
          onChange={(value) =>
            onChange({ ...preferences, tone: value as WebTutorPreferences['tone'] })
          }
        />
      </div>
    </fieldset>
  );
}

interface ChoiceProps {
  label: string;
  onChange: (value: string) => void;
  options: readonly { disabled?: boolean; label: string; value: string }[];
  value: string;
}

function Choice({ label, onChange, options, value }: ChoiceProps) {
  return (
    <label className="tutor-choice">
      <span>{label}</span>
      <select
        aria-label={label}
        className="tutor-choice__select"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
