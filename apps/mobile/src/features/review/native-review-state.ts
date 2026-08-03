import {
  ActivityOperationIdentityError,
  createReviewSubmissionApiRequest,
} from '@ideogram/api-client';
import { NativeApiError, type NativeApiErrorCode } from '@ideogram/api-client/native';

import type { ActivityOperationIdentity } from '@ideogram/api-client';
import type { ReviewGrade, ReviewSubmissionInput } from '@ideogram/contracts';

export type NativeReviewErrorCode = NativeApiErrorCode | 'IDENTITY_ERROR' | 'STORAGE_ERROR';

export interface NativeReviewErrorFeedback {
  code: NativeReviewErrorCode;
  message: string;
  requiresSignIn: boolean;
  retryable: boolean;
}

interface CreateNativeReviewInputOptions {
  createIdempotencyKey: () => string;
  grade: ReviewGrade;
  identity: ActivityOperationIdentity;
  itemId: string;
  now: Date;
  timezone: string;
}

const retryableCodes = new Set<NativeReviewErrorCode>([
  'ABORTED',
  'INVALID_RESPONSE',
  'NETWORK_ERROR',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'TIMEOUT',
]);
const signInCodes = new Set<NativeReviewErrorCode>(['SESSION_REQUIRED', 'UNAUTHORIZED']);

const errorMessages: Record<NativeReviewErrorCode, string> = {
  ABORTED: 'Yêu cầu đã dừng. Bạn có thể gửi lại quyết định này an toàn.',
  CONFIGURATION_ERROR: 'Ứng dụng chưa được cấu hình để ghi kết quả ôn tập.',
  FORBIDDEN: 'Tài khoản hiện không có quyền cập nhật mục ôn tập này.',
  HTTP_ERROR: 'Mục ôn tập không còn khả dụng. Hãy tải lại hàng đợi.',
  IDENTITY_ERROR: 'Thiết bị chưa thể tạo mã xác nhận an toàn. Hãy tải lại rồi thử lại.',
  INVALID_REQUEST: 'Mục ôn tập đã thay đổi. Hãy tải lại hàng đợi.',
  INVALID_RESPONSE: 'Chưa xác nhận được kết quả. Bạn có thể gửi lại an toàn.',
  NETWORK_ERROR: 'Không thể kết nối máy chủ. Kiểm tra mạng rồi gửi lại an toàn.',
  RATE_LIMITED: 'Hệ thống đang giới hạn lượt gửi. Hãy chờ một chút rồi thử lại.',
  SERVER_ERROR: 'Máy chủ chưa xác nhận được kết quả. Bạn có thể gửi lại an toàn.',
  SESSION_CHANGED: 'Phiên học đã thay đổi. Hãy mở lại hàng đợi trong phiên hiện tại.',
  SESSION_PROVIDER_ERROR: 'Không thể xác minh phiên học hiện tại.',
  SESSION_REQUIRED: 'Hãy đăng nhập để tiếp tục ôn tập.',
  STORAGE_ERROR:
    'Thiết bị chưa thể lưu mã xác nhận an toàn. Hãy cho phép lưu trữ cục bộ rồi tải lại.',
  TIMEOUT: 'Máy chủ phản hồi quá lâu. Bạn có thể gửi lại an toàn.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.',
};

export const createNativeReviewSubmissionInput = ({
  createIdempotencyKey,
  grade,
  identity,
  itemId,
  now,
  timezone,
}: CreateNativeReviewInputOptions): ReviewSubmissionInput =>
  createReviewSubmissionApiRequest({
    deviceId: identity.deviceId,
    deviceSequence: identity.deviceSequence,
    grade,
    idempotencyKey: createIdempotencyKey(),
    itemId,
    reviewedAtClient: now.toISOString(),
    timezone,
  }).body;

export const describeNativeReviewError = (error: unknown): NativeReviewErrorFeedback => {
  const code: NativeReviewErrorCode =
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
