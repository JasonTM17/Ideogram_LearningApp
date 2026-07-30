# Content Governance

## Purpose

This document describes the verified content rules for the learning platform
after the Phase 3 persistence work. The goal is simple: only publish content
that has a clear source, a named reviewer, and an explicit rights posture.

## Current content posture

| Language pack   | State                           | Notes                                                                                                              |
| --------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Japanese (`ja`) | Active pack; review-only source | This is the launch-language contract, but no authored release is learner-visible until review and media gates pass |
| Chinese (`zh`)  | Hidden                          | Seeded for future work, but must fail closed until release gates open                                              |
| Korean (`ko`)   | Hidden                          | Seeded for future work, but must fail closed until release gates open                                              |

## Verified content model

The database content tree is:

`language_pack → objective → level → path → release → unit → lesson → activity`

Key constraints already enforced in the schema:

- `language_packs` carries `availability_state` with `hidden`, `active`, and
  `retired`.
- Level families are fixed to JLPT, HSK, and TOPIK mappings; the product does
  not claim official certification.
- Content release publication requires an active language pack.
- Published releases are immutable once live.
- Every published unit has at least one published lesson, and every published
  lesson has at least one published activity.
- Activities are typed and carry Vietnamese instructions, target script, and
  learner-visible payload fields validated against the shared contract,
  including nested cardinality and UTF-16 string limits.

## Provenance and rights

Every publishable item must have provenance with:

- source kind
- source reference
- license reference
- author
- reviewer
- adaptation right
- embedding right
- redistribution right
- AI-provider processing right

The current schema rejects content publication unless provenance is reviewed.
That makes content upload a governed process instead of a free-form editor.

The committed N5 source is deliberately more restrictive than the schema: its
machine-readable rights ledger is `pending`, all four product-right flags are
`false`, and no retrieval, AI-provider processing, adaptation, or
redistribution is permitted until a real owner approval is recorded.

## Pilot BOM target

The Phase 3 plan uses a small original/licensed Japanese N5 pilot corpus as the
first real content target. The current policy target is:

- 2 units
- 12 lessons
- about 150 review items
- about 40 transcripted listening activities
- about 25–30 placement items

The repository now contains this authored baseline as a review-only source:

- 2 units and 12 lessons
- 156 vocabulary/review entries
- 40 transcripted listening scripts with stable planned media keys
- 25 learner-safe placement prompt specifications

It is not a claim of production readiness: all activities remain `draft`,
there are no recordings or media checksums, and no real reviewer approvals are
invented in source control.

## Publishing rules

1. Author or import content with provenance.
2. Generate the deterministic manifest and pass `pnpm content:lint`.
3. Review and approve the content release tree with real accountable people.
4. Record real audio plus a checksum before publishing a listening activity.
5. Add the recorded file to the checksum-verified local media registry.
6. Publish only after the pack is active, all child content is reviewed, every
   unit/lesson branch is non-empty, and learner-visible payload fields pass the
   shared bounds.
7. Keep learner-visible content immutable after publication.
8. Use hidden ZH/KO fixtures only as contract proofs until later release gates.

## What is not allowed

- Copyrighted exam content without a license record
- Silent rights assumptions
- Hidden-pack exposure through direct catalog access
- Claims of official exam certification
- Mutable published content

## Access note

Only active learner accounts can reach the learner shell that renders the catalog. Hidden or revoked learner accounts fail closed before content is shown, so content policy and session policy stay separate.

## Related docs

- [Learning engine contract](./learning-engine-contract.md)
- [Review and sync contract](./review-and-sync-contract.md)
- [System architecture](./system-architecture.md)
