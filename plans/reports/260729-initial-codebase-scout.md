# Initial Codebase Scout Report

Date: 2026-07-29

## Relevant files

- `plans/reports/260729-jck-learning-ai-product-research.md` — product scope,
  learning approach and rollout recommendation.
- `plans/reports/260729-platform-architecture-research.md` — proposed
  TypeScript monorepo, Supabase-first platform and async-worker boundary.
- `plans/reports/260729-visual-design-research.md` — evidence for the visual
  direction.
- `docs/design-guidelines.md` — Vietnamese-first UX, responsive behavior and
  accessibility contract.
- `design-system/ideogram-learning/MASTER.md` — implementation tokens and
  cross-platform design boundary.
- `assets/designs/stitch/` — five mobile and five desktop Stitch reference
  screens plus exports.
- `AGENTS.md` and `CLAUDE.md` — repository workflow and safety rules.

## Verified current state

- Repository is new: one research commit (`722b66c`) and no application code.
- No `README.md`, workspace manifest, package manifest, database migration,
  environment template, CI workflow, test configuration or deployment config
  exists yet.
- There is no legacy API, schema, auth provider, app shell, or public contract
  to preserve. The first implementation phase must establish those contracts
  explicitly rather than inventing compatibility work.
- Design and research artifacts are ready as inputs; the exported Stitch HTML
  is reference only and cannot be treated as product runtime code.

## Planning implications

1. Start with monorepo/tooling, documentation and CI safety rails.
2. Define shared domain contracts before separate web and native shells.
3. Plan Supabase schema/RLS and AI trust boundaries before user-facing flows.
4. Keep Japanese content as the launch corpus while making language packs
   extensible for Chinese and Korean.

## Unresolved questions

- No codebase-derived blockers. Product decisions requiring owner confirmation
  will be recorded in the plan validation step.
