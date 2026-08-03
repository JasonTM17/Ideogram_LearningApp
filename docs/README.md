# Docs Index

Use this page as the first stop when you need the current repo shape, operational steps, or release evidence. The docs are organized by role so readers can land on the narrowest useful surface first.

## By Role

| Role                           | Read first                                                                                                                                                                                                                                                | Why                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| New contributor                | [Project overview and PDR](./project-overview-pdr.md), [Code standards](./code-standards.md), [Codebase summary](./codebase-summary.md)                                                                                                                   | Fast route to repo shape, product scope, and local rules        |
| Web or mobile engineer         | [System architecture](./system-architecture.md), [API contract](./api-contract.md), [Review and sync contract](./review-and-sync-contract.md), [Offline sync contract](./offline-sync-contract.md), [Offline media contract](./offline-media-contract.md) | Shows the implemented runtime and mutation boundaries           |
| Worker or backend engineer     | [System architecture](./system-architecture.md), [Learning engine contract](./learning-engine-contract.md), [External dependency matrix](./external-dependency-matrix.md)                                                                                 | Covers database helpers, worker scope, and release dependencies |
| Content or curriculum reviewer | [Content governance](./content-governance.md), [Project overview and PDR](./project-overview-pdr.md), [Offline media contract](./offline-media-contract.md)                                                                                               | Explains published versus draft content posture                 |
| Release or ops owner           | [Release docs](./release/README.md), [Deployment guide](./deployment-guide.md), [Operations runbooks](./operations/local-verification-runbook.md)                                                                                                         | Separates source claims from deployment evidence                |

## Quick Paths

- [Project status](./project-overview-pdr.md)
- [Architecture](./system-architecture.md)
- [API surface](./api-contract.md)
- [Authentication](./authentication-guide.md)
- [Offline sync](./offline-sync-contract.md)
- [Offline media](./offline-media-contract.md)
- [Mobile policy](./mobile-support-policy.md)
- [Deployment guide](./deployment-guide.md)
- [Release docs](./release/README.md)

## Operational Notes

- Prefer the runbooks in `./operations/` for incident-style checks.
- Prefer the release docs in `./release/` for evidence and limitation statements.
- If a doc conflicts with source, trust the source tree and update the doc.
