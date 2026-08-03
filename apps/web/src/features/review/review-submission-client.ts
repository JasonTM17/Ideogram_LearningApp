import {
  ActivityOperationIdentityError,
  createReviewSubmissionApiRequest,
  parseReviewSubmissionApiResponse,
} from '@ideogram/api-client';

import type { ActivityOperationIdentity } from '@ideogram/api-client';
import type {
  ReviewGrade,
  ReviewSubmissionInput,
  ReviewSubmissionReceipt,
} from '@ideogram/contracts';

export type WebReviewErrorCode =
  | 'ABORTED'
  | 'FORBIDDEN'
  | 'IDENTITY_ERROR'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'ITEM_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'STORAGE_ERROR'
  | 'UNAUTHORIZED';

export class WebReviewError extends Error {
  constructor(
    readonly code: WebReviewErrorCode,
    readonly status?: number,
  ) {
    super('The review request could not be completed.');
    this.name = 'WebReviewError';
  }
}

export interface WebReviewRequestOptions {
  fetchImplementation?: typeof fetch;
  signal?: AbortSignal;
}

export interface ReviewSubmissionInputOptions {
  createIdempotencyKey: () => string;
  grade: ReviewGrade;
  identity: ActivityOperationIdentity;
  itemId: string;
  now: Date;
  timezone: string;
}

export interface WebReviewFeedback {
  code: WebReviewErrorCode;
  message: string;
  retryable: boolean;
}

const classifyStatus = (status: number): WebReviewErrorCode => {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'ITEM_UNAVAILABLE';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'INVALID_REQUEST';
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

const isJsonContentType = (value: string | null): boolean => {
  const mediaType = value?.split(';', 1)[0]?.trim().toLowerCase();
  return (
    mediaType === 'application/json' ||
    (mediaType?.startsWith('application/') === true && mediaType.endsWith('+json'))
  );
};

export const createWebReviewSubmissionInput = ({
  createIdempotencyKey,
  grade,
  identity,
  itemId,
  now,
  timezone,
}: ReviewSubmissionInputOptions): ReviewSubmissionInput =>
  createReviewSubmissionApiRequest({
    deviceId: identity.deviceId,
    deviceSequence: identity.deviceSequence,
    grade,
    idempotencyKey: createIdempotencyKey(),
    itemId,
    reviewedAtClient: now.toISOString(),
    timezone,
  }).body;

export const submitWebReview = async (
  input: unknown,
  options: WebReviewRequestOptions = {},
): Promise<ReviewSubmissionReceipt> => {
  let request: ReturnType<typeof createReviewSubmissionApiRequest>;
  try {
    request = createReviewSubmissionApiRequest(input);
  } catch {
    throw new WebReviewError('INVALID_REQUEST');
  }

  let response: Response;
  try {
    const requestInit: RequestInit = {
      body: JSON.stringify(request.body),
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      method: request.method,
      redirect: 'error',
    };
    if (options.signal) {
      requestInit.signal = options.signal;
    }
    response = await (options.fetchImplementation ?? fetch)(request.path, requestInit);
  } catch (error) {
    throw new WebReviewError(isAbortError(error) ? 'ABORTED' : 'NETWORK_ERROR');
  }

  if (!response.ok) {
    throw new WebReviewError(classifyStatus(response.status), response.status);
  }
  if (!isJsonContentType(response.headers.get('content-type'))) {
    throw new WebReviewError('INVALID_RESPONSE', response.status);
  }

  try {
    return parseReviewSubmissionApiResponse(await response.json());
  } catch {
    throw new WebReviewError('INVALID_RESPONSE', response.status);
  }
};

const errorFeedback: Record<WebReviewErrorCode, WebReviewFeedback> = {
  ABORTED: {
    code: 'ABORTED',
    message: 'Yêu cầu đã dừng. Bạn có thể gửi lại cùng lựa chọn một cách an toàn.',
    retryable: true,
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Tài khoản hiện không có quyền cập nhật mục ôn tập này.',
    retryable: false,
  },
  IDENTITY_ERROR: {
    code: 'IDENTITY_ERROR',
    message: 'Trình duyệt chưa thể tạo mã xác nhận an toàn. Hãy tải lại rồi thử lại.',
    retryable: false,
  },
  INVALID_REQUEST: {
    code: 'INVALID_REQUEST',
    message: 'Lựa chọn ôn tập không còn hợp lệ. Hãy tải lại hàng đợi.',
    retryable: false,
  },
  INVALID_RESPONSE: {
    code: 'INVALID_RESPONSE',
    message: 'Chưa xác nhận được lịch ôn mới. Bạn có thể gửi lại an toàn.',
    retryable: true,
  },
  ITEM_UNAVAILABLE: {
    code: 'ITEM_UNAVAILABLE',
    message: 'Mục này không còn khả dụng. Hãy tải lại hàng đợi.',
    retryable: false,
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Không thể kết nối máy chủ. Kiểm tra mạng rồi gửi lại an toàn.',
    retryable: true,
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    message: 'Hệ thống đang giới hạn lượt gửi. Hãy chờ một chút rồi thử lại.',
    retryable: true,
  },
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    message: 'Máy chủ chưa xác nhận được lịch ôn mới. Bạn có thể gửi lại an toàn.',
    retryable: true,
  },
  STORAGE_ERROR: {
    code: 'STORAGE_ERROR',
    message:
      'Trình duyệt chưa thể lưu mã xác nhận an toàn. Hãy cho phép lưu trữ cục bộ rồi tải lại.',
    retryable: false,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.',
    retryable: false,
  },
};

export const describeWebReviewError = (error: unknown): WebReviewFeedback => {
  const code =
    error instanceof ActivityOperationIdentityError
      ? error.code === 'corrupt_state' || error.code === 'storage_failure'
        ? 'STORAGE_ERROR'
        : 'IDENTITY_ERROR'
      : error instanceof WebReviewError
        ? error.code
        : 'NETWORK_ERROR';
  return errorFeedback[code];
};
