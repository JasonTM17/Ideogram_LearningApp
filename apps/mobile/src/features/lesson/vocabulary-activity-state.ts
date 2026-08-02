import {
  ActivityOperationIdentityError,
  createActivityAttemptApiRequest,
} from '@ideogram/api-client';
import { NativeApiError, type NativeApiErrorCode } from '@ideogram/api-client/native';

import type { ActivityAttemptInput } from '@ideogram/contracts';
import type { ActivityOperationIdentity } from '@ideogram/api-client';

export type NativeVocabularyActivityErrorCode =
  NativeApiErrorCode | 'IDENTITY_ERROR' | 'STORAGE_ERROR';

export interface NativeVocabularyActivityAttemptOptions {
  activityId: string;
  contentReleaseId: string;
  createIdempotencyKey: () => string;
  identity: ActivityOperationIdentity;
  now: Date;
  timezone: string;
}

export interface NativeVocabularyActivityErrorFeedback {
  code: NativeVocabularyActivityErrorCode;
  message: string;
  requiresSignIn: boolean;
  retryable: boolean;
}

const retryableCodes = new Set<NativeVocabularyActivityErrorCode>([
  'ABORTED',
  'INVALID_RESPONSE',
  'NETWORK_ERROR',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'TIMEOUT',
]);

const signInCodes = new Set<NativeVocabularyActivityErrorCode>([
  'SESSION_REQUIRED',
  'UNAUTHORIZED',
]);

const errorMessages: Record<NativeVocabularyActivityErrorCode, string> = {
  ABORTED: 'Yêu cầu đã dừng. Bạn có thể gửi lại an toàn để kiểm tra kết quả.',
  CONFIGURATION_ERROR: 'Ứng dụng chưa được cấu hình để ghi tiến độ học.',
  FORBIDDEN: 'Tài khoản hiện không có quyền ghi tiến độ cho hoạt động này.',
  HTTP_ERROR: 'Hoạt động không còn khả dụng. Hãy quay lại bài học để cập nhật.',
  IDENTITY_ERROR: 'Thiết bị chưa thể tạo mã xác nhận an toàn. Hãy tải lại rồi thử lại.',
  INVALID_REQUEST: 'Hoạt động không còn khả dụng. Hãy quay lại bài học để cập nhật.',
  INVALID_RESPONSE: 'Chưa xác nhận được kết quả. Bạn có thể gửi lại an toàn.',
  NETWORK_ERROR: 'Không thể kết nối máy chủ. Kiểm tra mạng rồi gửi lại an toàn.',
  RATE_LIMITED: 'Hệ thống đang giới hạn lượt gửi. Hãy chờ một chút rồi thử lại.',
  SERVER_ERROR: 'Máy chủ chưa xác nhận được kết quả. Bạn có thể gửi lại an toàn.',
  SESSION_CHANGED: 'Phiên học đã thay đổi. Hãy mở lại bài học trong phiên hiện tại.',
  SESSION_PROVIDER_ERROR: 'Không thể xác minh phiên học hiện tại.',
  SESSION_REQUIRED: 'Hãy đăng nhập để tiếp tục hoạt động này.',
  STORAGE_ERROR:
    'Thiết bị chưa thể lưu mã xác nhận an toàn. Hãy cho phép lưu trữ cục bộ rồi tải lại.',
  TIMEOUT: 'Máy chủ phản hồi quá lâu. Bạn có thể gửi lại an toàn.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.',
};

export const resolveNativeClientTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const createNativeVocabularyActivityAttemptInput = ({
  activityId,
  contentReleaseId,
  createIdempotencyKey,
  identity,
  now,
  timezone,
}: NativeVocabularyActivityAttemptOptions): ActivityAttemptInput =>
  createActivityAttemptApiRequest({
    activityId,
    contentReleaseId,
    deviceId: identity.deviceId,
    deviceSequence: identity.deviceSequence,
    idempotencyKey: createIdempotencyKey(),
    responsePayload: { acknowledged: true },
    reviewedAtClient: now.toISOString(),
    timezone,
  }).body;

export const describeNativeVocabularyActivityError = (
  error: unknown,
): NativeVocabularyActivityErrorFeedback => {
  const code: NativeVocabularyActivityErrorCode =
    error instanceof ActivityOperationIdentityError
      ? error.code === 'corrupt_state' || error.code === 'storage_failure'
        ? 'STORAGE_ERROR'
        : 'IDENTITY_ERROR'
      : error instanceof NativeApiError
        ? error.code
        : 'NETWORK_ERROR';

  return {
    code,
    message: errorMessages[code],
    requiresSignIn: signInCodes.has(code),
    retryable: retryableCodes.has(code),
  };
};
