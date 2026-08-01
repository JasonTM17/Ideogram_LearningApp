# Project Roadmap

## Phase status

| Phase | Name                            | Status                                                                                                     |
| ----- | ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1     | Foundation and Delivery         | In progress; hosted CI and business sign-offs remain release dependencies                                  |
| 2     | Identity Data and Security      | In progress                                                                                                |
| 3     | Learning Domain and Content     | In progress; catalog/content path is built, but rights/editorial/audio gates remain                        |
| 4     | Web Learning Experience         | In progress; auth/read-side learner slice plus scoped activity/review writes are built                     |
| 5     | Mobile Learning Experience      | In progress; catalog/read shell and bounded tutor surface exist, offline/sync/full lessons remain          |
| 6     | AI Tutor and Personalization    | In progress; bounded authenticated turn + ledger + web/Expo UI shipped, retrieval/SSE/history/evals remain |
| 7     | Media Offline and Sync          | Pending                                                                                                    |
| 8     | Admin Quality and Observability | Pending                                                                                                    |
| 9     | Release and Launch              | Pending                                                                                                    |

## Roadmap shape

1. Finish identity, data, and security boundaries.
2. Build the learning domain and content model.
3. Deliver the first web and mobile learning experiences.
4. Add AI tutor, media, and offline sync.
5. Add admin and observability.
6. Release only after legal, product, cost, and store gates are signed.

## Current release posture

- This repo is not production-deployed.
- The launch plan remains internal beta first.
- Adult-only eligibility must remain fail-closed until the decision record is approved.
- Foundation workspace and app-shell code are present, but hosted CI and business approvals remain release dependencies.
- Identity/security work remains active, and the learning persistence layer plus protected catalog read route are implemented. The auth lifecycle and read-side learner pages now exist, activity submission (vocabulary acknowledgement and objective listening only), review submission, and the fail-closed bounded AI tutor turn route with web/Expo clients are live. Grounded tutor context, direct SSE, durable history, interactive lesson/review UI, offline sync, and broader mobile/web experiences are still pending.

## Open questions

- Final sign-off dates for product/legal and store readiness
- Whether any launch dependencies should be moved earlier than Phase 9
