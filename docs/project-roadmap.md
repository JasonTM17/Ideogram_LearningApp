# Project Roadmap

## Phase status

| Phase | Name                            | Status                                                                 |
| ----- | ------------------------------- | ---------------------------------------------------------------------- |
| 1     | Foundation and Delivery         | Complete; hosted CI/sign-offs remain release dependencies              |
| 2     | Identity Data and Security      | In progress                                                            |
| 3     | Learning Domain and Content     | In progress; persistence contracts and private helpers are implemented |
| 4     | Web Learning Experience         | Pending                                                                |
| 5     | Mobile Learning Experience      | Pending                                                                |
| 6     | AI Tutor and Personalization    | Pending                                                                |
| 7     | Media Offline and Sync          | Pending                                                                |
| 8     | Admin Quality and Observability | Pending                                                                |
| 9     | Release and Launch              | Pending                                                                |

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
- Foundation workspace/delivery and app-shell commits are complete. Clean
  GitHub-hosted CI and named business approvals remain release dependencies.
- Identity/security work remains active, but the learning persistence layer is
  now implemented in Supabase migrations and private helpers. User-facing
  learning routes and mobile/web experiences are still pending.

## Open questions

- Final sign-off dates for product/legal and store readiness
- Whether any launch dependencies should be moved earlier than Phase 9
