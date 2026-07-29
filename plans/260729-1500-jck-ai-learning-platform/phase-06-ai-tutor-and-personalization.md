---
phase: 6
title: "AI Tutor and Personalization"
status: pending
effort: "12–18 engineer-days plus pedagogical review"
---

# Phase 6: AI Tutor and Personalization

## Context and outcome

Build a grounded AI tutor configured for Vietnamese learners: explain errors,
generate bounded practice, summarize learning needs and personalize the next
step without presenting model output as curriculum truth.

**Depends on:** backend contracts from Phases 1–3; completion depends on the
web/mobile consumer contracts from Phases 4–5.
**Unblocks:** speaking/writing assist, quality evaluation and production AI.

## File ownership

Create/modify:

- `packages/ai/src/{gateway,prompts,retrieval,safety,usage}/*`
- `packages/jobs/src/{envelope,outbox,lease,retry}/*`
- `packages/ai-evals/{datasets,rubrics,runners,reports}/*`
- `packages/contracts/src/ai/*`, `packages/api-client/src/ai/*`
- `apps/web/app/api/v1/ai/{chat,feedback,settings}/*`
- `apps/web/src/features/ai/*`, `apps/mobile/src/features/ai/*`
- `apps/worker/src/jobs/{embedding,grading,conversation-summary}/*`
- `supabase/migrations/0005_ai-config-memory-and-jobs.sql`
- `supabase/tests/ai-rls-and-rate-limits.sql`
- `docs/ai-system-and-safety.md`, `docs/ai-evaluation-guide.md`

No other web/mobile feature files are edited without coordination.

## Requirements and architecture

- A narrow provider gateway normalizes streaming text, structured output,
  usage/cost and errors. Provider/model is server configuration, never a client
  secret or arbitrary learner input.
- Primary provider is DeepSeek OpenAI-compatible Chat Completions at
  `https://api.deepseek.com`, model `deepseek-v4-flash`. Common tutor turns use
  non-thinking mode; bounded complex grading may enable thinking/high effort.
  A fallback provider/model requires separate evaluation and owner approval.
- Provider integration is disabled until an AI launch contract records region,
  DPA/no-training terms, vendor retention, task/model routing, fallback, token/
  audio limits, cost per active learner/day, monthly hard cap and kill thresholds.
- Stream chat synchronously through a Next.js Route Handler using authenticated
  SSE/stream response per ADR-006. Queue only embeddings, heavy grading and
  conversation summaries; Phase 7 owns transcription/media. Never queue live chat.
- Each chat call has a client `turn_id` bound to user, conversation and payload
  hash plus a durable `pending → streaming → completed/cancelled/failed` record
  before provider invocation. Retry resumes/returns the same turn or rejects a
  mismatched payload; provider abort/deadline and cost ledger are mandatory.
- Version `ai_configuration_profiles` by target pack, level, objective,
  Vietnamese explanation depth, tone, common VN error map, safety rules and
  model capabilities. Learner preferences may narrow this profile, not weaken
  safety or grounding.
- Retrieval uses published, reviewed content plus official/licensed reference
  metadata from an immutable content/retrieval generation. Server assembles
  context only for the authenticated user and treats learner/retrieved text as
  untrusted data, never as system instructions.
- Model output cannot authorize a side effect. Save-to-review, settings, delete
  and future tools are allowlisted and independently authenticated/validated by
  server code; no arbitrary tool/SQL/URL execution exists.
- Validate all provider output against schemas. Unknown/low-confidence answers
  say so and point back to curriculum; retries are bounded.
- Persist prompt/rubric/model/config version and minimal usage metadata. Default
  memory is a short learner-controlled summary; raw chat/audio retention is
  explicit, bounded and deletable.
- Account/conversation tombstones block new turns and job writes; cancellation
  purges provider artifacts, memory/embeddings/results per the Phase 2 lifecycle
  matrix before deletion is acknowledged.
- All async work uses a transactional outbox and versioned job envelope with
  tenant/actor, payload hash, attempts, lease token/expiry, heartbeat, next run,
  result/error and dead-letter state. Worker reauthorizes actor/content version
  at claim; service-role is worker-only.

## Implementation steps

1. Revoke the exposed key, issue a rotated key and approve DeepSeek budget/DPA/
   retention. Load `DEEPSEEK_API_KEY` only from ignored local env or deployment
   secrets; validate the published non-secret base/model/mode variables.
2. Implement provider-neutral types, timeout/cancel/retry policy, structured
   errors, token/cost counters and server-only configuration validation.
3. Implement versioned Vietnamese tutoring prompts and language-pack error maps.
   Add structured response sections: assessment, explanation, example,
   frequent VN mistake, next exercise and source boundary.
4. Build retrieval filters for actor, published release, language/level/objective
   and active generation; add hybrid FTS/vector only after lexical benchmark.
5. Build authenticated stream route with durable turn state, per-user atomic
   rate limit, input limit, cancellation, provider deadline, safety and telemetry.
6. Authorize every UI side effect outside model output. Build AI settings/chat
   on web/native with history, retry/cancel,
   source/context display, save-to-review and delete controls.
7. Add transactional outbox, lease/heartbeat/expiry, provider idempotency,
   poison isolation, drain/replay and operator retry. Phase 6 owns all grading,
   including speaking/writing; Phase 7 submits through this frozen job contract.
8. Create a held-out, stratified 200-item minimum golden set by level/skill/error
   type. Record metric formulas, per-slice thresholds/confidence, qualified dual
   raters, adjudication, sampling SLA and agreement target; gate chat and
   subjective scoring independently.
9. Kill-test worker at commit/enqueue/claim/provider/result boundaries and
   stream at DB/provider/disconnect boundaries.
10. Commit gateway/contracts → prompt/retrieval → stream/UI → jobs/evals.

## Verification and acceptance

- Provider adapter contract tests use recorded synthetic fixtures, not live
  secrets; integration tests run only in protected CI/staging.
- Streaming E2E covers cancellation, timeout, provider 429/5xx, invalid schema,
  missing source, user rate limit, disconnect after provider effect, retry/resume
  and `turn_id` payload mismatch.
- RLS tests prove one learner cannot read another AI settings/memory/job.
- Golden-set report records accuracy/hallucination, rubric agreement, p95
  latency and cost. Release thresholds are approved before production.
- Prompt injection cannot override system safety or access unpublished/foreign
  learner content; indirect injection and valid-looking tool output cannot cause
  an unauthorized side effect.
- Worker tests prove no lost outbox job, expired lease recovery, duplicate
  provider effect, revoked actor execution or non-idempotent drain/replay.
- Deletion during an in-flight stream/job cannot recreate memory, embeddings or
  provider-derived data after completion.

## Risks, rollback and security

- **Risk:** confident but wrong grammar feedback. Gate retrieval, display
  uncertainty, version prompts and sample-review outputs.
- **Risk:** runaway cost/abuse. Apply atomic limits, bounded context, model
  routing, quotas, alerts and kill switch.
- **Rollback:** feature flag by task/language/model; retain previous prompt and
  configuration versions for immediate rollback.
- **Security/privacy:** redact PII/secrets before provider calls/logs, document
  subprocessors, fail closed when AI launch contract is absent, and never use
  learner data for training without explicit opt-in.

## Completion checklist

- [ ] Vietnamese tutor profiles and learner-safe overrides are versioned.
- [ ] Live chat streams directly and async jobs are idempotent.
- [ ] Turn state, context isolation and side-effect authorization tests pass.
- [ ] Golden-set, injection and cost/latency gates pass.
- [ ] Raw history retention/delete/export behavior is implemented and visible.
