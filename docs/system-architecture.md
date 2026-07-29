# System Architecture

## Architectural direction

The platform is designed as a modular monolith with three client runtimes and one shared API contract layer:

- Next.js web is the canonical API host under `/api/v1`
- Expo native mobile is a separate runtime
- Node worker handles async or heavy background tasks
- Supabase is the data plane for auth, Postgres, storage, and row-level security
- Shared packages carry only platform-neutral contracts, config helpers, tokens, and tests

## Current state

The implementation is still at the foundation stage. The only implemented API route today is `GET /api/v1/health`, and the web/mobile/worker apps are shells.

## Identity and privacy boundary

Identity and privacy are modeled as a database-first boundary:

- Supabase Auth proves identity
- `public.profiles`, `public.account_roles`, `public.consent_records`, and `public.data_subject_requests` hold the public lifecycle state
- `private.registration_approvals` and `private.security_events` remain private
- `app_security_definer` cannot log in and does not bypass RLS
- The worker is the only runtime intended to hold the service-role secret

The local Supabase config keeps self-service signup disabled and exposes only
the `public` schema through the API configuration. Storage remains available
through the Storage API and is protected with bucket and object policies.

## Architecture diagram

```mermaid
flowchart TB
  subgraph Clients["Clients"]
    Web["Next.js Web"]
    Mobile["Expo Mobile"]
    Admin["Future Admin UI"]
  end

  API["Canonical API\nNext.js /api/v1"]
  Auth["Supabase Auth"]
  DB[("Supabase Postgres + RLS")]
  Storage[("Supabase Storage")]
  Worker["Node worker"]
  AI["DeepSeek server-only provider"]

  Web --> API
  Mobile --> API
  Admin --> API
  API --> Auth
  API --> DB
  API --> Storage
  API --> AI
  API -. async jobs .-> Worker
  Worker --> DB
  Worker --> Storage
  Worker --> AI
```

## Boundaries

| Boundary        | Rule                                                  |
| --------------- | ----------------------------------------------------- |
| Web/mobile      | Do not share DOM or native shells                     |
| Shared packages | Share contracts, tokens, validators, and helpers only |
| API host        | Keep versioned routes under Next.js                   |
| Worker          | Use for heavy or deferred work only                   |
| Secrets         | Keep AI credentials server-only                       |

## Planned behavior

- Direct SSE is the preferred shape for live AI tutor responses.
- Heavy jobs such as transcription, embeddings, and grading belong in the worker path.
- Search is planned as a hybrid of FTS and pgvector.
- Canonical route documentation should continue to live under `docs/api-contract.md`.
- Auth and privacy contracts are documented separately in
  `docs/authentication-guide.md`, `docs/security-and-privacy-baseline.md`, and
  `docs/account-deletion-and-export-saga.md`.

## Related docs

- [Project overview and PDR](./project-overview-pdr.md)
- [Security and privacy baseline](./security-and-privacy-baseline.md)
- [Authentication guide](./authentication-guide.md)
- [Privileged operation matrix](./privileged-operation-matrix.md)
- [Data lifecycle matrix](./data-lifecycle-matrix.md)
- [Account deletion and export saga](./account-deletion-and-export-saga.md)
- [API contract](./api-contract.md)
- [Mobile support policy](./mobile-support-policy.md)
- [External dependency matrix](./external-dependency-matrix.md)
- [Execution capacity and load assumptions](./execution-capacity-and-load-assumptions.md)
- [Adult eligibility decision](./product-decisions/adult-eligibility.md)
