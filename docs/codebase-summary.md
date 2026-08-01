# Codebase Summary

Generated from the current workspace on 2026-07-30 after a repository pack pass.

## Snapshot

The repository is a greenfield learning-platform workspace with three runnable
app shells, seven shared packages, local Supabase migrations/RLS tests,
baseline docs, and phase-planning artifacts. The product surface now includes a
public landing page, invite-only auth, protected learner shell pages, a health
route, and a protected learner-catalog surface. The learning product still also
exists as database contracts and private helpers.

## Top-level layout

| Path                       | Purpose                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web`                 | Next.js App Router shell, public landing, sign-in/callback pages, protected learner pages, `GET /api/v1/health`, catalog/auth routes |
| `apps/mobile`              | Expo app shell and foundation metadata                                                                                               |
| `apps/worker`              | Node worker stub that prints a readiness line                                                                                        |
| `packages/contracts`       | Shared API version, health response, auth flow, and error contract shapes                                                            |
| `packages/design-tokens`   | Editorial palette, spacing, and radius tokens                                                                                        |
| `packages/config`          | Shared runtime/platform guard helpers                                                                                                |
| `packages/testing`         | Shared testing support placeholder                                                                                                   |
| `packages/auth`            | PKCE, callback, verified-nonce exchange, and session lifecycle helper contracts                                                      |
| `packages/api-client`      | Auth/privacy request builders plus the implemented learner-catalog descriptor and response parser                                    |
| `packages/learning-engine` | Deterministic review scheduler, idempotency, and event ordering helpers                                                              |
| `supabase`                 | Local Auth configuration, identity/privacy migrations, RLS, and pgTAP                                                                |
| `docs`                     | Design, architecture, policy, and summary docs                                                                                       |
| `plans`                    | Product planning and research artifacts                                                                                              |

## Current implementation details

- Web home page is a foundation landing page with feature and trust sections, not a blank placeholder.
- Web auth is invite-only email OTP plus Supabase SSR PKCE callback handling and cookie-only local sign-out.
- The protected learner pages `/today`, `/learn`, and `/lessons/[lessonId]` call the SSR learner-page gate and read the catalog directly from the server.
- The health endpoint returns the shared health response contract from `packages/contracts`.
- The protected catalog route authenticates a Supabase bearer token or SSR cookie session, reads the allowlisted aggregate catalog RPC, and returns the shared learner-catalog response contract.
- Mobile is still an internal beta, not a released learning flow. It now has
  SecureStore + installation-bound storage, PKCE shadow registry, native
  sign-in/callback screens, state/nonce verification, session hydration route
  guards, refresh control, and session-epoch primitives. Claimed HTTPS links,
  real-device auth validation, and account-switch request cancellation remain
  pending.
- Worker currently boots a health object and logs readiness.
- Shared tokens are editorial and currently expose paper, ink, muted, accent, sage, card radius, control radius, and spacing steps.
- Self-service Supabase signup is disabled. Approved registrations, profile and
  role state, consent history, data-subject requests, private Storage policies,
  and RLS are implemented and tested locally.
- Phase 3 adds active Japanese content catalogs, hidden Chinese/Korean packs,
  placement sessions, activity attempts, review items, review events, learner
  progress, and purge receipts in Supabase migrations plus pgTAP coverage.
- The catalog output is intentionally answer-free at the application boundary,
  and raw learner-catalog source tables are not directly readable by
  authenticated callers.
- Catalog publication rejects empty branches and malformed projected payloads;
  the RPC and HTTP assembler independently enforce the 512 KiB final response
  budget.
- `app_learning_api_executor` is the trusted learning executor boundary. It is
  used by the private database helpers for learner-safe placement, activity,
  and review writes. `service_role` is reserved for placement scoring and
  learning-data purge work, and the current worker runtime is readiness-only.
- Shared auth contracts guard PKCE entropy/digests, atomic state-plus-redirect
  consumption, nonce verification after adapter-level ID-token verification,
  and local sign-out cleanup. The wired web flow currently uses Supabase SSR
  rather than the generic `packages/auth` implementation path.

## What is only planned

- Remaining learning mutation route handlers and full interactive learner flows
- AI tutor, offline sync, admin workflows, and production content/audio release flows
- Claimed HTTPS link association, real-device native auth validation,
  in-flight cancellation on account switch, and an authoritative session
  revocation adapter
- Search, embeddings, and AI orchestration beyond the current contract baseline

## Evidence boundary

This summary only describes files present in the workspace and behavior that is visible in the source tree. It does not claim deployed environments, provisioned accounts, or live production traffic.
