import { describe, expect, it } from 'vitest';

import { resolveOfflineMediaManifest } from './offline-media-manifest';

import release from '../../../../../content/japanese/v1/manifest.json';

describe('offline media manifest governance', () => {
  it('remains unavailable while release rights are pending', () => {
    expect(
      resolveOfflineMediaManifest({
        manifest: { availability: 'unavailable', releases: [] },
        release,
        rights: {
          approvalStatus: 'pending',
          contentReleaseId: release.contentReleaseId,
          rights: {},
        },
      }),
    ).toMatchObject({ availability: 'unavailable', releases: [{ assets: [] }] });
  });
});
