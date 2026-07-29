---
title: "JCK AI Learning Platform"
description: "Nền tảng web/mobile Vietnamese-first học Nhật–Trung–Hàn, launch Japanese-first với AI tutor đáng tin cậy."
status: pending
priority: P1
effort: "16–23 engineer-weeks + content/pedagogy/legal/store lead time"
branch: "main"
tags: [feature, frontend, backend, database, api, auth, infra, mobile]
blockedBy: []
blocks: []
created: "2026-07-29"
createdBy: "ck:plan"
source: skill
---

# JCK AI Learning Platform

## Plan Context

- Mode: `hard`; scope: `expansion` có guardrail MVP.
- Validation: `mode=prompt, questions=3-5`; provider confirmed in [DeepSeek decision](./reports/deepseek-provider-decision.md).
- Evidence: [product](../reports/260729-jck-learning-ai-product-research.md), [architecture](../reports/260729-platform-architecture-research.md), [scout](../reports/260729-initial-codebase-scout.md), [design](../../docs/design-guidelines.md).

## Overview

Ship modular monolith TypeScript cho adult-only beta: Next.js web, Expo native mobile, Supabase
Auth/Postgres/Storage/RLS và worker nhỏ cho job nặng. Japanese là launch corpus;
schema, AI configuration và content pipeline mở được Chinese/Korean sau quality
gate riêng.

- **In scope:** auth + placement, lesson/retrieval/SRS, audio, AI tutor tiếng Việt, progress, offline-safe review, CMS-lite, accessibility, observability và CI/CD.
- **Not launch scope:** community, marketplace, user-generated courses, full ZH/KO corpus, lời hứa điểm thi, microservice fleet.

## Architecture and execution

- Web/mobile/admin gọi versioned API tại Next.js host; Supabase là data/auth/storage plane; worker-only privilege xử lý outbox jobs.
- Share contracts, validation, learning rules, tokens, i18n và analytics—not DOM/native shells; Stitch HTML chỉ là reference.
- Phases 1→3 chốt contract. Phases 4/5 chỉ parallel sau Phase 3. Phase 6 hoàn tất sau 4/5; Phase 7 sau 6; Phases 8→9 tích hợp/release.
- Mỗi slice có focused conventional commit sau narrow checks; không commit secret, local DB, transcript hay binary build.
## Acceptance gates

1. Mọi learner/content/audio row và Storage object có RLS/role test.
2. Scheduling idempotent; offline retry không double-credit.
3. AI structured, grounded, versioned, rate-limited và qua Vietnamese golden set.
4. Web/mobile qua type/lint/unit/E2E/accessibility/device checks.
5. Staging, rollback migration, export/delete data và monitoring được rehearsal.

## Validation decisions required

- Confirm adult-only (18+) launch, jurisdiction and legal/product owner.
- Email OTP only hay Google/Apple ở launch.
- DeepSeek budget/DPA/retention, rotated-key owner và production secret store.
- Human-review threshold cho speaking/writing score.
- Hosting/store budget và credential owner.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Foundation and Delivery](./phase-01-foundation-and-delivery.md) | Pending |
| 2 | [Identity Data and Security](./phase-02-identity-data-and-security.md) | Pending |
| 3 | [Learning Domain and Content](./phase-03-learning-domain-and-content.md) | Pending |
| 4 | [Web Learning Experience](./phase-04-web-learning-experience.md) | Pending |
| 5 | [Mobile Learning Experience](./phase-05-mobile-learning-experience.md) | Pending |
| 6 | [AI Tutor and Personalization](./phase-06-ai-tutor-and-personalization.md) | Pending |
| 7 | [Media Offline and Sync](./phase-07-media-offline-and-sync.md) | Pending |
| 8 | [Admin Quality and Observability](./phase-08-admin-quality-and-observability.md) | Pending |
| 9 | [Release and Launch](./phase-09-release-and-launch.md) | Pending |

## Validation Log

- Dependencies: none; repo is greenfield.
- Session 1 (2026-07-29): 4-lens red-team, static verification and consistency sweep passed; 14 findings accepted, 1 rejected.
- User confirmed DeepSeek V4 Flash; remaining answers: age/legal, auth providers, DPA/retention/budget, human review and hosting/store ownership.
- `/ck:cook` waits for plan approval; deploy, purchase, real secrets and store publication require separate authority.

## Red Team Review

2026-07-29: 14 accepted, 1 rejected; see [adjudication and consistency sweep](./reports/red-team-review.md).
