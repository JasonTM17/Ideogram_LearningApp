import { describe, expect, it, vi } from 'vitest';

import { createGetOfflineMediaManifestRoute } from './route-handler';

const authenticated = {
  client: {} as never,
  responseHeaders: new Headers(),
  source: 'cookie' as const,
  user: { id: '12000000-0000-4000-8000-000000000001' } as never,
};

describe('GET offline media manifest', () => {
  it('returns the fail-closed governed manifest to an authenticated learner', async () => {
    const route = createGetOfflineMediaManifestRoute({
      authenticate: vi.fn(async () => authenticated),
      readManifest: () => ({
        availability: 'unavailable',
        releases: [
          {
            assets: [],
            contentReleaseId: 'ja-n5-vietnamese-first-pilot',
            version: 'v1.0.0',
          },
        ],
      }),
    });

    const response = await route(
      new Request('https://app.example.test/api/v1/learning/offline-media'),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ availability: 'unavailable' });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
