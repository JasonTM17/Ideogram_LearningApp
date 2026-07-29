import { describe, expect, it } from 'vitest';

import { ApiHttpError, createApiErrorResponse, createRequestId, jsonNoStore } from './api-response';

describe('API response boundary', () => {
  it('returns typed errors without leaking unexpected details', async () => {
    const response = createApiErrorResponse(new Error('database credential leaked'), 'request-1');

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: 'UNAVAILABLE',
      message: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.',
      requestId: 'request-1',
    });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('preserves an intentional public error contract', async () => {
    const response = createApiErrorResponse(
      new ApiHttpError({
        code: 'UNAUTHORIZED',
        message: 'Bạn cần đăng nhập để tiếp tục.',
        status: 401,
      }),
      'request-2',
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      code: 'UNAUTHORIZED',
      requestId: 'request-2',
    });
  });

  it('marks successful authenticated data as private and uncacheable', async () => {
    const response = jsonNoStore({ status: 'ok' }, { requestId: 'request-3' });

    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('x-request-id')).toBe('request-3');
    expect(response.headers.get('cache-control')).toBe(
      'private, no-cache, no-store, must-revalidate, max-age=0',
    );
  });

  it('creates opaque UUID request identifiers', () => {
    expect(createRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
  });
});
