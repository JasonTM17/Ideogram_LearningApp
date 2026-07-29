---
phase: 3
title: "Learning Domain and Content"
status: pending
effort: "8–10 engineer-days"
---

# Phase 3: Learning Domain and Content

## Context and outcome

Build the language-pack and learning engine contracts that make Japanese-first
content ship now without hard-coding Japanese throughout the product. The
server, not a device, remains canonical for progress and scheduling.

**Depends on:** Phases 1–2.
**Unblocks:** web/mobile learning surfaces, AI grounding, media and admin.

## File ownership

Create:

- `supabase/migrations/0003_language-content-schema.sql`
- `supabase/migrations/0004_learning-progress-and-review.sql`
- `supabase/tests/learning-rls.sql`, `supabase/tests/review-idempotency.sql`
- `packages/contracts/src/content/*`, `packages/contracts/src/learning/*`
- `packages/learning-engine/src/*`, `packages/learning-engine/test/*`
- `packages/api-client/src/learning/*`
- `content/japanese/v1/manifest.json`, `content/japanese/v1/*`
- `content/contract-fixtures/{chinese,korean}/*`
- `content/licenses/manifest.md`, `docs/content-governance.md`,
  `docs/learning-engine-contract.md`, `docs/review-and-sync-contract.md`,
  updates to `docs/api-contract.md`

All listed paths are planned creates; no production content exists today.

## Requirements and architecture

- Model `language_pack → objective → level → path → unit → lesson → activity`
  plus skill, script, CEFR/exam mapping and content version metadata.
- Freeze level families for the product contract: Japanese JLPT N5→N1,
  Chinese HSK 1→6 and Korean TOPIK 1→6 (TOPIK I/II grouping). Placement and
  mastery may map to these targets but never claim an official exam result.
- Build a small original/licensed Japanese N5 pilot corpus. Store provenance,
  author/reviewer/version/status for every publishable item; never ingest
  copyrighted tests or audio without a license record.
- Approve a content BOM before authoring: baseline target 2 units/12 lessons,
  150 review items, 40 transcripted listening activities and 25–30 placement
  items, with named author/license/pedagogy reviewers, weekly throughput and
  rights for adaptation, embedding, redistribution and AI-provider processing.
- Activities are typed (reading, listening, vocabulary, grammar, retrieval,
  objective quiz, speaking/writing task) with schema validation and
  accessibility-ready transcripts/ruby metadata.
- Review items and review events are append-only/idempotent. Scheduler input,
  output and algorithm version are recorded so a future algorithm upgrade can
  be replayed/audited.
- Canonical review order uses operation UUID, actor, item, device sequence and
  server receipt/causal sequence. Client wall-clock is advisory only; timestamp
  last-write-wins is forbidden for learning events.
- Idempotency binds user + endpoint + item + payload hash. Reusing a key with a
  different payload fails; two distinct valid events are preserved and the
  schedule rebuild is deterministic.
- Use a deliberately simple, tested scheduling policy for first release rather
  than an opaque adaptive model. Adaptive/FSRS tuning is a measured follow-up.
- Placement stores answer provenance and confidence, not an unsupported
  “official level” claim. A learner may change objective after placement.
- Every publishable set has immutable `content_release_id`; hidden ZH/KO packs
  fail closed. Thin ZH/KO fixtures prove script variants, romanization/tone,
  segmentation, exam mapping and pack-specific rubric contracts—no launch corpus.

## Implementation steps

1. Define Zod/domain contracts first; generate database constraints from the
   same vocabulary where feasible and reject invalid activity payloads at the
   server boundary.
2. Create content, enrollment, placement, attempt, proficiency, review-item
   and review-event migrations with ownership indexes and RLS policies.
3. Freeze the learning endpoint matrix and review/sync protocol before web/mobile
   implementation; name API owner, consumers, error/idempotency semantics and
   server sequence contract.
4. Implement pure scheduling functions: create/update review, grade mapping,
   timezone-safe due calculation, operation-id de-duplication and algorithm
   version. Keep provider/database I/O outside these functions.
5. Add a transactional server entry point/RPC for submitting an activity or
   review event so retries cannot double increment progress.
6. Author/import the approved Japanese pilot BOM, review it through
   the content schema, and create deterministic fixture data separate from
   production seed material.
7. Define content linting: required Vietnamese explanation, target-script
   metadata, transcript/audio reference, source/license and reviewer status.
8. Validate thin ZH/KO contract fixtures without exposing those packs.
9. Document domain diagram, scoring limits, import/publish workflow and language
   extension rules. Commit contracts → migrations → engine → pilot content.

## Verification and acceptance

- Unit/property tests cover grade boundaries, DST/timezone changes, duplicate
  operation IDs, key/payload mismatch, clock skew, concurrent two-device events,
  reversed event arrival and schedule determinism.
- Database tests cover cross-user isolation and transaction/RPC idempotency.
- Content lint validates every pilot activity; fixtures cannot be promoted by
  the publish command.
- API/review contract tests run against all declared web/native consumers and
  fail closed for unpublished JA or hidden ZH/KO releases.
- A manual test completes placement, one lesson and an SRS cycle with correct
  “next review” output from a clean local Supabase database.

## Risks, rollback and security

- **Risk:** schema becomes a generic LMS. Keep only required learning entities;
  defer arbitrary course authoring, social graph and marketplace.
- **Risk:** bad content poisons AI grounding. Require published/reviewed status
  and explicit source/license metadata before retrieval.
- **Rollback:** preserve events; revert presentation/content version or rebuild
  derived schedule rather than deleting learner history.
- **Security:** subjective answers and placement evidence are private learner
  data; retrieve them only through ownership policy and explicit retention rules.

## Completion checklist

- [ ] Japanese N5 pilot content validates with provenance.
- [ ] Content BOM, ownership, license rights and reviewer capacity are approved.
- [ ] Shared language-pack and learning contracts compile in both app targets.
- [ ] Review submission is idempotent and deterministic.
- [ ] Thin ZH/KO fixtures pass while unfinished packs remain inaccessible.
