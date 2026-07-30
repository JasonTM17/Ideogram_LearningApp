# Project Roadmap

## Phase status

| Phase | Name                            | Status                                                                              |
| ----- | ------------------------------- | ----------------------------------------------------------------------------------- |
| 1     | Foundation and Delivery         | In progress; hosted CI and business sign-offs remain release dependencies           |
| 2     | Identity Data and Security      | In progress                                                                         |
| 3     | Learning Domain and Content     | In progress; catalog/content path is built, but rights/editorial/audio gates remain |
| 4     | Web Learning Experience         | In progress; auth/read-side learner slice is built, core learning mutations are not |
| 5     | Mobile Learning Experience      | Pending                                                                             |
| 6     | AI Tutor and Personalization    | Pending                                                                             |
| 7     | Media Offline and Sync          | Pending                                                                             |
| 8     | Admin Quality and Observability | Pending                                                                             |
| 9     | Release and Launch              | Pending                                                                             |

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
- Identity/security work remains active, and the learning persistence layer plus protected catalog read route are implemented. The auth lifecycle and read-side learner pages now exist, but remaining learning mutation routes and mobile/web experiences are still pending.

## Open questions

- Final sign-off dates for product/legal and store readiness
- Whether any launch dependencies should be moved earlier than Phase 9
