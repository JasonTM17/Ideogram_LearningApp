# Project Roadmap

## Phase status

| Phase | Name                            | Status                                                                                                                                                                                                                                                                          |
| ----- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Foundation and Delivery         | In progress; hosted CI and business sign-offs remain release dependencies                                                                                                                                                                                                       |
| 2     | Identity Data and Security      | In progress                                                                                                                                                                                                                                                                     |
| 3     | Learning Domain and Content     | In progress; catalog/content path is built, but rights/editorial/audio gates remain                                                                                                                                                                                             |
| 4     | Web Learning Experience         | In progress; auth/read-side learner slice plus vocabulary acknowledgement activity slice are built                                                                                                                                                                              |
| 5     | Mobile Learning Experience      | In progress; catalog/read shell, vocabulary activity + review sessions, and bounded tutor surface exist                                                                                                                                                                         |
| 6     | AI Tutor and Personalization    | In progress; bounded authenticated turn + ledger + web/Expo UI shipped, retrieval/SSE/history/evals remain                                                                                                                                                                      |
| 7     | Media Offline and Sync          | Web/Expo mutation queues, optional background wake paths, governed manifest, download/playback/remove UI, and cache isolation are implemented; local authenticated Chromium proof exists for browser Background Sync, while approved audio and real-device proof remain pending |
| 8     | Admin Quality and Observability | Pending                                                                                                                                                                                                                                                                         |
| 9     | Release and Launch              | Pending                                                                                                                                                                                                                                                                         |

## Roadmap shape

1. Finish identity, data, and security boundaries.
2. Build the learning domain and content model.
3. Deliver the first web and mobile learning experiences.
4. Add AI tutor, media, and offline sync.
5. Add admin and observability.
6. Release only after legal, product, cost, and store gates are signed.

## Current release posture

- This repo is not production-deployed.
- The launch plan remains repository preview first, as a pre-beta foundation.
- Adult-only eligibility must remain fail-closed until the decision record is approved.
- Foundation workspace and app-shell code are present, and hosted CI passed for
  the release commit. Hosted runtime certification and business approvals remain
  product-release dependencies.
- Identity/security work remains active. The learning persistence layer, protected catalog/review/media reads, web/Expo onboarding-placement flow, activity/review writes, browser/native durable mutation queues, offline-media controls, and optional placement-scoring worker path are implemented in source. Local authenticated Chromium proof exists for browser Background Sync, and pure native executor plus owned-storage tests now cover the v2 queue key, shared locking, legacy migration, race re-checks, stale-A/correct-B ownership, abort-retryability, and retry/failure mapping. Grounded tutor context, direct SSE, durable history, an approved audio release, deployed-worker proof, real-device native sync validation, cross-browser certification, and broader lesson UI remain pending.

## Open questions

- Final sign-off dates for product/legal and store readiness
- Whether any launch dependencies should be moved earlier than Phase 9
