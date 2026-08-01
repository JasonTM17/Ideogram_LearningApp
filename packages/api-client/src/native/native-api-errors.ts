export type NativeApiHttpErrorCode =
  'FORBIDDEN' | 'HTTP_ERROR' | 'RATE_LIMITED' | 'SERVER_ERROR' | 'UNAUTHORIZED';

export type NativeApiErrorCode =
  | 'ABORTED'
  | 'CONFIGURATION_ERROR'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR'
  | 'SESSION_CHANGED'
  | 'SESSION_PROVIDER_ERROR'
  | 'SESSION_REQUIRED'
  | 'TIMEOUT'
  | NativeApiHttpErrorCode;

export class NativeApiError extends Error {
  readonly code: NativeApiErrorCode;

  protected constructor(code: NativeApiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'NativeApiError';
  }
}

export class NativeApiConfigurationError extends NativeApiError {
  constructor() {
    super('CONFIGURATION_ERROR', 'Native API client configuration is invalid.');
    this.name = 'NativeApiConfigurationError';
  }
}

export class NativeApiInvalidRequestError extends NativeApiError {
  constructor() {
    super('INVALID_REQUEST', 'The activity request could not be serialized safely.');
    this.name = 'NativeApiInvalidRequestError';
  }
}

export class NativeApiSessionRequiredError extends NativeApiError {
  constructor() {
    super('SESSION_REQUIRED', 'An authenticated session is required.');
    this.name = 'NativeApiSessionRequiredError';
  }
}

export class NativeApiSessionProviderError extends NativeApiError {
  constructor() {
    super('SESSION_PROVIDER_ERROR', 'The authenticated session could not be read.');
    this.name = 'NativeApiSessionProviderError';
  }
}

export class NativeApiSessionChangedError extends NativeApiError {
  constructor() {
    super('SESSION_CHANGED', 'The authenticated session changed during the request.');
    this.name = 'NativeApiSessionChangedError';
  }
}

const classifyHttpStatus = (status: number): { code: NativeApiHttpErrorCode; message: string } => {
  if (status === 401) return { code: 'UNAUTHORIZED', message: 'Authentication is required.' };
  if (status === 403) return { code: 'FORBIDDEN', message: 'The request is not permitted.' };
  if (status === 429) return { code: 'RATE_LIMITED', message: 'Too many requests.' };
  if (status >= 500)
    return { code: 'SERVER_ERROR', message: 'The service is temporarily unavailable.' };
  return { code: 'HTTP_ERROR', message: 'The API request failed.' };
};

export class NativeApiHttpError extends NativeApiError {
  readonly status: number;

  constructor(status: number) {
    const classification = classifyHttpStatus(status);
    super(classification.code, classification.message);
    this.name = 'NativeApiHttpError';
    this.status = status;
  }
}

export class NativeApiNetworkError extends NativeApiError {
  constructor() {
    super('NETWORK_ERROR', 'The API request could not reach the service.');
    this.name = 'NativeApiNetworkError';
  }
}

export class NativeApiTimeoutError extends NativeApiError {
  constructor() {
    super('TIMEOUT', 'The API request timed out.');
    this.name = 'NativeApiTimeoutError';
  }
}

export class NativeApiCallerAbortError extends NativeApiError {
  constructor() {
    super('ABORTED', 'The API request was cancelled.');
    this.name = 'NativeApiCallerAbortError';
  }
}

export class NativeApiInvalidResponseError extends NativeApiError {
  constructor() {
    super('INVALID_RESPONSE', 'The API returned an invalid response.');
    this.name = 'NativeApiInvalidResponseError';
  }
}
