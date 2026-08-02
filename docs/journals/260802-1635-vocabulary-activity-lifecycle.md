---
date: 2026-08-02
session: vocabulary-activity-lifecycle-hardening
---

# Journal: 2026-08-02 — Vocabulary Activity Lifecycle Hardening

## Context

The first web and Expo interactive lesson slice needed a release-quality pass
before committing and publishing the new package image. The scope was one
truthful Japanese vocabulary acknowledgement activity, not the full review,
listening, offline, or multilingual curriculum roadmap.

## What Happened

- The initial review found two real gaps: UI lifecycle behavior had only static
  coverage, and UUID capability failure occurred after device-sequence
  reservation, producing an ineffective retry classification.
- A shared `ActivityAttemptLifecycle` now owns duplicate locking, immutable
  retry input retention, stop/unmount receipt suppression, and terminal cleanup.
- Web and native generate and validate the idempotency UUID before reserving a
  sequence. Capability and malformed-UUID failures become terminal
  `IDENTITY_ERROR` feedback.
- Full tests, typecheck, lint, builds, docs validation, content/env checks,
  import boundaries, secret scans, and production dependency audit passed.

## Reflection

The first implementation looked complete because the happy path and server
contract were sound, but the missing lifecycle tests hid the most failure-prone
client behavior. The review was useful precisely because it challenged the
polished surface: a platform capability error could have burned operation
sequence space without ever reaching the server. The shared lifecycle is a
small, explicit boundary and is easier to reason about than two subtly
different web/mobile state machines. The work still stops at one activity type;
calling the whole learning product finished now would be dishonest.

## Decisions Made

| Decision                                                   | Rationale                                                                            | Impact                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Keep lifecycle logic in `@ideogram/api-client`             | Web and Expo must share the same retry/abort invariants                              | One implementation and one focused transition test suite                                    |
| Generate idempotency UUID before reserving device sequence | A missing UUID capability must not consume a sequence or appear as a network failure | Terminal identity feedback; possible sequence gaps remain only for interrupted storage work |
| Keep retry retention in memory                             | This slice must not imply an offline queue or durable replay guarantee               | Restarted sessions require a fresh user action; future offline work remains explicit        |
| Treat Stitch exports as reference handoffs                 | Production surfaces use existing tokens/components and avoid generated markup drift  | Design evidence remains reviewable without claiming pixel parity                            |

## Next Steps

- Continue the roadmap with review-session interactions, listening/audio
  evaluation, spaced repetition UI, and approved Chinese/Korean content.
- Add real browser/device E2E and coverage thresholds when a non-production
  Supabase test environment is available.

## Delivery Completion

The focused lifecycle and validation commits were pushed to `main`. CI run
`30743516006` and container publish run `30743515987` both succeeded for
`242688346b18b97f8fe4bd18e43972d76e05853e`; the public `sha-2426883` image
tag resolves to an AMD64 OCI image plus provenance.

## Unresolved Questions

- Which content and pedagogy approvals will unlock Japanese pilot publication,
  then Chinese and Korean release activation?
- What product policy should govern a future durable offline mutation queue?
