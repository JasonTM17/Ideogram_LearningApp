# Codebase Summary

Generated from the current workspace on 2026-07-29 after a repository pack pass
and the Phase 3 learning persistence implementation.

## Snapshot

The repository is a greenfield learning-platform workspace with three runnable
app shells, seven shared packages, local Supabase migrations/RLS tests,
baseline docs, and phase-planning artifacts. The product surface is still
small: only the web health route is implemented as an HTTP endpoint, while the
learning product now exists as database contracts and private helpers.

## Top-level layout

| Path                       | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `apps/web`                 | Next.js App Router shell, metadata, home page, and `GET /api/v1/health` |
| `apps/mobile`              | Expo app shell and foundation metadata                                  |
| `apps/worker`              | Node worker stub that prints a readiness line                           |
| `packages/contracts`       | Shared API version, health response, and error contract shapes          |
| `packages/design-tokens`   | Editorial palette, spacing, and radius tokens                           |
| `packages/config`          | Shared runtime/platform guard helpers                                   |
| `packages/testing`         | Shared testing support placeholder                                      |
| `packages/auth`            | PKCE, callback, verified-nonce exchange, and session lifecycle helpers  |
| `packages/api-client`      | Planned auth/privacy request builders                                   |
| `packages/learning-engine` | Deterministic review scheduler, idempotency, and event ordering helpers |
| `supabase`                 | Local Auth configuration, identity/privacy migrations, RLS, and pgTAP   |
| `docs`                     | Design, architecture, policy, and summary docs                          |
| `plans`                    | Product planning and research artifacts                                 |

## Current implementation details

- Web home page is a foundation placeholder that explains the workspace is still being built.
- Web metadata is set for the learning platform and locale is `vi`.
- The health endpoint returns the shared health response contract from `packages/contracts`.
- Mobile shows an internal beta foundation screen, not a consumer learning flow.
- Worker currently boots a health object and logs readiness.
- Shared tokens are editorial and currently expose paper, ink, muted, accent, sage, card radius, control radius, and spacing steps.
- Self-service Supabase signup is disabled. Approved registrations, profile and
  role state, consent history, data-subject requests, private Storage policies,
  and RLS are implemented and tested locally.
- Phase 3 now adds active Japanese content catalogs, hidden Chinese/Korean packs,
  placement sessions, activity attempts, review items, review events, learner
  progress, and purge receipts in Supabase migrations plus pgTAP coverage.
- `app_learning_api_executor` is the trusted learning executor boundary. It is
  used by the private database helpers for learner-safe placement, activity,
  and review writes. `service_role` is reserved for placement scoring and
  learning-data purge work.
- Shared auth contracts guard PKCE entropy/digests, atomic state-plus-redirect
  consumption, nonce verification after adapter-level ID-token verification,
  and local sign-out cleanup.

## What is only planned

- Next.js learning route handlers and user-facing learning screens
- AI tutor, offline sync, admin workflows, and production content/audio release flows
- Secure native credential storage and an authoritative session revocation adapter
- Search, embeddings, and AI orchestration beyond the current contract baseline

## Evidence boundary

This summary only describes files present in the workspace and behavior that is visible in the source tree. It does not claim deployed environments, provisioned accounts, or live production traffic.
