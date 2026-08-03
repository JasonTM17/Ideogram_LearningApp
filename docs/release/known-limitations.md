# Known Limitations

## Current boundaries

- No hosted production runtime is provisioned in this repo.
- No deployed worker proof exists for placement scoring.
- No real-device proof exists for native background sync.
- No browser proof exists for the IndexedDB plus Background Sync path.
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

- Deployed worker execution of placement scoring
- Real-device native sync validation
- Browser sync validation in a real browser session
- Hosted runtime and secret-manager wiring
- Final content and audio review gates for learner-visible release
