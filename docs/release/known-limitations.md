# Known Limitations

## Current boundaries

- No hosted production runtime is provisioned in this repo.
- No deployed production worker proof exists for placement scoring; local
  service-role PostgREST integration now passes.
- Native background executor and storage ownership tests now cover queue-empty,
  namespace isolation, the v2 `(userId, sessionEpoch)` key, shared locking,
  legacy v1 migration, race re-checks after session lookup, missing-session
  preservation, compare-and-clear ownership, abort-retryability, and
  retry/failure mapping, but no real-device OS-scheduled BackgroundTask proof
  exists yet.
- Local authenticated Chromium proof exists for IndexedDB plus Background Sync;
  production-host and cross-browser certification remain open.
- Japanese N5 placement content is published, but the authored lesson/audio corpus remains draft or review-only.
- The AI tutor is still bounded JSON, not direct SSE.
- Durable history, grounded lesson retrieval, and offline tutor queues are not shipped.
- No reviewed recorded asset, CDN/storage delivery, browser playback proof, or
  real-device proof exists for offline media. The source now has governed
  manifest generation plus learner download/playback/remove UI and
  checksum-bound account/release caches, but the current manifest correctly
  remains unavailable; it is not a learner-visible media release.

## Release cautions

- Do not infer production readiness from source presence alone.
- Do not infer content readiness from placement content alone.
- Do not infer sync reliability from local implementation alone.
- Do not use this repo to claim customer-visible launch proof.

## Next proof needed

- Deployed production worker execution of placement scoring
- Real-device native sync validation
- Production-host and cross-browser sync validation
- Hosted runtime and secret-manager wiring
- Final content and audio review gates for learner-visible release
