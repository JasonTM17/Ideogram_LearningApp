import { createTutorTurnApiRequest, parseTutorTurnApiResponse } from '@ideogram/api-client';

import type { TutorTurnReceipt } from '@ideogram/contracts';

export type WebTutorTurnErrorCode =
  | 'ABORTED'
  | 'FORBIDDEN'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNAUTHORIZED';

export class WebTutorTurnError extends Error {
  constructor(
    readonly code: WebTutorTurnErrorCode,
    readonly status?: number,
  ) {
    super('The tutor request could not be completed.');
    this.name = 'WebTutorTurnError';
  }
}

export interface WebTutorTurnRequestOptions {
  fetchImplementation?: typeof fetch;
  signal?: AbortSignal;
}

const classifyStatus = (status: number): WebTutorTurnErrorCode => {
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

export const submitWebTutorTurn = async (
  input: unknown,
  options: WebTutorTurnRequestOptions = {},
): Promise<TutorTurnReceipt> => {
  let request: ReturnType<typeof createTutorTurnApiRequest>;
  try {
    request = createTutorTurnApiRequest(input);
  } catch {
    throw new WebTutorTurnError('INVALID_REQUEST');
  }

  const fetchImplementation = options.fetchImplementation ?? fetch;
  let response: Response;
  try {
    const requestInit: RequestInit = {
      body: JSON.stringify(request.body),
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      method: request.method,
      redirect: 'error',
    };
    if (options.signal) {
      requestInit.signal = options.signal;
    }
    response = await fetchImplementation(request.path, {
      ...requestInit,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new WebTutorTurnError('ABORTED');
    }
    throw new WebTutorTurnError('NETWORK_ERROR');
  }

  if (!response.ok) {
    throw new WebTutorTurnError(classifyStatus(response.status), response.status);
  }

  if (!isJsonContentType(response.headers.get('content-type'))) {
    throw new WebTutorTurnError('INVALID_RESPONSE', response.status);
  }

  try {
    return parseTutorTurnApiResponse(await response.json());
  } catch {
    throw new WebTutorTurnError('INVALID_RESPONSE', response.status);
  }
};
