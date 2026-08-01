import { NativeApiError, type NativeApiErrorCode } from '@ideogram/api-client/native';
import { languageLevelCodes } from '@ideogram/contracts';

import type {
  LearnerTutorPreference,
  LanguagePackCode,
  TutorTurnResponse,
} from '@ideogram/contracts';

export type TutorPreferenceState = LearnerTutorPreference & { targetLevelCode: string };

export type AssistantState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'ready'; idempotentReplay: boolean; response: TutorTurnResponse }
  | { code?: NativeApiErrorCode; kind: 'error'; message: string };

export const defaultTutorPreferences: TutorPreferenceState = {
  explanationDepth: 'standard',
  preferredLanguageCode: 'ja',
  preferredObjectiveKey: 'communication',
  targetLevelCode: 'N5',
  tone: 'encouraging',
};

export const tutorLevelsForLanguage = (language: LanguagePackCode): readonly string[] =>
  languageLevelCodes[language];

export const resetTutorLevelForLanguage = (
  language: LanguagePackCode,
): Pick<TutorPreferenceState, 'preferredLanguageCode' | 'targetLevelCode'> => ({
  preferredLanguageCode: language,
  targetLevelCode: tutorLevelsForLanguage(language)[0] ?? '',
});

export const isExpectedAssistantCancellation = (error: unknown): boolean =>
  error instanceof NativeApiError &&
  (error.code === 'ABORTED' ||
    error.code === 'SESSION_CHANGED' ||
    error.code === 'SESSION_REQUIRED');

const errorMessages: Record<NativeApiErrorCode, string> = {
  ABORTED: 'Yêu cầu đã được dừng lại.',
  CONFIGURATION_ERROR: 'Ứng dụng chưa được cấu hình để kết nối trợ lý.',
  FORBIDDEN: 'Tài khoản chưa có quyền dùng trợ lý hoặc chưa chấp thuận chính sách xử lý AI.',
  HTTP_ERROR: 'Trợ lý chưa thể xử lý yêu cầu này.',
  INVALID_REQUEST: 'Hãy kiểm tra lại câu hỏi và cấu hình học.',
  INVALID_RESPONSE: 'Trợ lý trả về dữ liệu chưa đúng định dạng an toàn.',
  NETWORK_ERROR: 'Không thể kết nối trợ lý. Kiểm tra mạng rồi thử lại.',
  RATE_LIMITED: 'Bạn đã dùng hết lượt tạm thời. Hãy thử lại sau.',
  SERVER_ERROR: 'Trợ lý đang tạm tắt hoặc chưa được bật cho môi trường này.',
  SESSION_CHANGED: 'Phiên học đã thay đổi; hãy gửi lại câu hỏi trong phiên hiện tại.',
  SESSION_PROVIDER_ERROR: 'Không thể xác minh phiên học hiện tại.',
  SESSION_REQUIRED: 'Hãy đăng nhập để sử dụng trợ lý.',
  TIMEOUT: 'Trợ lý phản hồi quá lâu. Hãy thử lại với câu hỏi ngắn hơn.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
};

export const describeAssistantError = (error: unknown): string => {
  if (error instanceof NativeApiError) {
    return errorMessages[error.code];
  }

  return 'Chưa thể hoàn tất yêu cầu. Hãy thử lại sau.';
};

export const getAssistantErrorCode = (error: unknown): NativeApiErrorCode | undefined =>
  error instanceof NativeApiError ? error.code : undefined;
