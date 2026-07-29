# Project Overview and PDR

## Overview

Ideogram Learning is a Vietnamese-first AI learning platform for Japanese-first
launch, with later support planned for Chinese and Korean. The repository now
contains the foundation layer plus a tested local identity/privacy boundary:
workspace shells, shared contracts, design tokens, Supabase migrations/RLS, and
one implemented health endpoint.

## Product requirements

| Requirement         | Decision                                                        |
| ------------------- | --------------------------------------------------------------- |
| Launch language     | Japanese first                                                  |
| Contract coverage   | JLPT N5-N1, HSK 1-6, TOPIK 1-6, including TOPIK I/II            |
| Certification claim | No official exam certification claim                            |
| Adult beta          | 18+ closed beta, fail-closed until named product/legal sign-off |
| Minors              | Separate approved plan required                                 |
| AI provider         | DeepSeek, server-only                                           |
| Platform shape      | Web, native mobile, worker, shared contracts                    |

## Scope

### In scope for the foundation

- Workspace structure and shared package boundaries
- Adult-only registration approval, identity/profile/role/privacy contracts,
  private Storage policies, and local RLS tests
- Versioned API contract surface
- Documentation baseline
- Mobile support policy and dependency matrix
- Load assumptions for closed-beta planning

### Not in scope today

- Placement flow
- Lesson delivery
- SRS and review scheduling
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
- Only `GET /api/v1/health` is described as implemented today
- Product decisions are cross-linked and versioned
- No doc implies deployment or provisioning already happened

## Open questions

- Final owner for product/legal sign-off on the adult-only beta
- Exact launch authentication providers
- Cost and retention limits for AI usage beyond the planning caps
