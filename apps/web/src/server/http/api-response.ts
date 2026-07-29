import type { ApiErrorCode, ApiErrorResponse } from '@ideogram/contracts';

export class ApiHttpError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor({ code, message, status }: { code: ApiErrorCode; message: string; status: number }) {
    super(message);
    this.code = code;
    this.name = 'ApiHttpError';
    this.status = status;
  }
}

const noStoreHeaders = (requestId: string): HeadersInit => ({
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
  Expires: '0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Request-Id': requestId,
});

export const createRequestId = (): string => crypto.randomUUID();

export const jsonNoStore = <T>(
  body: T,
  {
    headers,
    requestId,
    status = 200,
  }: { headers?: HeadersInit; requestId: string; status?: number },
): Response => {
  const responseHeaders = new Headers(headers);

  for (const [name, value] of Object.entries(noStoreHeaders(requestId))) {
    responseHeaders.set(name, value);
  }

  return Response.json(body, {
    headers: responseHeaders,
    status,
  });
};

export const createApiErrorResponse = (error: unknown, requestId: string): Response => {
  const apiError =
    error instanceof ApiHttpError
      ? error
      : new ApiHttpError({
          code: 'UNAVAILABLE',
          message: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.',
          status: 503,
        });
  const body: ApiErrorResponse = {
    code: apiError.code,
    message: apiError.message,
    requestId,
  };

  return jsonNoStore(body, { requestId, status: apiError.status });
};
