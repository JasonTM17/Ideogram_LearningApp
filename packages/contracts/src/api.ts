export const API_VERSION = 'v1' as const;

export type ApiErrorCode =
  'FORBIDDEN' | 'INVALID_REQUEST' | 'NOT_FOUND' | 'RATE_LIMITED' | 'UNAUTHORIZED' | 'UNAVAILABLE';

export interface ApiErrorResponse {
  code: ApiErrorCode;
  message: string;
  requestId: string;
}

export interface HealthResponse {
  service: 'ideogram-learning-api';
  status: 'ok';
  timestamp: string;
  version: typeof API_VERSION;
}

export const createHealthResponse = (now = new Date()): HealthResponse => ({
  service: 'ideogram-learning-api',
  status: 'ok',
  timestamp: now.toISOString(),
  version: API_VERSION,
});
