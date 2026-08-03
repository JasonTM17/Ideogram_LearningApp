# Contributing

Thanks for helping improve Ideogram Learning. The repository is Vietnamese-first,
Japanese-first for launch, and currently an internal-beta foundation.

## Before opening a change

1. Read [`README.md`](../README.md),
   [`docs/code-standards.md`](../docs/code-standards.md), and the relevant
   architecture or contract document.
2. Open an issue for a new product behavior, public contract change, schema
   migration, content release, or licensing decision.
3. Keep one focused behavior per branch and use Conventional Commits.

## Local setup

```bash
corepack enable
corepack pnpm install --frozen-lockfile
pnpm check:env
pnpm dev
```

## Required checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm content:lint
```

Add focused tests for changed behavior. Do not weaken validation, authorization,
RLS, idempotency, offline isolation, or content publication gates to make a
check pass.

## Content and media

- Submit only original or explicitly licensed material.
- Record provenance, accountable reviewers, permitted uses, and checksums.
- Do not promote review-only content or placeholder audio as published.
- Screenshots must come from the real project and describe whether they prove
  local, hosted, browser, or device behavior.

## Pull requests

- Explain the user-visible outcome and risk boundary.
- List verification commands and their actual results.
- Update docs when behavior, setup, architecture, security, or a public
  contract changes.
- Never include secrets, personal data, generated dependency folders, or local
  agent configuration.

By contributing, you agree that project-authored code and documentation you
submit may be distributed under the repository's MIT License. Content and
media remain subject to the separate rights rules in [`NOTICE.md`](../NOTICE.md).
