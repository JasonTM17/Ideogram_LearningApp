import {
  ActivityOperationIdentityError,
  createActivityAttemptApiRequest,
  parseActivityAttemptApiResponse,
} from '@ideogram/api-client';

import type { ActivityAttemptInput, ActivityAttemptReceipt } from '@ideogram/contracts';
import type { ActivityOperationIdentity } from '@ideogram/api-client';

export type WebActivityAttemptErrorCode =
  | 'ABORTED'
  | 'FORBIDDEN'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'STORAGE_ERROR'
  | 'UNAUTHORIZED';

export class WebActivityAttemptError extends Error {
  constructor(
    readonly code: WebActivityAttemptErrorCode,
    readonly status?: number,
  ) {
    super('The learning activity request could not be completed.');
    this.name = 'WebActivityAttemptError';
  }
}

export interface WebActivityAttemptRequestOptions {
  fetchImplementation?: typeof fetch;
  signal?: AbortSignal;
}

export interface VocabularyActivityAttemptInputOptions {
  activityId: string;
  contentReleaseId: string;
  createIdempotencyKey: () => string;
  identity: ActivityOperationIdentity;
  now: Date;
  timezone: string;
}

export interface WebActivityAttemptFeedback {
  code: WebActivityAttemptErrorCode;
  message: string;
  retryable: boolean;
}

const classifyStatus = (status: number): WebActivityAttemptErrorCode => {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'INVALID_REQUEST';
};

const isJsonContentType = (value: string | null): boolean => {
  const mediaType = value?.split(';', 1)[0]?.trim().toLowerCase();
  return (
    mediaType === 'application/json' ||
    (mediaType?.startsWith('application/') === true && mediaType.endsWith('+json'))
  );
};

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const createVocabularyActivityAttemptInput = ({
  activityId,
  contentReleaseId,
  createIdempotencyKey,
  identity,
  now,
  timezone,
}: VocabularyActivityAttemptInputOptions): ActivityAttemptInput =>
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

export const submitWebActivityAttempt = async (
  input: unknown,
  options: WebActivityAttemptRequestOptions = {},
): Promise<ActivityAttemptReceipt> => {
  let request: ReturnType<typeof createActivityAttemptApiRequest>;
  try {
    request = createActivityAttemptApiRequest(input);
  } catch {
    throw new WebActivityAttemptError('INVALID_REQUEST');
  }

  const fetchImplementation = options.fetchImplementation ?? fetch;
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
    response = await fetchImplementation(request.path, requestInit);
  } catch (error) {
    throw new WebActivityAttemptError(isAbortError(error) ? 'ABORTED' : 'NETWORK_ERROR');
  }

  if (!response.ok) {
    throw new WebActivityAttemptError(classifyStatus(response.status), response.status);
  }

  if (!isJsonContentType(response.headers.get('content-type'))) {
    throw new WebActivityAttemptError('INVALID_RESPONSE', response.status);
  }

  try {
    return parseActivityAttemptApiResponse(await response.json());
  } catch {
    throw new WebActivityAttemptError('INVALID_RESPONSE', response.status);
  }
};

const errorFeedback: Record<WebActivityAttemptErrorCode, WebActivityAttemptFeedback> = {
  ABORTED: {
    code: 'ABORTED',
    message: 'Yêu cầu đã dừng. Bạn có thể gửi lại an toàn để kiểm tra kết quả.',
    retryable: true,
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Tài khoản hiện không có quyền ghi tiến độ cho hoạt động này.',
    retryable: false,
  },
  INVALID_REQUEST: {
    code: 'INVALID_REQUEST',
    message: 'Hoạt động không còn khả dụng. Hãy quay lại bài học để cập nhật.',
    retryable: false,
  },
  INVALID_RESPONSE: {
    code: 'INVALID_RESPONSE',
    message: 'Chưa xác nhận được kết quả. Bạn có thể gửi lại an toàn.',
    retryable: true,
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
    message: 'Máy chủ chưa xác nhận được kết quả. Bạn có thể gửi lại an toàn.',
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

export const describeWebActivityAttemptError = (error: unknown): WebActivityAttemptFeedback => {
  const code =
    error instanceof ActivityOperationIdentityError
      ? 'STORAGE_ERROR'
      : error instanceof WebActivityAttemptError
        ? error.code
        : 'NETWORK_ERROR';
  return errorFeedback[code];
};
