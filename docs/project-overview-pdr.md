# Project Overview and PDR

## Overview

Ideogram Learning is a Vietnamese-first AI learning platform for Japanese-first
launch, with later support planned for Chinese and Korean. The repository now
contains the foundation layer plus a tested local identity/privacy boundary:
workspace shells, shared contracts, design tokens, Supabase migrations/RLS,
the public landing page, invite-only auth, and the learner catalog read path.

## Product requirements

| Requirement         | Decision                                                          |
| ------------------- | ----------------------------------------------------------------- |
| Launch language     | Japanese first                                                    |
| Contract coverage   | JLPT N5-N1, HSK 1-6, TOPIK 1-6, including TOPIK I/II              |
| Certification claim | No official exam certification claim                              |
| Adult beta          | 18+ closed beta, fail-closed until named product/legal sign-off   |
| Minors              | Separate approved plan required                                   |
| AI provider         | DeepSeek, server-only                                             |
| Platform shape      | Web, native mobile, worker, shared contracts                      |
| Web auth flow       | Invite-only email OTP, Supabase SSR PKCE callback, local sign-out |

## Scope

### In scope for the foundation

- Workspace structure and shared package boundaries
- Public landing, invite-only auth, protected learner shell, and catalog read route
- Adult-only registration approval, identity/profile/role/privacy contracts,
  private Storage policies, and local RLS tests
- Versioned API contract surface
- Authenticated learner catalog projection with bounded response budgets
- Documentation baseline
- Mobile support policy and dependency matrix
- Load assumptions for closed-beta planning

### Not in scope today

- Onboarding and placement UI
- Interactive lesson delivery, activity submission, and review mutations
- SRS queue UI and progress write flows
- AI tutor UX and live streaming
- Offline sync
- Payments, community, marketplace, and public launch infrastructure

## Non-functional requirements

- Fail closed on missing AI credentials
- Keep server-only secrets out of web and mobile public env variables
- Preserve a canonical API host under Next.js
- Keep mobile and web shells platform-native
- Treat docs as evidence-based, not aspirational

## Acceptance criteria

- README links resolve and match the current repo layout
- Docs distinguish implemented behavior from planned behavior
- `GET /api/v1/health`, `GET /api/v1/learning/catalog`, `POST /api/v1/auth/email-otp`,
  `GET /auth/callback`, and `POST /api/v1/auth/sign-out` are the only routes
  described as implemented today
- Product decisions are cross-linked and versioned
- No doc implies deployment or provisioning already happened

## Open questions

- Final owner for product/legal sign-off on the adult-only beta
- Exact launch authentication providers
- Cost and retention limits for AI usage beyond the planning caps
