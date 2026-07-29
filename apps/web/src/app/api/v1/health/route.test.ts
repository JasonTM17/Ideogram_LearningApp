import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/v1/health', () => {
  it('returns the shared versioned health contract', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      service: 'ideogram-learning-api',
      status: 'ok',
      version: 'v1',
    });
  });
});
