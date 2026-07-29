# Ideogram Learning

Ideogram Learning is a Vietnamese-first language learning platform for Japanese-first launch, with planned expansion to Chinese and Korean under separate quality gates. This repository is still at the foundation stage: the web shell, mobile shell, worker stub, shared contracts, and a single health endpoint exist today; the learning product flows are not implemented yet.

## Current foundation

- Web: Next.js App Router shell in `apps/web`
- Mobile: Expo shell in `apps/mobile`
- Worker: Node worker stub in `apps/worker`
- Shared packages: `packages/contracts`, `packages/design-tokens`, `packages/config`, `packages/testing`, `packages/auth`, `packages/api-client`, `packages/learning-engine`
- Implemented API route: `GET /api/v1/health`
- Phase 3 learning persistence: Supabase migrations and private helpers now implement the learning content catalog, placement flow, activity attempts, review engine, and purge receipts. No Next.js learning route handlers exist yet.

## Visual references

![System architecture](docs/media/system-architecture.png)

![Mobile learning flow](docs/media/mobile-learning-flow.gif)

Design handoff and Stitch exports:

- [Stitch handoff](assets/designs/stitch/README.md)
- [Design guidelines](docs/design-guidelines.md)
- [System architecture doc](docs/system-architecture.md)
- [Media sources and regeneration](docs/media/README.md)

## Product status

- Current product state: internal beta foundation only
- Launch language priority: Japanese first
- Supported exam contracts: JLPT N5-N1, HSK 1-6, TOPIK 1-6, including TOPIK I/II grouping
- Active language-pack state: Japanese is active; Chinese and Korean are seeded as hidden packs until later release gates. The authored Japanese N5 corpus remains review-only until content, pedagogy, and audio gates pass.
- No claim of official exam certification
- Adult-only closed beta is fail-closed pending named product/legal sign-off
- Minors require a separate approved plan before any launch consideration

## Quick start

```bash
corepack enable
corepack pnpm install --frozen-lockfile
pnpm check:env
pnpm dev
```

## Validate and build

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Supabase local workflow

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

## Environment

- Copy `.env.example` to a local ignored env file before running secret-backed features.
- `DEEPSEEK_API_KEY` is server-only and must never be placed in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`.
- `pnpm check:env` scans framework dotenv files without printing their values and
  rejects accidental public AI-key exposure.
- The shared DeepSeek contract is documented in `.env.example` and the related architecture decisions.

## What is not implemented yet

- Next.js learning route handlers and user-facing learning screens
- AI tutor/chatbot, offline sync, progress tracking, and admin workflows
- Production deployment or cloud provisioning
- Any endpoint beyond `GET /api/v1/health`

## Docs

- [Project overview and PDR](docs/project-overview-pdr.md)
- [Code standards](docs/code-standards.md)
- [Codebase summary](docs/codebase-summary.md)
- [System architecture](docs/system-architecture.md)
- [Security and privacy baseline](docs/security-and-privacy-baseline.md)
- [Authentication guide](docs/authentication-guide.md)
- [Privileged operation matrix](docs/privileged-operation-matrix.md)
- [Data lifecycle matrix](docs/data-lifecycle-matrix.md)
- [Account deletion and export saga](docs/account-deletion-and-export-saga.md)
- [API contract](docs/api-contract.md)
- [Mobile support policy](docs/mobile-support-policy.md)
- [External dependency matrix](docs/external-dependency-matrix.md)
- [Execution capacity and load assumptions](docs/execution-capacity-and-load-assumptions.md)
- [Deployment guide](docs/deployment-guide.md)
- [Project roadmap](docs/project-roadmap.md)
- [Content governance](docs/content-governance.md)
- [Learning engine contract](docs/learning-engine-contract.md)
- [Review and sync contract](docs/review-and-sync-contract.md)
- [Foundation engineering journal](docs/journals/2026-07-29-foundation-safety-rails.md)
