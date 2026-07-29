import { describe, expect, it } from 'vitest';

import { API_VERSION, createHealthResponse } from './api';

describe('createHealthResponse', () => {
  it('creates a versioned health contract from the supplied clock', () => {
    const response = createHealthResponse(new Date('2026-07-29T00:00:00.000Z'));

    expect(response).toEqual({
      service: 'ideogram-learning-api',
      status: 'ok',
      timestamp: '2026-07-29T00:00:00.000Z',
      version: API_VERSION,
    });
  });
});
