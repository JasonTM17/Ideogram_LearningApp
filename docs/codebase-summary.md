# Codebase Summary

Generated from the current workspace on 2026-07-29 after a repository pack pass.

## Snapshot

The repository is a greenfield learning-platform workspace with three runnable app shells, four shared packages, baseline docs, and phase-planning artifacts. The product surface is intentionally small right now: only the web health route is implemented as an API endpoint.

## Top-level layout

| Path                     | Purpose                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `apps/web`               | Next.js App Router shell, metadata, home page, and `GET /api/v1/health` |
| `apps/mobile`            | Expo app shell and foundation metadata                                  |
| `apps/worker`            | Node worker stub that prints a readiness line                           |
| `packages/contracts`     | Shared API version, health response, and error contract shapes          |
| `packages/design-tokens` | Editorial palette, spacing, and radius tokens                           |
| `packages/config`        | Shared runtime/platform guard helpers                                   |
| `packages/testing`       | Shared testing support placeholder                                      |
| `docs`                   | Design, architecture, policy, and summary docs                          |
| `plans`                  | Product planning and research artifacts                                 |

## Current implementation details

- Web home page is a foundation placeholder that explains the workspace is still being built.
- Web metadata is set for the learning platform and locale is `vi`.
- The health endpoint returns the shared health response contract from `packages/contracts`.
- Mobile shows an internal beta foundation screen, not a consumer learning flow.
- Worker currently boots a health object and logs readiness.
- Shared tokens are editorial and currently expose paper, ink, muted, accent, sage, card radius, control radius, and spacing steps.

## What is only planned

- Placement, lesson, SRS, tutoring, progress, offline sync, and admin workflows
- Multi-step auth, content authoring, and production release flows
- Search, embeddings, and AI orchestration beyond the current contract baseline

## Evidence boundary

This summary only describes files present in the workspace and behavior that is visible in the source tree. It does not claim deployed environments, provisioned accounts, or live production traffic.
