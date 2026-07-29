import { ApiHttpError } from './api-response';

import type { RequestAuthenticationSource } from '@/lib/supabase/request-auth';

const mutationMethods = new Set(['DELETE', 'PATCH', 'POST', 'PUT']);
export const maximumJsonBodyBytes = 65_536;

const forbidden = (message: string): ApiHttpError =>
  new ApiHttpError({ code: 'FORBIDDEN', message, status: 403 });

export interface MutationPolicyOptions {
  authenticationSource: RequestAuthenticationSource;
  trustedOrigin: string;
}

export const parseTrustedWebOrigin = (
  value: string | undefined,
  { allowLocalHttp = false }: { allowLocalHttp?: boolean } = {},
): string => {
  if (!value?.trim()) {
    throw new ApiHttpError({
      code: 'UNAVAILABLE',
      message: 'Cấu hình nguồn web tin cậy chưa sẵn sàng.',
      status: 503,
    });
  }

  let origin: URL;
  try {
    origin = new URL(value);
  } catch {
    throw new ApiHttpError({
      code: 'UNAVAILABLE',
      message: 'Cấu hình nguồn web tin cậy không hợp lệ.',
      status: 503,
    });
  }

  const isLocal =
    allowLocalHttp &&
    origin.protocol === 'http:' &&
    (origin.hostname === '127.0.0.1' || origin.hostname === 'localhost');

  if ((origin.protocol !== 'https:' && !isLocal) || origin.origin !== value.replace(/\/$/u, '')) {
    throw new ApiHttpError({
      code: 'UNAVAILABLE',
      message: 'Cấu hình nguồn web tin cậy không hợp lệ.',
      status: 503,
    });
  }

  return origin.origin;
};

const assertJsonMutationRequest = (
  request: Request,
  { authenticationSource, trustedOrigin }: MutationPolicyOptions,
): void => {
  if (!mutationMethods.has(request.method)) {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Phương thức yêu cầu không được hỗ trợ.',
      status: 405,
    });
  }

  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (mediaType !== 'application/json') {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Yêu cầu phải dùng Content-Type application/json.',
      status: 415,
    });
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maximumJsonBodyBytes) {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Nội dung yêu cầu vượt quá giới hạn cho phép.',
      status: 413,
    });
  }

  const origin = request.headers.get('origin');
  if (authenticationSource === 'cookie' && origin === null) {
    throw forbidden('Yêu cầu cookie phải có Origin hợp lệ.');
  }
  if (origin !== null && origin !== trustedOrigin) {
    throw forbidden('Nguồn yêu cầu không được phép.');
  }

  const fetchSite = request.headers.get('sec-fetch-site');
  if (authenticationSource === 'cookie' && fetchSite !== null && fetchSite !== 'same-origin') {
    throw forbidden('Yêu cầu trình duyệt phải đến từ cùng nguồn.');
  }
};

const payloadTooLarge = (): ApiHttpError =>
  new ApiHttpError({
    code: 'INVALID_REQUEST',
    message: 'Nội dung yêu cầu vượt quá giới hạn cho phép.',
    status: 413,
  });

const readBoundedBody = async (request: Request): Promise<string> => {
  if (!request.body) {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Yêu cầu phải có nội dung JSON.',
      status: 400,
    });
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      byteLength += value.byteLength;
      if (byteLength > maximumJsonBodyBytes) {
        await reader.cancel();
        throw payloadTooLarge();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder('utf-8', { fatal: true }).decode(body);
};

export const readJsonMutationBody = async (
  request: Request,
  options: MutationPolicyOptions,
): Promise<unknown> => {
  assertJsonMutationRequest(request, options);

  let body: string;
  try {
    body = await readBoundedBody(request);
  } catch (error) {
    if (error instanceof ApiHttpError) {
      throw error;
    }

    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Nội dung JSON không hợp lệ.',
      status: 400,
    });
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ApiHttpError({
      code: 'INVALID_REQUEST',
      message: 'Nội dung JSON không hợp lệ.',
      status: 400,
    });
  }
};
